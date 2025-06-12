// import * as bigintConv from "npm:bigint-conversion";
import { VALID_IMG_TYPES } from "./constants.ts";
import { KyError, ErrorType } from "./types.ts";

// export class TextCompression {
//   // BWT (Burrows-Wheeler Transform)
//   private static bwtTransform(input: string[]): {
//     transformed: string[];
//     index: number;
//   } {
//     const n = input.length;
//     const table = Array.from({ length: n }, (_, i) => [
//       ...input.slice(i),
//       ...input.slice(0, i),
//     ]);
//     table.sort((a, b) => a.join("").localeCompare(b.join(""))); // Unicode 対応ソート
//     const transformed = table.map((row) => row[n - 1]);
//     const index = table.findIndex((row) => row.join("") === input.join(""));
//     return { transformed, index };
//   }
//   // Inverse BWT (IBWT)
//   private static bwtInverseTransform(
//     transformed: string,
//     index: number
//   ): string {
//     const n = transformed.length;
//     let table = Array(n)
//       .fill("")
//       .map(() => "");

//     for (let i = 0; i < n; i++) {
//       table = table.map((row, j) => transformed[j] + row).sort();
//     }
//     return table[index];
//   }
//   // Run-Length Encoding (RLE)
//   private static rleEncode(input: string[]): string {
//     // 数字を一時的にエスケープ（特殊なシンボルで置換）
//     const encoded = input
//       .map((char) => JSON.stringify(char)) // Unicode のまま安全に処理
//       .join("")
//       .replace(/(\d+)/g, (match) => `__NUM__${match}__NUM__`); // 数字をエスケープ
//     return encoded.replace(
//       /"(.)"\1*/g,
//       (match, char) => `"${char}${match.length / 3}"`
//     );
//   }
//   // Run-Length Decoding (RLE)
//   private static rleDecode(input: string): string {
//     // エスケープされた数字部分を元に戻す
//     const decoded = input
//       .replace(/__NUM__(\d+)__NUM__/g, (_, num) => num) // 数字を元に戻す
//       .replace(/"(.)(\d+)?"/g, (_, char, count) => {
//         const repeatCount = count ? parseInt(count, 10) : 1;
//         if (repeatCount <= 0 || repeatCount > 1000) {
//           console.warn(
//             `無効な繰り返し回数: ${repeatCount}, デフォルトで 1 にします`
//           );
//           return char;
//         }
//         return char.repeat(repeatCount);
//       });
//     return decoded;
//   }
//   // 圧縮関数（BWT + RLE）
//   public static compress(input: string): string {
//     const chars = Array.from(input);
//     const { transformed, index } = this.bwtTransform(chars);
//     const rleCompressed = this.rleEncode(transformed);
//     return JSON.stringify({ index, data: rleCompressed });
//   }
//   // 展開関数（RLE + IBWT）
//   public static decompress(compressed: string): string {
//     const { index, data } = JSON.parse(compressed);
//     const bwtRestored = this.rleDecode(data);
//     return this.bwtInverseTransform(bwtRestored, index);
//   }
// }

