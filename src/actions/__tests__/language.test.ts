import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { readInteropFixture } from "../../__tests__/fixtures/interop.js";
import { language } from "../language.js";

describe("language", () => {
  const schema = v.pipe(v.string(), language());

  it("should return action object", () => {
    expect(language("message")).toMatchObject({
      kind: "validation",
      type: "language",
      reference: language,
      expects: null,
      async: false,
      message: "message"
    });
  });

  describe("should accept valid interop language tags", () => {
    it.each(readInteropFixture("language_syntax_valid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(true);
    });
  });

  describe("should reject invalid interop language tags", () => {
    it.each(readInteropFixture("language_syntax_invalid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(false);
    });
  });

  describe("should accept well-formed but semantically invalid tags", () => {
    // The Lexicon spec only requires well-formed syntax. Clients are told to
    // ignore tags they cannot interpret rather than reject the record.
    it.each(readInteropFixture("language_parse_invalid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(true);
    });
  });
});
