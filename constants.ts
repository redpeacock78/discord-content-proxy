import { z } from "npm:zod";
import StatusCode from "npm:hono/utils";

export const BASE_URL = new URL("https://cdn.discordapp.com");
export const API_URL = new URL(
  "https://discord.com/api/v9/attachments/refresh-urls"
);
export const KEY_NAMES = [
  "DIGIT_KEY",
  "CRYPTO_KEY",
  "DISCORD_TOKEN",
  "IMG_SECRET",
] as const;
export const VALID_IMG_TYPES = ["image/png", "image/jpeg"] as const;
export const JSON_SCHEMA = z.object({
  channelId: z.string(),
  messageId: z.string(),
  contentName: z.string(),
  originalFileName: z.string().optional(),
  expiredAt: z.string().optional(),
});
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const satisfies {
  [key: string]: StatusCode;
};
