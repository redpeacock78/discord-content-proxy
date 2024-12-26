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
};
