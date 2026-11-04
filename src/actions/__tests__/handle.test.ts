import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { readInteropFixture } from "../../__tests__/fixtures/interop.js";
import { handle } from "../handle.js";

describe("handle", () => {
  const schema = v.pipe(v.string(), handle());

  it("should return action object", () => {
    expect(handle("message")).toMatchObject({
      kind: "validation",
      type: "handle",
      reference: handle,
      expects: null,
      async: false,
      message: "message"
    });
  });

  describe("should accept valid interop handles", () => {
    it.each(readInteropFixture("handle_syntax_valid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(true);
    });
  });

  describe("should reject invalid interop handles", () => {
    it.each(readInteropFixture("handle_syntax_invalid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(false);
    });
  });

  it("should accept handles of exactly 253 characters", () => {
    // 253 is the DNS hostname limit the handle spec inherits.
    const value = `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(56)}.test`;
    expect(value).toHaveLength(253);
    expect(v.safeParse(schema, value).success).toBe(true);
    expect(v.safeParse(schema, `a${value}`).success).toBe(false);
  });

  it("should report a descriptive issue", () => {
    expect(v.safeParse(schema, "@alice.test").issues?.[0]?.message).toBe(
      'Invalid handle: Received "@alice.test"'
    );
  });
});
