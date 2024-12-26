// @ts-types="npm:@types/crypto-js"
import crypto from "npm:crypto-js";
import fastJson from "npm:fast-json-stringify";
import { JSON_SCHEMA_OBJ } from "./constants.ts";

export const Crypto = {
  encrypt: (data: string, key: string) => {
    return crypto.AES.encrypt(data, key).toString();
  },
  decrypt: (data: string, key: string) => {
    return crypto.AES.decrypt(data, key).toString(crypto.enc.Utf8);
  },
  genDigit: (data: string, key: string) =>
    crypto.HmacSHA256(data, key).toString(),
};
export const fJSON = {
  stringify: <TDoc extends object = object>(doc: TDoc): string =>
    fastJson(JSON_SCHEMA_OBJ)(doc),
};
