import { describe, expect, expectTypeOf, it } from "vitest";
import * as v from "valibot";
import { sampleCid } from "../../__tests__/fixtures/samples.js";
import { getLexiconMetadata } from "../../utils/index.js";
import { cidLink } from "../cidLink.js";

describe("cidLink", () => {
  const schema = cidLink();

  it("should accept the JSON representation of a CID link", () => {
    const value = { $link: sampleCid("dag-cbor") };
    expect(v.parse(schema, value)).toStrictEqual(value);
    expectTypeOf(v.parse(schema, value)).toEqualTypeOf<{ $link: string }>();
  });

  it("should reject bare CID strings and invalid CIDs", () => {
    // A bare string is the `cid` string format, not a link object.
    expect(v.safeParse(schema, sampleCid("dag-cbor")).success).toBe(false);
    expect(v.safeParse(schema, { $link: "not-a-cid" }).success).toBe(false);
    expect(v.safeParse(schema, {}).success).toBe(false);
  });

  it("should carry Lexicon metadata for toLexicon", () => {
    expect(getLexiconMetadata(schema)).toStrictEqual({ type: "cid-link" });
  });
});
