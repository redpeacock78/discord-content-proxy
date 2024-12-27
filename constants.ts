import { z } from "npm:zod";

export const BASE_URL = new URL("https://cdn.discordapp.com");
export const API_URL = new URL(
  "https://discord.com/api/v9/attachments/refresh-urls"
);
export const KEY_NAMES = ["DIGIT_KEY", "CRYPTO_KEY", "DISCORD_TOKEN"] as const;
export const JSON_SCHEMA = z.object({
  channelId: z.string(),
  messageId: z.string(),
  contentName: z.string(),
  originalFileName: z.string(),
  expiredAt: z.string().optional(),
});
