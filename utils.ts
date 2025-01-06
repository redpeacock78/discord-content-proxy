import { VALID_IMG_TYPES } from "./constants.ts";
import { KyError, ErrorType } from "./types.ts";

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
   * Finds the largest divisor of the minimum of two numbers that is less than or equal to 10.
   * @param a - The first number.
   * @param b - The second number.
   * @returns The largest divisor of the smaller number between `a` and `b` that is less than or equal to 10.
   */
  findBestDivisor: (a: number, b: number): number => {
    const minSize = Math.min(a, b);
    let bestDivisor = 1;
    for (let i = 10; i >= 1; i--) {
      if (minSize % i === 0) {
        bestDivisor = i;
        break;
      }
    }
    return bestDivisor;
  },
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
};
