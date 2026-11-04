import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { readInteropFixture } from "../../__tests__/fixtures/interop.js";
import { encodeTid } from "../../utils/index.js";
import { tid } from "../tid.js";

describe("tid", () => {
  const schema = v.pipe(v.string(), tid());

  it("should return action object", () => {
    expect(tid("message")).toMatchObject({
      kind: "validation",
      type: "tid",
      reference: tid,
      expects: null,
      async: false,
      message: "message"
    });
  });

  describe("should accept valid interop TIDs", () => {
    it.each(readInteropFixture("tid_syntax_valid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(true);
    });
  });

  describe("should reject invalid interop TIDs", () => {
    it.each(readInteropFixture("tid_syntax_invalid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(false);
    });
  });

  it("should accept TIDs encoded from a timestamp", () => {
    // The encoder is what the Valimock integration uses, so its output must
    // satisfy the validator for realistic record keys.
    expect(encodeTid(0, 0)).toBe("2222222222222");
    expect(v.safeParse(schema, encodeTid(Date.now() * 1000, 42)).success).toBe(
      true
    );
  });
});
