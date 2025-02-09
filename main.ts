import { z } from "npm:zod";
import ky, { KyResponse } from "npm:ky";
import { fileTypeFromBuffer } from "npm:file-type";
import { Context, Env, Hono } from "npm:hono";
import { zValidator } from "npm:@hono/zod-validator";
import { Keys } from "./secrets.ts";
import { Crypto, fJSON, Imager, Data, Api } from "./libs.ts";
import { Base64Url, Guards, Utils, Base62 } from "./utils.ts";
import {
  API_URL,
  BASE_URL,
  JSON_SCHEMA,
  HTTP_STATUS,
  MAX_UPLOAD_SIZE,
  MAX_SEGMENT_SIZE,
} from "./constants.ts";
import { Schema, ErrorType } from "./types.ts";

const app = new Hono();
const api = new Api(app);

app.post("/scramble", async (c: Context) => {
  const body = await c.req.parseBody();
  const file = body["file"] as File;
  if (typeof file !== "object")
    return c.json({ error: "Invalid file" }, HTTP_STATUS.BAD_REQUEST);
  const contentType = file.type;
  const isImage: boolean = contentType.startsWith("image/");
  if (!isImage)
    return c.json({ error: "Invalid file type" }, HTTP_STATUS.BAD_REQUEST);
  if (!Utils.isValidImageType(contentType))
    return c.json({ error: "Invalid image type" }, HTTP_STATUS.BAD_REQUEST);
  return await Imager.scramble(
    await file.arrayBuffer(),
    contentType,
    Keys.IMG_SECRET
  )
    .then((i: Uint8Array) => {
      c.header("Content-Length", `${i.length}`);
      c.header("Content-Type", contentType);
      return c.body(i);
    })
    .catch((_e: unknown) =>
      c.json(
        { error: "Failed to generate image" },
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    );
});

app.post(
  "/generate",
  zValidator("json", JSON_SCHEMA, (value, c: Context<Env, string>) => {
    const data: z.infer<typeof JSON_SCHEMA> | null = value.data;
    if (!data)
      return c.json({ error: "JSON is missing" }, HTTP_STATUS.BAD_REQUEST);
    if (!JSON_SCHEMA.safeParse(data).success)
      return c.json({ error: "Invalid JSON" }, HTTP_STATUS.BAD_REQUEST);
    if (data.expiredAt) {
      if (isNaN(Number(data.expiredAt)))
        return c.json(
          { error: "Invalid expiredAt format" },
          HTTP_STATUS.BAD_REQUEST
        );
    }
    return data;
  }),
  (c: Context<Env, string, Schema<typeof JSON_SCHEMA>>) => {
    const json = c.req.valid("json");
    const data = fJSON.crush(
      fJSON.stringify(fJSON.genSchema(JSON_SCHEMA), json)
    );
    const digit: string = Crypto.genDigit(data, Keys.DIGIT_KEY);
    const encrypted: string = Base64Url.encode(
      Crypto.encrypt(data, Keys.CRYPTO_KEY)
    );
    return c.json({ digit, encrypted });
  }
);

app.post("/upload", async (c: Context) => {
  const webhooks = [
    Keys.DISCORD_WEBHOOK_URL_1,
    Keys.DISCORD_WEBHOOK_URL_2,
    Keys.DISCORD_WEBHOOK_URL_3,
  ];
  const body = await c.req.parseBody();
  const file = body["file"] as File;
  if (typeof file !== "object")
    return c.json({ error: "Invalid file" }, HTTP_STATUS.BAD_REQUEST);
  const buffer = await file.arrayBuffer();
  const contentType = (await fileTypeFromBuffer(buffer))?.mime ?? file.type;
  const data = Utils.isValidImageType(contentType)
    ? await api.scramble(buffer, contentType, file.name)
    : buffer;
  const contentSize = data.byteLength;
  if (contentSize < MAX_UPLOAD_SIZE) {
    const formData = new FormData();
    formData.append("file", new Blob([data], { type: contentType }), file.name);
    const options = {
      body: formData,
      headers: {},
    };
    try {
      const response = await ky
        .post(webhooks[Math.floor(Math.random() * webhooks.length)], options)
        .json();
      const url = new URL(
        (response as { attachments: [{ url: string }] }).attachments[0].url
      );
      const json = {
        channelId: Base62.encode(BigInt(url.pathname.split("/")[2])),
        messageId: Base62.encode(BigInt(url.pathname.split("/")[3])),
        contentName: url.pathname.split("/")[4],
        originalFileName: file.name,
      };
      const res = await api.generate(JSON_SCHEMA, json);
      return c.json(res);
    } catch (e) {
      console.error(e);
      return c.json(
        { error: "Failed to upload file" },
        HTTP_STATUS.BAD_REQUEST
      );
    }
  } else {
    const json: z.infer<typeof JSON_SCHEMA> = {
      originalFileName: file.name,
      contentType: contentType,
      segments: [],
    };
    const stream = file.stream();
    const reader = stream.getReader();
    let index = 0;
    let uploadedSize = 0;
    const segmentBuffer = new Uint8Array(MAX_SEGMENT_SIZE);
    while (uploadedSize < contentSize) {
      const { value, done } = await reader.read();
      if (done) break;
      let offset = 0;
      while (offset < value!.byteLength) {
        const chunkSize = Math.min(
          MAX_SEGMENT_SIZE - index,
          value!.byteLength - offset
        );
        // Copy data into the segment buffer
        segmentBuffer.set(value!.subarray(offset, offset + chunkSize), index);
        index += chunkSize;
        offset += chunkSize;
        // If segment is full, upload it
        if (index === MAX_SEGMENT_SIZE) {
          try {
            await Data.uploadSegment(
              segmentBuffer,
              json,
              json.segments!.length,
              webhooks[Math.floor(Math.random() * webhooks.length)]
            );
          } catch (_e) {
            return c.json(
              { error: "Failed to upload segment" },
              HTTP_STATUS.BAD_REQUEST
            );
          }
          index = 0;
        }
      }
      uploadedSize += value!.byteLength;
    }
    // Upload any remaining data
    if (index > 0) {
      try {
        await Data.uploadSegment(
          segmentBuffer.subarray(0, index),
          json,
          json.segments!.length,
          webhooks[Math.floor(Math.random() * webhooks.length)]
        );
      } catch (_e) {
        return c.json(
          { error: "Failed to upload segment" },
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }
    json.segments!.sort((a, b) => a.segmentIndex - b.segmentIndex);
    const res = await api.generate(JSON_SCHEMA, json);
    return c.json(res);
  }
});

app.get("/:digit/:encrypted", async (c: Context): Promise<Response> => {
  const refreshApi: URL = API_URL;
  const contentUrl: URL = BASE_URL;
  const digit: string = c.req.param("digit");
  const encrypted: string = c.req.param("encrypted");
  try {
    const data: string = Crypto.decrypt(
      Base64Url.decode(encrypted),
      Keys.CRYPTO_KEY
    );
    if (Crypto.genDigit(data, Keys.DIGIT_KEY) !== digit)
      return c.json({ error: "Invalid digit" }, HTTP_STATUS.BAD_REQUEST);
    const json = fJSON.parse(data) as z.infer<typeof JSON_SCHEMA>;
    if (!JSON_SCHEMA.safeParse(json).success)
      return c.json({ error: "Invalid JSON" }, HTTP_STATUS.BAD_REQUEST);
    if (json.expiredAt) {
      if (isNaN(Number(json.expiredAt)))
        return c.json(
          { error: "Invalid expiredAt format" },
          HTTP_STATUS.BAD_REQUEST
        );
      const currentTime = Date.now();
      const expiredAt = new Date(json.expiredAt).getTime();
      if (currentTime > expiredAt)
        return c.json({ error: "Token expired" }, HTTP_STATUS.BAD_REQUEST);
    }
    const cache = await caches.open("img-cache");
    const cachedResponse = await cache.match(c.req.url);
    if (cachedResponse) {
      const mimeType = cachedResponse.headers.get("content-type") ?? "";
      if (Utils.isValidImageType(mimeType)) {
        return await Imager.restore(
          await cachedResponse.arrayBuffer(),
          mimeType,
          Keys.IMG_SECRET
        ).then((i) => {
          const type = cachedResponse.headers.get("Content-Type");
          const status = cachedResponse.headers.get("Cache-Status");
          const length = cachedResponse.headers.get("Content-Length");
          const disposition = cachedResponse.headers.get("Content-Disposition");
          const isImage: boolean = (type ?? "").startsWith("image/");
          const isVideo: boolean = (type ?? "").startsWith("video/");
          const isMedia: boolean = isImage || isVideo;
          const behavior: string = isMedia ? "inline" : "attachment";
          const fileName = encodeURIComponent(
            json.originalFileName ?? json.contentName!
          );
          c.header("Content-Type", type ?? "");
          c.header("Cache-Status", status ?? "HIT");
          c.header("Content-Length", length ?? "");
          c.header(
            "Content-Disposition",
            disposition ??
              `${behavior}; filename="${fileName}"; filename*=UTF-8''${fileName}`
          );
          return c.body(i);
        });
      }
    }
    if (json.segments) {
      const buffers: Uint8Array[] = [];
      for (const segment of json.segments) {
        const channelId = Utils.idDecode(segment.channelId);
        const messageId = Utils.idDecode(segment.messageId);
        contentUrl.pathname = `/attachments/${channelId}/${messageId}/${segment.contentName}`;
        const postData = {
          attachment_urls: [contentUrl],
        };
        const headersData = {
          Authorization: Keys.DISCORD_TOKEN,
        };
        const option = { json: postData, headers: headersData };
        try {
          const refreshData: { refreshed_urls: [{ refreshed: string }] } =
            await ky.post(refreshApi, option).json();
          const refreshedUrl = refreshData.refreshed_urls[0].refreshed;
          const response = await ky.get(refreshedUrl);
          if (!response.ok)
            throw new Error(`Failed to fetch segment: ${segment.segmentIndex}`);
          const arrayBuffer = await response.arrayBuffer();
          buffers.push(new Uint8Array(arrayBuffer));
        } catch (_e) {
          return c.json(
            { error: `Failed to fetch segment: ${segment.segmentIndex}` },
            HTTP_STATUS.BAD_REQUEST
          );
        }
      }
      const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
      const resultBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const buffer of buffers) {
        resultBuffer.set(buffer, offset);
        offset += buffer.length;
      }
      c.header("Content-Length", `${resultBuffer.length}`);
      c.header("Content-Type", json.contentType);
      const isImage: boolean = (json.contentType ?? "").startsWith("image/");
      const isVideo: boolean = (json.contentType ?? "").startsWith("video/");
      const isMedia: boolean = isImage || isVideo;
      const behavior: string = isMedia ? "inline" : "attachment";
      const fileName = encodeURIComponent(
        json.originalFileName ?? json.contentName!
      );
      c.header(
        "Content-Disposition",
        `${behavior}; filename="${fileName}"; filename*=UTF-8''${fileName}`
      );
      c.header("Cache-Status", "MISS");
      if (isImage) {
        const init = {
          headers: {
            "Content-Length": `${resultBuffer.length}`,
            "Content-Type": `${json.contentType}`,
            "Content-Disposition": `${behavior}; filename="${fileName}"; filename*=UTF-8''${fileName}`,
            "Cache-Status": "HIT",
          },
        };
        cache.put(c.req.url, new Response(resultBuffer, init));
      }
      return c.body(resultBuffer);
    } else {
      const channelId = Utils.idDecode(json.channelId!);
      const messageId = Utils.idDecode(json.messageId!);
      contentUrl.pathname = `/attachments/${channelId}/${messageId}/${json.contentName}`;
      const postData = {
        attachment_urls: [contentUrl],
      };
      const headersData = {
        Authorization: Keys.DISCORD_TOKEN,
      };
      const option = { json: postData, headers: headersData };
      const refreshData: { refreshed_urls: [{ refreshed: string }] } = await ky
        .post(refreshApi, option)
        .json();
      const refreshedUrl = refreshData.refreshed_urls[0].refreshed;
      return await ky
        .get(refreshedUrl)
        .then(async (resp: KyResponse): Promise<Response> => {
          if (!resp.body)
            return c.json({ error: "No body" }, HTTP_STATUS.BAD_REQUEST);
          let result: Uint8Array | ReadableStream<Uint8Array> = new Uint8Array(
            0
          );
          const contentType = resp.headers.get("content-type");
          const contentLength = resp.headers.get("content-length");
          if (contentLength) c.header("Content-Length", contentLength);
          if (contentType) {
            c.header("Content-Type", contentType);
            const isImage: boolean = contentType.startsWith("image/");
            const isVideo: boolean = contentType.startsWith("video/");
            const isMedia: boolean = isImage || isVideo;
            const behavior: string = isMedia ? "inline" : "attachment";
            const fileName = encodeURIComponent(
              json.originalFileName ?? json.contentName!
            );
            c.header(
              "Content-Disposition",
              `${behavior}; filename="${fileName}"; filename*=UTF-8''${fileName}`
            );
            if (!isImage) {
              result = resp.body;
            } else {
              if (Utils.isValidImageType(contentType)) {
                try {
                  const restoreImg = await Imager.restore(
                    await resp.arrayBuffer(),
                    contentType,
                    Keys.IMG_SECRET
                  );
                  const init = {
                    headers: {
                      "Content-Length": `${restoreImg.length}`,
                      "Content-Type": `${contentType}`,
                      "Content-Disposition": `${behavior}; filename="${fileName}"; filename*=UTF-8''${fileName}`,
                      "Cache-Status": "HIT",
                    },
                  };
                  cache.put(
                    c.req.url,
                    new Response(await resp.arrayBuffer(), init)
                  );
                  c.header("Content-Length", `${restoreImg.length}`);
                  c.header("Cache-Status", "MISS");
                  result = restoreImg;
                } catch (_e: unknown) {
                  throw new Error();
                }
              }
            }
          }
          c.header("Access-Control-Allow-Origin", "*");
          return c.body(result);
        })
        .catch((e: ErrorType) =>
          Guards.isKyError(e)
            ? c.json({ error: e.response.statusText }, e.response.status)
            : c.json(
                { error: "Internal Server Error" },
                HTTP_STATUS.INTERNAL_SERVER_ERROR
              )
        );
    }
  } catch (e) {
    const error = e as ErrorType;
    return Guards.isKyError(error)
      ? c.json({ error: error.response.statusText }, error.response.status)
      : c.json(
          { error: "Internal Server Error" },
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
  }
});

Deno.serve(app.fetch);