// export class Stream {
//   private static textEncoder = new TextEncoder();
//   private static textDecoder = new TextDecoder();
//   /**
//    * Creates a ReadableStream from the given value. The stream will contain the value
//    * and then immediately close.
//    *
//    * @param value The value to be used in the stream.
//    * @returns A ReadableStream that contains the value.
//    */
//   private static createUpstream(value: unknown): ReadableStream<unknown> {
//     return new ReadableStream({
//       start(controller) {
//         controller.enqueue(value);
//         controller.close();
//       },
//     });
//   }
//   /**
//    * Compresses a string input using the DEFLATE compression algorithm,
//    * then encodes the compressed data to a Base62 string.
//    *
//    * @param input - The string to be compressed and encoded.
//    * @returns A promise that resolves to a Base62 encoded string of the compressed input.
//    */
//   public static async compressToBase62(input: string): Promise<string> {
//     const upstream = this.createUpstream(this.textEncoder.encode(input));
//     const compression = new CompressionStream("deflate-raw");
//     const stream = upstream.pipeThrough(compression);
//     const compressed = await new Response(stream).arrayBuffer();
//     return Base62.encode(bigintConv.bufToBigint(compressed));
//   }
//   /**
//    * Decompresses a Base62 encoded string input using the DEFLATE decompression
//    * algorithm, then decodes the decompressed data to a string.
//    *
//    * @param input - The Base62 encoded string to be decompressed and decoded.
//    * @returns A promise that resolves to the decompressed and decoded string.
//    */
//   public static async decompressFromBase62(input: string): Promise<string> {
//     const compressedBytes = new Uint8Array(
//       bigintConv.bigintToBuf(BigInt(Base62.decode(input)))
//     );
//     const upstream = this.createUpstream(compressedBytes);
//     const decompression = new DecompressionStream("deflate-raw");
//     const stream = upstream.pipeThrough(decompression);
//     const decompressed = await new Response(stream).arrayBuffer();
//     return this.textDecoder.decode(decompressed);
//   }
//   /**
//    * Compresses a string input using the DEFLATE compression algorithm,
//    * then encodes the compressed data to a Base64 string.
//    *
//    * @param input - The string to be compressed and encoded.
//    * @returns A promise that resolves to a Base64 encoded string of the compressed input.
//    */
//   public static async compressToBase64(input: string): Promise<string> {
//     const upstream = this.createUpstream(this.textEncoder.encode(input));
//     const compression = new CompressionStream("deflate-raw");
//     const stream = upstream.pipeThrough(compression);
//     const compressed = await new Response(stream).arrayBuffer();
//     return btoa(String.fromCharCode(...new Uint8Array(compressed)));
//   }
//   /**
//    * Decompresses a Base64 encoded string input using the DEFLATE decompression
//    * algorithm, then decodes the decompressed data to a string.
//    *
//    * @param input - The Base64 encoded string to be decompressed and decoded.
//    * @returns A promise that resolves to the decompressed and decoded string.
//    */
//   public static async decompressFromBase64(input: string): Promise<string> {
//     const compressedBytes = Uint8Array.from(atob(input), (c) =>
//       c.charCodeAt(0)
//     );
//     const upstream = this.createUpstream(compressedBytes);
//     const decompression = new DecompressionStream("deflate-raw");
//     const stream = upstream.pipeThrough(decompression);
//     const decompressed = await new Response(stream).arrayBuffer();
//     return this.textDecoder.decode(decompressed);
//   }
//   /**
//    * Compresses a string input using the DEFLATE compression algorithm,
//    * then encodes the compressed data to a Base85 string.
//    *
//    * @param input - The string to be compressed and encoded.
//    * @returns A promise that resolves to a Base85 encoded string of the compressed input.
//    */
//   public static async compressToBase85(input: string): Promise<string> {
//     const upstream = this.createUpstream(this.textEncoder.encode(input));
//     const compression = new CompressionStream("deflate-raw");
//     const stream = upstream.pipeThrough(compression);
//     const compressed = await new Response(stream).arrayBuffer();
//     return Base85.encode(new Uint8Array(compressed));
//   }
//   /**
//    * Decompresses a Base85 encoded string input using the DEFLATE decompression
//    * algorithm, then decodes the decompressed data to a string.
//    *
//    * @param input - The Base85 encoded string to be decompressed and decoded.
//    * @returns A promise that resolves to the decompressed and decoded string.
//    */
//   public static async decompressFromBase85(input: string): Promise<string> {
//     const compressedBytes = Base85.decode(input);
//     const upstream = this.createUpstream(compressedBytes);
//     const decompression = new DecompressionStream("deflate-raw");
//     const stream = upstream.pipeThrough(decompression);
//     const decompressed = await new Response(stream).arrayBuffer();
//     return this.textDecoder.decode(decompressed);
//   }
// }

