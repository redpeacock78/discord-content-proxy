import UniEnv from "npm:@redpeacock78/unienv";

const cryptoKey = UniEnv.get("CRYPTO_KEY");
const digitKey = UniEnv.get("DIGIT_KEY");
const discordToken = UniEnv.get("DISCORD_TOKEN");

if (cryptoKey.isNg()) throw cryptoKey.error;
if (digitKey.isNg()) throw digitKey.error;
if (!cryptoKey.value) throw new Error("CRYPTO_KEY is empty");
if (!digitKey.value) throw new Error("DIGIT_KEY is empty");
if (discordToken.isNg()) throw discordToken.error;
if (!discordToken.value) throw new Error("DISCORD_TOKEN is empty");

export const Keys = {
  crypto: cryptoKey.value,
  digit: digitKey.value,
  discord: discordToken.value,
};
