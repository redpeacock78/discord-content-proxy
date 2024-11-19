import { KEY_NAMES } from "./constants.ts";
import UniEnv from "npm:@redpeacock78/unienv";

const handleEnvError = (missingEnvs: string[]): never => {
  console.error(`Missing env variables: ${missingEnvs.join(", ")}`);
  console.error(
    `Please ensure these variables are set in your .env file or environment configuration.`
  );
  throw new Error(`Env check failed: ${missingEnvs.join(", ")}`);
};

const envs = (Object.keys(KEY_NAMES) as Array<keyof typeof KEY_NAMES>).map(
  (key) => ({
    name: KEY_NAMES[key],
    alias: key.toLowerCase(),
    result: UniEnv.get(KEY_NAMES[key]),
  })
);
const hasEnvs: Record<string, string> = {};
const notSetEnvsNames: string[] = envs.flatMap((env): string[] => {
  if (env.result.isNg() || !env.result.value) return [env.name];
  hasEnvs[env.alias] = env.result.value;
  return [];
});
if (notSetEnvsNames.length > 0) handleEnvError(notSetEnvsNames);

export const Keys = envs.reduce((acc, key): Record<string, string> => {
  acc[key.alias] = hasEnvs[key.alias];
  return acc;
}, {} as Record<string, string>);

console.log(Keys);
