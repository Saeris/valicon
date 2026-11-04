import { describe, expect, it } from "vitest";
import * as v from "valibot";
import {
  getDecodedByteLength,
  maxDecodedBytes,
  minDecodedBytes
} from "../decodedBytes.js";

describe("decodedBytes", () => {
  it("should count decoded bytes with and without padding", () => {
    // atproto implementations emit unpadded base64, but the data model
    // allows padding, so both spellings must count the same.
    expect(getDecodedByteLength("")).toBe(0);
    expect(getDecodedByteLength("AA")).toBe(1);
    expect(getDecodedByteLength("AA==")).toBe(1);
    expect(getDecodedByteLength("AAA")).toBe(2);
    expect(getDecodedByteLength("AAA=")).toBe(2);
    expect(getDecodedByteLength("AAAA")).toBe(3);
    expect(getDecodedByteLength("AAAAAA")).toBe(4);
  });

  it("should enforce the minimum decoded length", () => {
    const schema = v.pipe(v.string(), minDecodedBytes(2));
    expect(v.safeParse(schema, "AAA").success).toBe(true);
    const result = v.safeParse(schema, "AA==");
    expect(result.success).toBe(false);
    expect(result.issues?.[0]).toMatchObject({
      type: "min_decoded_bytes",
      expected: ">=2",
      received: "1",
      requirement: 2
    });
  });

  it("should enforce the maximum decoded length", () => {
    const schema = v.pipe(v.string(), maxDecodedBytes(2));
    expect(v.safeParse(schema, "AAA=").success).toBe(true);
    const result = v.safeParse(schema, "AAAA");
    expect(result.success).toBe(false);
    expect(result.issues?.[0]).toMatchObject({
      type: "max_decoded_bytes",
      expected: "<=2",
      received: "3"
    });
  });
});
