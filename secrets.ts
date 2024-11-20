import { KEY_NAMES } from "./constants.ts";
import UniEnv from "npm:@redpeacock78/unienv";

type KeyType = keyof typeof KEY_NAMES;

const handleEnvError = (missingEnvs: string[]): never => {
  console.error(`Missing env variables: ${missingEnvs.join(", ")}`);
  console.error(
    `Please ensure these variables are set in your .env file or environment configuration.`
  );
  throw new Error(`Env check failed: ${missingEnvs.join(", ")}`);
};

const envs = (Object.keys(KEY_NAMES) as Array<KeyType>).map((key: KeyType) => ({
  name: KEY_NAMES[key],
  alias: key,
  result: UniEnv.get(KEY_NAMES[key]),
}));
const hasEnvs = {} as Record<KeyType, string>;
const notSetEnvsNames: string[] = envs.flatMap((env): string[] => {
  if (env.result.isNg() || !env.result.value) return [env.name];
  hasEnvs[env.alias] = env.result.value;
  return [];
});

if (notSetEnvsNames.length > 0) handleEnvError(notSetEnvsNames);

export const Keys = hasEnvs;
