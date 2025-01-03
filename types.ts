import { z } from "npm:zod";
import StatusCode from "npm:hono/utils";
import { JSON_SCHEMA } from "./constants.ts";

export type Schema<T extends z.ZodType> = {
  in: {
    json: z.input<T>;
  };
  out: {
    json: z.infer<T>;
  };
};

export type SchemaKeys = keyof typeof JSON_SCHEMA.shape;

export type BuildSchemaProps = {
  [key in keyof typeof JSON_SCHEMA.shape]: {
    type: string;
  };
};

export type KyError = {
  response: {
    ok: boolean;
    redirected: boolean;
    status: StatusCode;
    statusText: string;
    url: string;
  };
};

export type ErrorType = KyError | Error;
