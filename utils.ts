export const Base64Url = {
  encode: (str: string): string =>
    btoa(String.fromCharCode(...Array.from(new TextEncoder().encode(str))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, ""),
  decode: (str: string): string =>
    new TextDecoder().decode(
      Uint8Array.from(
        atob(str.replace(/-/g, "+").replace(/_/g, "/")),
        (c: string): number => c.charCodeAt(0)
      )
    ),
};
