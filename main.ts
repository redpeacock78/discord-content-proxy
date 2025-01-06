import { z } from "npm:zod";
import ky, { KyResponse } from "npm:ky";
import { Context, Env, Hono } from "npm:hono";
import { zValidator } from "npm:@hono/zod-validator";
import { Keys } from "./secrets.ts";
import { Crypto, fJSON, Image } from "./libs.ts";
import { Base64Url, Guards, Utils } from "./utils.ts";
import { API_URL, BASE_URL, JSON_SCHEMA, HTTP_STATUS } from "./constants.ts";
import { Schema, SchemaKeys, BuildSchemaProps, ErrorType } from "./types.ts";

const app = new Hono();

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
  const buffer = await file.arrayBuffer();
  try {
    const scrambleImg = await Image.scramble(buffer, Keys.IMG_SECRET);
    c.header("Content-Length", `${scrambleImg.length}`);
    c.header("Content-Type", contentType);
    return c.body(scrambleImg);
  } catch (_e) {
    return c.json(
      { error: "Failed to generate image" },
      HTTP_STATUS.BAD_REQUEST
    );
  }
});

app.post(
  "/generate",
  zValidator(
    "json",
    JSON_SCHEMA,
    (
      value,
      c: Context<Env, string, Record<string | number | symbol, never>>
    ) => {
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
    }
  ),
  (c: Context<Env, string, Schema<typeof JSON_SCHEMA>>) => {
    const buildSchema = {
      title: "JSON Schema",
      type: "object",
      properties: (Object.keys(JSON_SCHEMA.shape) as Array<SchemaKeys>).reduce(
        (acc: BuildSchemaProps, key: SchemaKeys): BuildSchemaProps => ({
          ...acc,
          [key]: fJSON.deriveJsonSchema(JSON_SCHEMA.shape[key]),
        }),
        {} as BuildSchemaProps
      ),
    } as const;
    const json = c.req.valid("json");
    const data = fJSON.stringify(buildSchema, json);
    const digit: string = Crypto.genDigit(data, Keys.DIGIT_KEY);
    const encrypted: string = Base64Url.encode(
      Crypto.encrypt(data, Keys.CRYPTO_KEY)
    );
    return c.json({ digit, encrypted });
  }
);

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
    const json: z.infer<typeof JSON_SCHEMA> = JSON.parse(data);
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
    contentUrl.pathname = `/attachments/${json.channelId}/${json.messageId}/${json.contentName}`;
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
        let result: Uint8Array | ReadableStream<Uint8Array> = new Uint8Array(0);
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
            json.originalFileName ?? json.contentName
          );
          c.header(
            "Content-Disposition",
            `${behavior}; filename="${fileName}"; filename*=UTF-8''${fileName}`
          );
          if (!isImage) {
            result = resp.body;
          } else {
            if (Utils.isValidImageType(contentType)) {
              const restoreImg = await Image.restore(
                await resp.arrayBuffer(),
                Keys.IMG_SECRET
              );
              c.header("Content-Length", `${restoreImg.length}`);
              result = restoreImg;
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
  } catch (e) {
    return Guards.isKyError(e)
      ? c.json({ error: e.response.statusText }, e.response.status)
      : c.json(
          { error: "Internal Server Error" },
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
  }
});

Deno.serve(app.fetch);
