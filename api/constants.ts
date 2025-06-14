import { z } from "npm:zod";
import { ContentfulStatusCode } from "./types.ts";

export const BASE_URL = new URL("https://cdn.discordapp.com");
export const API_URL = new URL(
  "https://discord.com/api/v9/attachments/refresh-urls",
);
export const DIVISOR_TARGET = 50;
export const MAX_UPLOAD_SIZE = 10485760; // 10MB
export const MAX_SEGMENT_SIZE = 9437184; // 9MB
export const CACHE_AGE = 315360000; // 10 years
export const KEY_NAMES = [
  "DIGIT_KEY",
  "CRYPTO_KEY",
  "DISCORD_TOKEN",
  "IMG_SECRET",
  "DISCORD_WEBHOOK_URL_1",
  "DISCORD_WEBHOOK_URL_2",
  "DISCORD_WEBHOOK_URL_3",
] as const;
export const IMG_TYPES = {
  JPG: "image/jpeg",
  PNG: "image/png",
} as const;
export const VALID_IMG_TYPES = [IMG_TYPES.JPG, IMG_TYPES.PNG] as const;
export const JSON_SCHEMA = z.object({
  channelId: z.string().optional(),
  messageId: z.string().optional(),
  contentName: z.string().optional(),
  contentType: z.string().optional(),
  originalFileName: z.string().optional(),
  expiredAt: z.string().optional(),
  segments: z
    .array(
      z.object({
        channelId: z.string(),
        messageId: z.string(),
        contentName: z.string(),
        segmentIndex: z.number(),
      }),
    )
    .optional(),
});
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const satisfies {
  [key: string]: ContentfulStatusCode;
};
