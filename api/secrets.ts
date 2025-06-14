import { KEY_NAMES } from "./constants.ts";
import UniEnv from "https://cdn.skypack.dev/@redpeacock78/unienv";

const envs = KEY_NAMES.reduce(
  (acc, i) => {
    const env = UniEnv.get(i);
    env.isNg()
      ? acc.errors.push(env.error.message)
      : !env.value
      ? acc.errors.push(`${i} is not set.`)
      : (acc.values[i] = env.value);
    return acc;
  },
  {
    values: {} as Record<(typeof KEY_NAMES)[number], string>,
    errors: [] as string[],
  },
);

if (envs.errors.length > 0) throw new Error(`\n${envs.errors.join("\n")}`);

export const Keys = Object.freeze(envs.values);
