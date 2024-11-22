import { KEY_NAMES } from "./constants.ts";
import UniEnv, { Result, Maybe, SomeError } from "npm:@redpeacock78/unienv";

type KeyObj = typeof KEY_NAMES;
type KeyType = keyof KeyObj;
type EnvsType = Readonly<{
  name: KeyObj[KeyType];
  alias: KeyType;
  result: Result<Maybe<string>, SomeError>;
}>;
type EnvsNameType = EnvsType["name"];
type KeysObj = Readonly<{
  [key in KeyType]: string;
}>;

const handleEnvError = (missingEnvsNames: readonly string[]): never => {
  console.error(`Missing env variables: ${missingEnvsNames.join(", ")}`);
  console.error(
    `Please ensure these variables are set in your .env file or environment configuration.`
  );
  throw new Error(`Env check failed: ${missingEnvsNames.join(", ")}`);
};

const envs = (Object.keys(KEY_NAMES) as Array<KeyType>).map(
  (key: KeyType) =>
    ({
      name: KEY_NAMES[key],
      alias: key,
      result: UniEnv.get(KEY_NAMES[key]),
    } as const satisfies EnvsType)
);
const hasEnvs = {} as Record<KeyType, string>;
const missingEnvsNames = envs.flatMap(
  (env: EnvsType): readonly EnvsNameType[] | [] => {
    if (env.result.isNg() || !env.result.value)
      return [env.name] as const satisfies readonly EnvsNameType[];
    hasEnvs[env.alias] = env.result.value;
    return [];
  }
) as readonly EnvsNameType[];

if (missingEnvsNames.length > 0) handleEnvError(missingEnvsNames);

export const Keys = Object.freeze(hasEnvs) as KeysObj;
