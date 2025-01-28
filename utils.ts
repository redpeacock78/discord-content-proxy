import { VALID_IMG_TYPES } from "./constants.ts";
import { KyError, ErrorType } from "./types.ts";

export class Base62 {
  private static chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  /**
   * Encodes a numeric value into a Base62 encoded string.
   *
   * @param num - The numeric value to be encoded as a bigint.
   * @returns The Base62 encoded string representation of the input number.
   */
  public static encode(num: bigint): string {
    let number = num;
    const base = BigInt(this.chars.length);
    let str = "";
    while (true) {
      str = `${[...this.chars][Number(number % base)]}${str}`;
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
  public static decord(str: string): string {
    const base = BigInt(this.chars.length);
    let num = 0n;
    for (const char of [...str]) {
      if ([...this.chars].indexOf(char) === -1) break;
      num = num * base + BigInt([...this.chars].indexOf(char));
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
      return Base62.decord(id);
    }
  },
};
