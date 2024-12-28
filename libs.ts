import { z } from "npm:zod";
// @ts-types="npm:@types/crypto-js"
import crypto from "npm:crypto-js";
import fastJson from "npm:fast-json-stringify";

export const Crypto = {
  /**
   * Encrypts a string using AES algorithm.
   * @param {string} data The string to be encrypted.
   * @param {string} key The encryption key.
   * @returns {string} The encrypted string.
   */
  encrypt: (data: string, key: string): string =>
    crypto.AES.encrypt(data, key).toString(),
  /**
   * Decrypts an AES-encrypted string.
   * @param {string} data The encrypted string to be decrypted.
   * @param {string} key The decryption key.
   * @returns {string} The decrypted string in UTF-8 encoding.
   */
  decrypt: (data: string, key: string): string =>
    crypto.AES.decrypt(data, key).toString(crypto.enc.Utf8),
  /**
   * Generates a digital signature for the given data using HMAC SHA-256 algorithm.
   * @param {string} data The data to be signed.
   * @param {string} key The signature key.
   * @returns {string} The digital signature.
   */
  genDigit: (data: string, key: string): string =>
    crypto.HmacSHA256(data, key).toString(),
};
export const fJSON = {
  /**
   * Stringifies an object to a JSON string according to the given schema.
   * @param {fastJson.AnySchema} schema The JSON schema to be used for stringification.
   * @param {TDoc} doc The object to be stringified.
   * @returns {string} The JSON string representation of the object.
   */
  stringify: <TDoc extends object = object>(
    schema: fastJson.AnySchema,
    doc: TDoc
  ): string => fastJson(schema)(doc),
  /**
   * Derives a JSON schema from a given Zod schema.
   *
   * @param {z.ZodTypeAny} schema The Zod schema to be derived from.
   * @returns {Record<string, unknown>} The derived JSON schema.
   *
   * @example
   * const schema = z.object({
   *   foo: z.string(),
   *   bar: z.number().optional(),
   * });
   * const derivedSchemaFoo = deriveJsonSchema(schema.shape.foo);
   * // => { type: "string" }
   * const derivedSchemaBar = deriveJsonSchema(schema.shape.bar);
   * // => { type: "number", nullable: true }
   */
  deriveJsonSchema: (schema: z.ZodTypeAny): Record<string, unknown> => {
    if (schema instanceof z.ZodOptional)
      return {
        ...fJSON.deriveJsonSchema(schema._def.innerType),
        nullable: true,
      };
    if (schema instanceof z.ZodString) return { type: "string" };
    if (schema instanceof z.ZodNumber) return { type: "number" };
    if (schema instanceof z.ZodBoolean) return { type: "boolean" };
    if (schema instanceof z.ZodObject)
      return {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(schema.shape).map(
            ([key, value]: [string, unknown]): [
              string,
              Record<string, unknown>
            ] => [key, fJSON.deriveJsonSchema(value as z.ZodTypeAny)]
          )
        ),
        required: Object.keys(schema.shape).filter(
          (key: string): boolean =>
            !(schema.shape[key] instanceof z.ZodOptional)
        ),
      };
    if (schema instanceof z.ZodArray)
      return { type: "array", items: fJSON.deriveJsonSchema(schema._def.type) };
    if (schema instanceof z.ZodUnion)
      return {
        type: "array",
        items: schema._def.options.map(fJSON.deriveJsonSchema),
      };
    if (schema instanceof z.ZodLiteral) return { const: schema._def.value };
    return { type: "unknown" };
  },
};
