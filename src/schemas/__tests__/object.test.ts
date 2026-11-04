import { describe, expect, expectTypeOf, it } from "vitest";
import * as v from "valibot";
import { getTypeName, union } from "../union.js";
import { object } from "../object.js";

describe("object", () => {
  const byteSlice = object("app.bsky.richtext.facet#byteSlice", {
    byteStart: v.pipe(v.number(), v.integer(), v.minValue(0)),
    byteEnd: v.pipe(v.number(), v.integer(), v.minValue(0))
  });

  it("should accept data with or without its $type", () => {
    // Plain references do not carry `$type`, union variants must.
    expect(v.parse(byteSlice, { byteStart: 0, byteEnd: 5 })).toStrictEqual({
      byteStart: 0,
      byteEnd: 5
    });
    const typed = {
      $type: "app.bsky.richtext.facet#byteSlice",
      byteStart: 0,
      byteEnd: 5
    };
    expect(v.parse(byteSlice, typed)).toStrictEqual(typed);
    expectTypeOf(v.parse(byteSlice, typed).$type).toEqualTypeOf<
      "app.bsky.richtext.facet#byteSlice" | undefined
    >();
  });

  it("should reject a different $type", () => {
    expect(
      v.safeParse(byteSlice, {
        $type: "app.bsky.richtext.facet#link",
        byteStart: 0,
        byteEnd: 5
      }).success
    ).toBe(false);
  });

  it("should declare the name union() and toLexicon() look for", () => {
    expect(getTypeName(byteSlice)).toBe("app.bsky.richtext.facet#byteSlice");
    expect(
      v.safeParse(union([byteSlice], { closed: true }), {
        $type: "app.bsky.richtext.facet#byteSlice",
        byteStart: 0,
        byteEnd: 5
      }).success
    ).toBe(true);
  });

  it("should support the strip and strict modes", () => {
    const input = { byteStart: 0, byteEnd: 5, extra: true };
    const entries = { byteStart: v.number(), byteEnd: v.number() };
    expect(v.parse(byteSlice, input)).toStrictEqual(input);
    expect(
      v.parse(object("com.example.slice", entries, { mode: "strip" }), input)
    ).toStrictEqual({ byteStart: 0, byteEnd: 5 });
    expect(
      v.safeParse(
        object("com.example.slice", entries, { mode: "strict" }),
        input
      ).success
    ).toBe(false);
  });
});
