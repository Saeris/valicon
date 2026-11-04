import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { unknown } from "../unknown.js";

describe("unknown", () => {
  const schema = unknown();

  it("should accept any object and keep every property", () => {
    // Unknown fields hold records of arbitrary collections, which must pass
    // through untouched so the caller can validate them against their own
    // Lexicon afterwards.
    const record = { $type: "com.example.thing", nested: { deep: [1, 2] } };
    expect(v.parse(schema, record)).toStrictEqual(record);
  });

  it("should reject non-object values, unlike v.unknown()", () => {
    expect(v.safeParse(schema, "string").success).toBe(false);
    expect(v.safeParse(schema, 42).success).toBe(false);
    expect(v.safeParse(schema, null).success).toBe(false);
  });
});
