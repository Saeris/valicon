import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { readInteropFixture } from "../../__tests__/fixtures/interop.js";
import { atIdentifier } from "../atIdentifier.js";

describe("atIdentifier", () => {
  const schema = v.pipe(v.string(), atIdentifier());

  it("should return action object", () => {
    expect(atIdentifier("message")).toMatchObject({
      kind: "validation",
      type: "at_identifier",
      reference: atIdentifier,
      expects: null,
      async: false,
      message: "message"
    });
  });

  describe("should accept valid interop identifiers", () => {
    it.each(readInteropFixture("atidentifier_syntax_valid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(true);
    });
  });

  describe("should reject invalid interop identifiers", () => {
    it.each(readInteropFixture("atidentifier_syntax_invalid"))(
      "%s",
      (value) => {
        expect(v.safeParse(schema, value).success).toBe(false);
      }
    );
  });
});
