import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { encodeBase32 } from "../../utils/index.js";
import { cid } from "../cid.js";

describe("cid", () => {
  const schema = v.pipe(v.string(), cid());

  it("should return action object", () => {
    expect(cid("message")).toMatchObject({
      kind: "validation",
      type: "cid",
      reference: cid,
      expects: null,
      async: false,
      message: "message"
    });
  });

  it.each([
    // A record CID (dag-cbor) from the atproto test suite.
    "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a"
  ])("should accept the atproto CID profile: %s", (value) => {
    expect(v.safeParse(schema, value).success).toBe(true);
  });

  it("should accept freshly encoded CIDs with any digest", () => {
    for (const codec of [0x71, 0x55]) {
      const bytes = new Uint8Array(36);
      bytes.set([1, codec, 0x12, 0x20]);
      crypto.getRandomValues(bytes.subarray(4));
      const value = `b${encodeBase32(bytes)}`;
      expect(value).toHaveLength(59);
      expect(v.safeParse(schema, value).success).toBe(true);
    }
  });

  it.each([
    // CIDv0 is not allowed by the atproto data model.
    "QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n",
    // sha-512 digests are not allowed.
    "bafyrgqhai26anf3i7pips7q22coa4sz2fr4gk4q4sqdrymvwjlqvm4wkcqk4gz6qjkc2mwwcrwoxh5kkjddjd2rmskq5qj3azxe4bbk3qzgq",
    // Uppercase base32 and other multibase prefixes are not allowed.
    "BAFYREIDFAYVFUWQA7QLNOPDJIQRXZS6BLMOEU4RUJCJTNCI5BELUDIRZ2A",
    "zdj7WWeQ43G6JJvLWQWZpyHuAMq6uYWRjkBXFad11vE2LHhQ7",
    // Wrong length.
    "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2",
    ""
  ])("should reject other CIDs: %s", (value) => {
    expect(v.safeParse(schema, value).success).toBe(false);
  });
});
