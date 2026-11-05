import { describe, expect, it } from "vitest";
import { TID_REGEX } from "../../regex.js";
import {
  BASE32_SORTABLE_ALPHABET,
  decodeBase32,
  encodeBase32,
  encodeTid
} from "../base32.js";

describe("base32", () => {
  it("should round trip bytes of every alignment", () => {
    // Five bytes fill eight characters exactly. Every other length leaves
    // bits that must be zero padded on the way out and dropped on the way
    // back, which is where hand-rolled base32 usually goes wrong.
    for (let length = 0; length <= 10; length++) {
      const bytes = Uint8Array.from(
        { length },
        (_, index) => (index * 37 + 11) & 255
      );
      const encoded = encodeBase32(bytes);
      expect(encoded).toHaveLength(Math.ceil((length * 8) / 5));
      expect(decodeBase32(encoded)).toStrictEqual(bytes);
    }
  });

  it("should encode with the sortable alphabet when asked", () => {
    const bytes = Uint8Array.from([0, 255, 16]);
    const encoded = encodeBase32(bytes, BASE32_SORTABLE_ALPHABET);
    expect(encoded).not.toBe(encodeBase32(bytes));
    expect(decodeBase32(encoded, BASE32_SORTABLE_ALPHABET)).toStrictEqual(
      bytes
    );
  });

  it("should reject strings that are not canonical base32", () => {
    // CIDs use the lowercase, unpadded alphabet only.
    expect(decodeBase32("ABCD")).toBeNull();
    expect(decodeBase32("ab=")).toBeNull();
    // A single character carries fewer bits than a byte.
    expect(decodeBase32("b")).toBeNull();
    // Trailing bits must be zero, otherwise two strings decode to one value.
    expect(decodeBase32("aa")).toStrictEqual(Uint8Array.from([0]));
    expect(decodeBase32("ab")).toBeNull();
  });

  it("should encode TIDs that sort by timestamp", () => {
    const earlier = encodeTid(1_700_000_000_000_000, 5);
    const later = encodeTid(1_700_000_000_000_001, 5);
    expect(earlier).toMatch(TID_REGEX);
    expect([later, earlier].sort()).toStrictEqual([earlier, later]);
    // The clock id occupies the low ten bits and is masked, not carried.
    expect(encodeTid(0, 1024)).toBe(encodeTid(0, 0));
    expect(encodeTid(0, 0)).toBe("2222222222222");
  });
});
