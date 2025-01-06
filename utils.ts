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
   * Returns an array of all divisors of a given number, up to a maximum target number.
   * @param n The number to find divisors of.
   * @param target The maximum number of divisors to find. Defaults to 10.
   * @returns An array of divisors of n, up to target in length.
   * @example
   * getDivisors(10); // => [1, 2, 5, 10]
   * getDivisors(12); // => [1, 2, 3, 4, 6, 12]
   */
  getDivisors: (n: number, target: number = 10): number[] =>
    Array.from({ length: target }, (_, i) => i + 1).filter(
      (div) => n % div === 0
    ),
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
