import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { readInteropFixture } from "../../__tests__/fixtures/interop.js";
import { parseAtUri } from "../../utils/index.js";
import { atUri } from "../atUri.js";

describe("atUri", () => {
  const schema = v.pipe(v.string(), atUri());

  it("should return action object", () => {
    expect(atUri("message")).toMatchObject({
      kind: "validation",
      type: "at_uri",
      reference: atUri,
      expects: null,
      async: false,
      message: "message"
    });
  });

  describe("should accept valid interop AT URIs", () => {
    it.each(readInteropFixture("aturi_syntax_valid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(true);
    });
  });

  describe("should reject invalid interop AT URIs", () => {
    it.each(readInteropFixture("aturi_syntax_invalid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(false);
    });
  });

  it("should parse the parts of a record URI", () => {
    expect(
      parseAtUri(
        "at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3jzfcijpj2z2a#/text"
      )
    ).toStrictEqual({
      authority: "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
      collection: "app.bsky.feed.post",
      rkey: "3jzfcijpj2z2a",
      fragment: "/text"
    });
    expect(parseAtUri("at://alice.test")).toStrictEqual({
      authority: "alice.test"
    });
  });

  it("should reject query strings in the Lexicon form", () => {
    // Query strings are reserved for future use and not allowed in records.
    expect(parseAtUri("at://alice.test/app.bsky.feed.post?x=1")).toBeNull();
  });
});
