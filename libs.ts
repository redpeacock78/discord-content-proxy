import { z } from "npm:zod";
// @ts-types="npm:@types/crypto-js"
import crypto from "npm:crypto-js";
import fastJson from "npm:fast-json-stringify";
import {
  createCanvas,
  loadImage,
  EmulatedCanvas2D,
} from "https://deno.land/x/canvas@v1.4.2/mod.ts";
import { Image, decode } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { Utils } from "./utils.ts";
import { DIVISOR_TARGET, VALID_IMG_TYPES } from "./constants.ts";

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
  /**
   * Generates a hash for the given data using MD5 algorithm.
   * @param {string} data The data to be hashed.
   * @returns {string} The hash string.
   */
  genHash: (data: string): string => crypto.MD5(data).toString(),
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

export const Imager = {
  /**
   * Scrambles an image by dividing it into blocks and rearranging them based on a secret key.
   *
   * @param buffer - The image data to be scrambled.
   * @param mimeType - The MIME type of the image data.
   * @param secretKey - The secret key used for generating the MD5 hash to sort the blocks.
   * @returns A Promise that resolves to a Uint8Array containing the scrambled image data.
   * @throws Error if the content type is unsupported.
   */
  scramble: async (
    buffer: ArrayBuffer,
    mimeType: (typeof VALID_IMG_TYPES)[number],
    secretKey: string
  ): Promise<Uint8Array> => {
    const img = await loadImage(new Uint8Array(buffer));

    // 画像の幅と高さを取得
    const width = img.width();
    const height = img.height();

    const widthDivisors = Utils.getDivisors(width, DIVISOR_TARGET);
    const heightDivisors = Utils.getDivisors(height, DIVISOR_TARGET);

    // 最適な分割数を選ぶ（ここでは最大値を使用）
    const blockNumX = Math.max(...widthDivisors);
    const blockNumY = Math.max(...heightDivisors);

    // 各ブロックのサイズを計算
    const blockWidth = Math.floor(width / blockNumX);
    const blockHeight = Math.floor(height / blockNumY);

    const blocks: { [key: string]: EmulatedCanvas2D } = {};

    // 画像をブロックに分割
    let loop = 0;
    for (let y = 0; y < blockNumY; y++) {
      for (let x = 0; x < blockNumX; x++) {
        loop++;
        const canvas = createCanvas(blockWidth, blockHeight);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          img,
          x * blockWidth,
          y * blockHeight,
          blockWidth,
          blockHeight,
          0,
          0,
          blockWidth,
          blockHeight
        );

        // キーを計算
        const keyIndex = loop % secretKey.length || secretKey.length;
        const keyChar = secretKey.charAt(keyIndex - 1);
        const key = Crypto.genHash(keyChar + loop);
        blocks[key] = canvas;
      }
    }

    // キーでソート
    const sortedKeys = Object.keys(blocks).sort();

    // 新しい画像を生成
    const outputCanvas = createCanvas(width, height);
    const outputCtx = outputCanvas.getContext("2d");

    let offsetX = 0;
    let offsetY = 0;

    for (const key of sortedKeys) {
      const block = blocks[key];
      outputCtx.drawImage(block, offsetX, offsetY);

      offsetX += blockWidth;
      if (offsetX >= width) {
        offsetX = 0;
        offsetY += blockHeight;
      }
    }

    if (mimeType === "image/jpeg") {
      try {
        const decodeImg = (await decode(outputCanvas.toBuffer())) as Image;
        return await decodeImg.encodeJPEG();
      } catch (e) {
        throw new Error(`Failed to encode JPEG: ${e}`);
      }
    } else {
      return outputCanvas.toBuffer();
    }
  },
  /**
   * Restores a randomly shuffled image back to its original state.
   * @param {ArrayBuffer} buffer The image to be restored, in the form of an ArrayBuffer.
   * @param {string} mimeType The MIME type of the image.
   * @param {string} secretKey The secret key used to generate the random permutation.
   * @returns {Promise<Uint8Array>} A Promise that resolves to the restored image, in the form of a Uint8Array.
   */
  restore: async (
    buffer: ArrayBuffer,
    mimeType: (typeof VALID_IMG_TYPES)[number],
    secretKey: string
  ): Promise<Uint8Array> => {
    // 画像を読み込む
    const image = await loadImage(new Uint8Array(buffer));

    // 画像の幅と高さを取得
    const width = image.width();
    const height = image.height();

    // 分割数を計算
    const widthDivisors = Utils.getDivisors(width, DIVISOR_TARGET);
    const heightDivisors = Utils.getDivisors(height, DIVISOR_TARGET);

    // 最適な分割数を選ぶ（ここでは最大値を使用）
    const gridSizeX = Math.max(...widthDivisors);
    const gridSizeY = Math.max(...heightDivisors);

    // 各ブロックのサイズを計算
    const blockWidth = Math.floor(width / gridSizeX);
    const blockHeight = Math.floor(height / gridSizeY);

    const keyArray: { key: string; md5: string; index: number }[] = [];

    for (let i = 0; i < gridSizeX * gridSizeY; i++) {
      const loop = i + 1;
      const keyIndex = loop % secretKey.length || secretKey.length;
      const keyChar = secretKey.charAt(keyIndex - 1);
      const md5 = Crypto.genHash(keyChar + loop);

      keyArray.push({
        key: keyChar + loop,
        md5,
        index: i + 1,
      });
    }

    // MD5 の値で並び替え
    keyArray.sort((a, b) => (a.md5 < b.md5 ? -1 : 1));

    // 新しいキャンバスを作成
    const outputCanvas = createCanvas(width, height);
    const ctx = outputCanvas.getContext("2d");

    for (let i = 1; i <= gridSizeX * gridSizeY; i++) {
      const index = keyArray.findIndex((item) => item.index === i) + 1;

      const sx = (index - 1) % gridSizeX;
      const sy = Math.floor((index - 1) / gridSizeX);

      const dx = (i - 1) % gridSizeX;
      const dy = Math.floor((i - 1) / gridSizeX);

      ctx.drawImage(
        image,
        sx * blockWidth,
        sy * blockHeight,
        blockWidth,
        blockHeight,
        dx * blockWidth,
        dy * blockHeight,
        blockWidth,
        blockHeight
      );
    }

    if (mimeType === (typeof VALID_IMG_TYPES)[1]) {
      try {
        const decodeImg = (await decode(outputCanvas.toBuffer())) as Image;
        return await decodeImg.encodeJPEG();
      } catch (e) {
        throw new Error(`Failed to encode JPEG: ${e}`);
      }
    } else {
      return outputCanvas.toBuffer();
    }
  },
};