export class Base62 {
  private static charArray = [
    ..."0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ];
  /**
   * Encodes a numeric value into a Base62 encoded string.
   *
   * @param num - The numeric value to be encoded as a bigint.
   * @returns The Base62 encoded string representation of the input number.
   */
  public static encode(num: bigint): string {
    let number = num;
    const base = BigInt(this.charArray.length);
    let str = "";
    while (true) {
      str = `${this.charArray[Number(number % base)]}${str}`;
      number = number / base;
      if (number === 0n) break;
    }
    return str;
  }
  /**
   * Decodes a Base62 encoded string back to a numeric string representation.
   *
   * @param str - The Base62 encoded string to be decoded.
   * @returns The decoded numeric string.
   * @throws An error if the result is "0", indicating an invalid or empty input.
   */
  public static decode(str: string): string {
    const base = BigInt(this.charArray.length);
    let num = 0n;
    for (const char of [...str]) {
      if (this.charArray.indexOf(char) === -1) break;
      num = num * base + BigInt(this.charArray.indexOf(char));
    }
    const result = num.toString();
    if (result === "0") throw new Error();
    return result;
  }
}

export const Base64Url = {
  /**
   * Encodes a string using Base64url.
   * @param {string} str The string to be encoded.
   * @returns {string} The Base64url encoded string.
   */
  encode: (str: string): string =>
    btoa(String.fromCharCode(...Array.from(new TextEncoder().encode(str))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, ""),
  /**
   * Decodes a Base64url encoded string.
   * @param {string} str The Base64url encoded string to be decoded.
   * @returns {string} The decoded string.
   */
  decode: (str: string): string =>
    new TextDecoder().decode(
      Uint8Array.from(
        atob(str.replace(/-/g, "+").replace(/_/g, "/")),
        (c: string): number => c.charCodeAt(0)
      )
    ),
};

// export const Base85 = {
//   /**
//    * Encodes a string using Base85 (Ascii85) encoding.
//    *
//    * The function converts a given string into its Base85 encoded representation,
//    * following the Ascii85 encoding scheme. Each 4-byte block is encoded into 5 ASCII characters.
//    * Padding is added to ensure that the input can be divided into 4-byte blocks.
//    *
//    * @param {Uint8Array} input - The input string to be encoded.
//    * @returns {string} The Base85 encoded string, enclosed within the delimiters "<\~" and "\~>".
//    */
//   encode: (input: Uint8Array): string => {
//     const bit: string = [...input]
//       .map((u: number): string => Number(u).toString(2).padStart(8, "0"))
//       .join("");
//     const n: number = 32;
//     const mod: number = bit.length % n;
//     let padding_bit: string = bit;
//     if (mod !== 0) {
//       for (let i: number = 0; i < n - mod; i++) {
//         padding_bit = `${padding_bit}00`;
//       }
//     }
//     const base: number[][] = padding_bit
//       .match(/.{32}/g)!
//       .map((i: string): number[] => {
//         const con: number = 85;
//         const dec: number = parseInt(i, 2);
//         const a: number = dec % con;
//         const b: number = ((dec - a) / con) % con;
//         const c: number = ((dec - (a + b * con)) / con ** 2) % con;
//         const d: number =
//           ((dec - (a + b * con + c * con ** 2)) / con ** 3) % con;
//         const e: number =
//           ((dec - (a + b * con + c * con ** 2 + d * con ** 3)) / con ** 4) %
//           con;
//         return [e, d, c, b, a];
//       });
//     return `<~${base
//       .flat()
//       .map((i: number): string => String.fromCharCode(i + 33))
//       .join("")
//       .replace(/!!!!!/g, "z")
//       .replace(/z+$/, "")}~>`;
//   },
//   /**
//    * Decodes a Base85 encoded string.
//    *
//    * The function takes a Base85 encoded string, removes the delimiters "<\~" and "\~>",
//    * and then decodes the string by dividing it into 5-character blocks,
//    * each representing a 4-byte block. The decoded string is returned.
//    * If the input string does not match the expected format, an error is thrown.
//    * @param {string} str The Base85 encoded string to be decoded.
//    * @returns {Uint8Array} The decoded string.
//    * @throws An error if the input string is not a valid Base85 encoded string.
//    */
//   decode: (str: string): Uint8Array => {
//     if (str.startsWith("<~") && str.endsWith("~>")) {
//       const replaced: string = str
//         .replace(/^<~/g, "")
//         .replace(/~>$/g, "")
//         .replace(/z/g, "!!!!!");
//       const n: number = 5;
//       const mod: number = replaced.length % n;
//       const diff: number = n - mod;
//       let replaced_arr: string[];
//       if (mod === 0) {
//         replaced_arr = replaced.match(/.{5}/g)!;
//       } else {
//         let padd_replaced: string = replaced;
//         for (let i: number = 0; i < diff; i++) {
//           padd_replaced = `${padd_replaced}u`;
//         }
//         replaced_arr = padd_replaced.match(/.{5}/g)!;
//       }
//       const ascii_arr: number[] = replaced_arr
//         .map((i: string): number[] =>
//           i
//             .match(/./g)!
//             .map(
//               (i: string, n: number): number =>
//                 (i!.charCodeAt(0) - 33) * 85 ** (4 - n)
//             )
//             .reduce((sum: number, elm: number): number => sum + elm + 0)
//             .toString(2)
//             .padStart(32, "0")
//             .match(/.{8}/g)!
//             .map((i: string): number => parseInt(i, 2))
//         )
//         .flat();
//       if (mod !== 0) {
//         for (let i: number = 0; i < diff; i++) {
//           ascii_arr.pop();
//         }
//       }
//       return new Uint8Array(ascii_arr);
//     } else {
//       throw new Error("base85: invalid input");
//     }
//   },
// };

export const Guards = {
  /**
   * Checks if the given error is an instance of KyError.
   * @param e The error to be checked.
   * @returns True if the error is an instance of KyError, false otherwise.
   * @example
   * const error = new Error("Test");
   * isKyError(error); // => false
   * const kyError = ky.createError(error);
   * isKyError(kyError); // => true
   */
  isKyError: (e: ErrorType): e is KyError =>
    typeof e === "object" &&
    e !== null &&
    typeof (e as KyError).response === "object" &&
    (e as KyError).response !== null &&
    typeof (e as KyError).response.ok === "boolean" &&
    typeof (e as KyError).response.redirected === "boolean" &&
    typeof (e as KyError).response.status === "number" &&
    typeof (e as KyError).response.statusText === "string" &&
    typeof (e as KyError).response.url === "string",
};

export const Utils = {
  /**
   * Returns an array of all divisors of a given number, up to a maximum target number.
   * @param n The number to find divisors of.
   * @param target The maximum number of divisors to find. Defaults to 10.
   * @returns An array of divisors of n, up to target in length.
   * @example
   * getDivisors(10); // => [1, 2, 5, 10]
   * getDivisors(12); // => [1, 2, 3, 4, 6, 12]
   */
  getDivisors: (n: number, target: number = 10): number[] =>
    Array.from(
      { length: target },
      (_: unknown, i: number): number => i + 1
    ).filter((div: number): boolean => n % div === 0),
  /**
   * Checks if the given MIME type is a valid image type.
   * @param type - The MIME type to check.
   * @returns True if the MIME type is valid and included in the list of valid image types, false otherwise.
   */
  isValidImageType: (
    type: string
  ): type is (typeof VALID_IMG_TYPES)[number] => {
    return VALID_IMG_TYPES.includes(type as (typeof VALID_IMG_TYPES)[number]);
  },
  /**
   * Decodes a given Discord ID or a Base62 encoded ID back to its original string
   * representation.
   * @param id - The Discord ID or Base62 encoded string to decode.
   * @returns The decoded string.
   * @example
   * idDecode("123456789012345678"); // => "123456789012345678"
   * idDecode("5t5ZJq"); // => "123456789012345678"
   */
  idDecode: (id: string): string => {
    try {
      BigInt(id);
      return id;
    } catch {
      return Base62.decode(id);
    }
  },
};
