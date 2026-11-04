import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { readInteropFixture } from "../../__tests__/fixtures/interop.js";
import { datetime } from "../datetime.js";

describe("datetime", () => {
  const schema = v.pipe(v.string(), datetime());

  it("should return action object", () => {
    expect(datetime("message")).toMatchObject({
      kind: "validation",
      type: "datetime",
      reference: datetime,
      expects: null,
      async: false,
      message: "message"
    });
  });

  describe("should accept valid interop datetimes", () => {
    it.each(readInteropFixture("datetime_syntax_valid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(true);
    });
  });

  describe("should reject syntactically invalid interop datetimes", () => {
    it.each(readInteropFixture("datetime_syntax_invalid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(false);
    });
  });

  describe("should reject semantically invalid interop datetimes", () => {
    // These match the grammar but describe impossible instants, such as a
    // 13th month. Only parsing the value catches them.
    it.each(readInteropFixture("datetime_parse_invalid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(false);
    });
  });

  it("should accept the output of toISOString", () => {
    expect(v.safeParse(schema, new Date().toISOString()).success).toBe(true);
  });
});
