import ky, { KyResponse } from "npm:ky";
import { Context, Hono } from "npm:hono";
import { Crypto } from "./libs.ts";
import { Keys } from "./secrets.ts";
import { Base64Url } from "./utils.ts";
import { BASE_URL, API_URL } from "./constants.ts";

type PostData = {
  channelID: string;
  messageId: string;
  contentName: string;
  originalFileName: string;
  expiredAt?: string;
};

const app = new Hono();

app.post("/generate", async (c: Context) => {
  const json: PostData = await c.req.json();
  if (
    !json.channelID ||
    !json.messageId ||
    !json.contentName ||
    !json.originalFileName
  )
    return c.json(
      {
        error:
          "channelID, messageId, contentName, originalFileName is required",
      },
      400
    );
  const data = JSON.stringify(json);
  const digit: string = Crypto.genDigit(data, Keys.digit);
  const encrypted: string = Base64Url.encode(Crypto.encrypt(data, Keys.crypto));
  return c.json({ digit, encrypted });
});

app.get("/:digit/:encrypted", async (c: Context): Promise<Response> => {
  const digit: string = c.req.param("digit");
  const encrypted: string = c.req.param("encrypted");
  const data: string = Crypto.decrypt(Base64Url.decode(encrypted), Keys.crypto);
  if (Crypto.genDigit(data, Keys.digit) !== digit)
    return c.json({ error: "Invalid digit" }, 400);
  const json: PostData = JSON.parse(data);
  if (json.expiredAt) {
    if (isNaN(Number(json.expiredAt)))
      return c.json({ error: "Invalid expiredAt format" }, 400);
    const currentTime = Date.now();
    const expiredAt = new Date(json.expiredAt).getTime();
    if (currentTime > expiredAt) return c.json({ error: "Token expired" }, 400);
  }
  const contentUrl: URL = BASE_URL;
  const refreshApi: URL = API_URL;
  try {
    contentUrl.pathname = `/attachments/${json.channelID}/${json.messageId}/${json.contentName}`;
    const postData = {
      attachment_urls: [contentUrl],
    };
    const headersData = {
      Authorization: Keys.discord,
    };
    const option = { json: postData, headers: headersData };
    const refreshData: { refreshed_urls: [{ refreshed: string }] } = await ky
      .post(refreshApi, option)
      .json();
    const refreshedUrl = refreshData.refreshed_urls[0].refreshed;
    return await ky
      .get(refreshedUrl)
      .then((resp: KyResponse): Response => {
        const fileName = encodeURIComponent(json.originalFileName);
        const contentType = resp.headers.get("content-type");
        const contentLength = resp.headers.get("content-length");
        if (contentType) {
          c.header("Content-Type", contentType);
          if (
            contentType.startsWith("image/") ||
            contentType.startsWith("video/")
          ) {
            c.header(
              "Content-Disposition",
              `inline; filename="${fileName}"; filename*=UTF-8''${fileName}`
            );
          } else {
            c.header(
              "Content-Disposition",
              `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`
            );
          }
        }
        if (contentLength) c.header("Content-Length", contentLength);
        return c.body(resp.body);
      })
      .catch((e) => c.json({ error: e.response.reason }, e.response.status));
  } catch (e) {
    return c.json({ error: e.response.reason }, e.response.status);
  }
});

Deno.serve(app.fetch);
