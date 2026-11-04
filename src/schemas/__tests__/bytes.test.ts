import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { getLexiconMetadata } from "../../utils/index.js";
import { bytes } from "../bytes.js";

describe("bytes", () => {
  it("should accept padded and unpadded base64", () => {
    // atproto libraries emit unpadded base64, other tooling pads it.
    const schema = bytes();
    expect(v.safeParse(schema, { $bytes: "AAECAw" }).success).toBe(true);
    expect(v.safeParse(schema, { $bytes: "AAECAw==" }).success).toBe(true);
    expect(v.safeParse(schema, { $bytes: "" }).success).toBe(true);
  });

  it("should reject other encodings", () => {
    const schema = bytes();
    expect(v.safeParse(schema, { $bytes: "AAEC-w" }).success).toBe(false);
    expect(v.safeParse(schema, { $bytes: "A" }).success).toBe(false);
    expect(v.safeParse(schema, "AAECAw").success).toBe(false);
  });

  it("should enforce limits on the decoded length", () => {
    const schema = bytes({ minLength: 2, maxLength: 4 });
    expect(v.safeParse(schema, { $bytes: "AAE" }).success).toBe(true);
    expect(v.safeParse(schema, { $bytes: "AAECAw" }).success).toBe(true);
    expect(v.safeParse(schema, { $bytes: "AA" }).success).toBe(false);
    expect(v.safeParse(schema, { $bytes: "AAECAwQ" }).success).toBe(false);
  });

  it("should carry the limits as Lexicon metadata", () => {
    expect(getLexiconMetadata(bytes({ maxLength: 10 }))).toStrictEqual({
      type: "bytes",
      maxLength: 10
    });
  });
});
