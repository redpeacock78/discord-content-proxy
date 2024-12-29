import { z } from "npm:zod";
import ky, { KyResponse } from "npm:ky";
import { Context, Env, Hono } from "npm:hono";
import { zValidator } from "npm:@hono/zod-validator";
import { Keys } from "./secrets.ts";
import { Base64Url } from "./utils.ts";
import { Crypto, fJSON } from "./libs.ts";
import { API_URL, BASE_URL, JSON_SCHEMA } from "./constants.ts";

type Schema<T extends z.ZodType> = {
  in: {
    json: z.input<T>;
  };
  out: {
    json: z.infer<T>;
  };
};
type SchemaKeys = keyof typeof JSON_SCHEMA.shape;
type BuildSchemaProps = {
  [key in keyof typeof JSON_SCHEMA.shape]: {
    type: string;
  };
};

const app = new Hono();

app.post(
  "/generate",
  zValidator("json", JSON_SCHEMA, (value, c: Context<Env, string>) => {
    const data: z.infer<typeof JSON_SCHEMA> | null = value.data;
    if (!data) return c.json({ error: "JSON is missing" }, 400);
    if (!JSON_SCHEMA.safeParse(data).success)
      return c.json({ error: "Invalid JSON" }, 400);
    if (data.expiredAt) {
      if (isNaN(Number(data.expiredAt)))
        return c.json({ error: "Invalid expiredAt format" }, 400);
    }
    return data;
  }),
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
      return c.json({ error: "Invalid digit" }, 400);
    const json: z.infer<typeof JSON_SCHEMA> = JSON.parse(data);
    if (!JSON_SCHEMA.safeParse(json).success)
      return c.json({ error: "Invalid JSON" }, 400);
    if (json.expiredAt) {
      if (isNaN(Number(json.expiredAt)))
        return c.json({ error: "Invalid expiredAt format" }, 400);
      const currentTime = Date.now();
      const expiredAt = new Date(json.expiredAt).getTime();
      if (currentTime > expiredAt)
        return c.json({ error: "Token expired" }, 400);
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
      .then((resp: KyResponse): Response => {
        const contentType = resp.headers.get("content-type");
        const contentLength = resp.headers.get("content-length");
        if (contentLength) c.header("Content-Length", contentLength);
        if (contentType) {
          c.header("Content-Type", contentType);
          const isMedia: boolean =
            contentType.startsWith("image/") ||
            contentType.startsWith("video/");
          const behavior: string = isMedia ? "inline" : "attachment";
          if (json.originalFileName) {
            const fileName = encodeURIComponent(json.originalFileName);
            c.header(
              "Content-Disposition",
              `${behavior}; filename="${fileName}"; filename*=UTF-8''${fileName}`
            );
          }
        }
        c.header("Access-Control-Allow-Origin", "*");
        return c.body(resp.body);
      })
      .catch((e) =>
        e.response?.reason
          ? c.json({ error: e.response.reason }, e.response.status)
          : c.json({ error: "Internal Server Error" }, 500)
      );
  } catch (e) {
    return e.response?.reason
      ? c.json({ error: e.response.reason }, e.response.status)
      : c.json({ error: "Internal Server Error" }, 500);
  }
});

Deno.serve(app.fetch);
