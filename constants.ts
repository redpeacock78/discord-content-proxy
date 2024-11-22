export const BASE_URL = new URL("https://cdn.discordapp.com");
export const API_URL = new URL(
  "https://discord.com/api/v9/attachments/refresh-urls"
);
export const KEY_NAMES = {
  DIGIT: "DIGIT_KEY",
  CRYPTO: "CRYPTO_KEY",
  DISCORD: "DISCORD_TOKEN",
} as const satisfies Record<string, string>;
