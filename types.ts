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
  name: string;
  response: {
    code: string | number;
    title: string;
    status: StatusCode;
    reason: string;
  };
};

export type ErrorType = KyError | Error;
