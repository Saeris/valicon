import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { readInteropFixture } from "../../__tests__/fixtures/interop.js";
import { nsid } from "../nsid.js";

describe("nsid", () => {
  const schema = v.pipe(v.string(), nsid());

  it("should return action object", () => {
    expect(nsid("message")).toMatchObject({
      kind: "validation",
      type: "nsid",
      reference: nsid,
      expects: null,
      async: false,
      message: "message"
    });
  });

  describe("should accept valid interop NSIDs", () => {
    it.each(readInteropFixture("nsid_syntax_valid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(true);
    });
  });

  describe("should reject invalid interop NSIDs", () => {
    it.each(readInteropFixture("nsid_syntax_invalid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(false);
    });
  });

  it("should keep the name segment case sensitive", () => {
    // NSID names are case sensitive, so both must validate as written.
    expect(v.safeParse(schema, "app.bsky.feed.getPosts").success).toBe(true);
    expect(v.safeParse(schema, "app.bsky.feed.getposts").success).toBe(true);
  });
});
