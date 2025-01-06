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
  gcd: (a: number, b: number): number => (b == 0 ? a : Utils.gcd(b, a % b)),
  /**
   * Finds all divisors of a given number.
   * @param n The number to find all divisors of.
   * @returns An array of all divisors of the given number, sorted in ascending order.
   * @example
   * findDivisors(12); // => [1, 2, 3, 4, 6, 12]
   */
  findDivisors: (n: number): number[] => {
    const divisors: number[] = [];
    for (let i = 1; i <= Math.sqrt(n); i++) {
      if (n % i === 0) {
        divisors.push(i);
        if (i !== n / i) {
          divisors.push(n / i);
        }
      }
    }
    return divisors.sort((a, b) => a - b);
  },
  /**
   * Finds the divisor of the greatest common divisor (GCD) of two numbers
   * that is closest to a target value.
   *
   * @param a - The first number.
   * @param b - The second number.
   * @param target - The target value to find the closest divisor to. Defaults to 10.
   * @returns The divisor of the GCD of `a` and `b` that is closest to the `target`.
   * @example
   * findClosestDivisor(24, 36, 5); // => 6
   */
  findClosestDivisor: (a: number, b: number, target: number = 10): number => {
    const gcdValue = Utils.gcd(a, b);
    const divisors = Utils.findDivisors(gcdValue);
    return divisors.reduce((closest, divisor) =>
      Math.abs(divisor - target) < Math.abs(closest - target)
        ? divisor
        : closest
    );
  },
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
