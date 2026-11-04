/* oxlint-disable no-bitwise */

/**
 * The RFC 4648 base32 alphabet in lowercase, as used by CIDs with the `b`
 * multibase prefix.
 */
export const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

/**
 * The base32-sortable alphabet used by TIDs. Unlike RFC 4648 it sorts the
 * same way as the integers it encodes.
 */
export const BASE32_SORTABLE_ALPHABET = "234567abcdefghijklmnopqrstuvwxyz";

/**
 * Encodes bytes as unpadded base32 using the given alphabet.
 *
 * @param bytes The bytes to encode.
 * @param alphabet The 32 character alphabet.
 *
 * @returns The encoded string.
 */
export function encodeBase32(
  bytes: Uint8Array,
  alphabet: string = BASE32_ALPHABET
): string {
  let output = "";
  let bits = 0;
  let buffer = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(buffer << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Decodes unpadded base32 into bytes using the given alphabet.
 *
 * @param input The encoded string.
 * @param alphabet The 32 character alphabet.
 *
 * @returns The decoded bytes, or `null` if the input is not valid base32.
 */
export function decodeBase32(
  input: string,
  alphabet: string = BASE32_ALPHABET
): Uint8Array | null {
  const output = new Uint8Array(Math.floor((input.length * 5) / 8));
  let bits = 0;
  let buffer = 0;
  let index = 0;
  for (const char of input) {
    const value = alphabet.indexOf(char);
    if (value === -1) {
      return null;
    }
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (buffer >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  // Leftover bits must be zero padding, and fewer than one character.
  if (bits >= 5 || (buffer & ((1 << bits) - 1)) !== 0) {
    return null;
  }
  return output;
}

/**
 * Encodes a TID from its two components: a microsecond UNIX timestamp and a
 * 10-bit clock identifier.
 *
 * The TID layout is a 64-bit big-endian integer with the top bit zero, then
 * 53 bits of microseconds since the epoch, then the 10 bit clock id.
 *
 * @param timestamp Microseconds since the UNIX epoch.
 * @param clockId A number between 0 and 1023.
 *
 * @returns A 13 character TID.
 */
export function encodeTid(timestamp: number, clockId: number): string {
  let value = (BigInt(timestamp) << 10n) | BigInt(clockId & 1023);
  let output = "";
  for (let index = 0; index < 13; index++) {
    output = BASE32_SORTABLE_ALPHABET[Number(value & 31n)] + output;
    value >>= 5n;
  }
  return output;
}
