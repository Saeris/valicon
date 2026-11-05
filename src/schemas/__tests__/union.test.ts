import { describe, expect, expectTypeOf, it } from "vitest";
import * as v from "valibot";
import { getLexiconMetadata } from "../../utils/index.js";
import { getUnionOptions, union } from "../union.js";

describe("union", () => {
  const images = v.looseObject({
    $type: v.optional(v.literal("app.bsky.embed.images")),
    images: v.array(v.object({ alt: v.string() }))
  });
  const external = v.looseObject({
    $type: v.optional(v.literal("app.bsky.embed.external")),
    external: v.object({ uri: v.string() })
  });

  describe("open union", () => {
    const embed = union([images, external]);

    it("should dispatch on $type", () => {
      const value = { $type: "app.bsky.embed.images", images: [{ alt: "a" }] };
      expect(v.parse(embed, value)).toStrictEqual(value);
      // Open unions may carry any `$type`, so the type widens to string.
      expectTypeOf(v.parse(embed, value).$type).toEqualTypeOf<string>();
    });

    it("should accept unknown variants so Lexicons can evolve", () => {
      const value = { $type: "app.bsky.embed.video", video: {} };
      expect(v.parse(embed, value)).toStrictEqual(value);
    });

    it("should still validate known variants strictly", () => {
      // An open union is not a loophole: a known `$type` with a bad body must
      // fail rather than fall through to the unknown-variant branch.
      expect(
        v.safeParse(embed, { $type: "app.bsky.embed.images", images: "no" })
          .success
      ).toBe(false);
    });

    it("should require $type even though the options declare it optional", () => {
      expect(v.safeParse(embed, { images: [] }).success).toBe(false);
      expect(v.safeParse(embed, "app.bsky.embed.images").success).toBe(false);
    });
  });

  describe("closed union", () => {
    const embed = union([images, external], { closed: true });

    it("should reject unknown variants", () => {
      expect(
        v.safeParse(embed, { $type: "app.bsky.embed.video" }).success
      ).toBe(false);
      expect(
        v.safeParse(embed, {
          $type: "app.bsky.embed.external",
          external: { uri: "x" }
        }).success
      ).toBe(true);
    });

    it("should narrow $type to the declared variants", () => {
      const value = { $type: "app.bsky.embed.images", images: [] };
      expectTypeOf(v.parse(embed, value).$type).toEqualTypeOf<
        "app.bsky.embed.external" | "app.bsky.embed.images"
      >();
    });

    it("should carry the closed flag as Lexicon metadata", () => {
      expect(getLexiconMetadata(embed)).toStrictEqual({
        type: "union",
        closed: true
      });
    });
  });

  it("should support self-referencing options through lazy schemas", () => {
    // Thread views reference themselves in their replies, which is the
    // reason unions are built lazily.
    interface ThreadView {
      $type?: "com.example.thread#view" | undefined;
      replies?: ThreadView[] | undefined;
    }
    const view: v.GenericSchema<ThreadView> = v.object({
      $type: v.optional(v.literal("com.example.thread#view")),
      replies: v.optional(
        v.array(union([v.lazy(() => view)], { closed: true }))
      )
    });
    const value = {
      $type: "com.example.thread#view",
      replies: [{ $type: "com.example.thread#view", replies: [] }]
    };
    expect(v.parse(view, value)).toStrictEqual(value);
    expect(getUnionOptions(union([v.lazy(() => view)]))).toHaveLength(1);
  });

  it("should accept every object schema flavor as an option", () => {
    const strict = v.strictObject({ $type: v.literal("com.example.a") });
    const rest = v.objectWithRest(
      { $type: v.literal("com.example.b") },
      v.unknown()
    );
    const schema = union([strict, rest], { closed: true });
    expect(v.parse(schema, { $type: "com.example.a" })).toStrictEqual({
      $type: "com.example.a"
    });
    expect(v.parse(schema, { $type: "com.example.b", extra: 1 })).toStrictEqual(
      { $type: "com.example.b", extra: 1 }
    );
    expect(getUnionOptions(schema)).toHaveLength(2);
  });

  it("should accept any variant in an open union without options", () => {
    // The Lexicon spec allows an open union with an empty `refs` list as a
    // placeholder for variants that will be defined later.
    const anything = union([]);
    expect(v.parse(anything, { $type: "com.example.later" })).toStrictEqual({
      $type: "com.example.later"
    });
    expect(v.safeParse(anything, {}).success).toBe(false);
  });

  it("should fail loudly for lazy options that are not object schemas", () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const text = v.lazy(() => v.string()) as never;
    expect(() => v.parse(union([text]), { $type: "x" })).toThrow(
      "Union options must be object schemas"
    );
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const nothing = v.lazy(() => null as never) as never;
    expect(() => v.parse(union([nothing]), { $type: "x" })).toThrow(
      "Lazy union options must resolve to a schema"
    );
  });

  it("should report no options for values that are not schemas", () => {
    expect(getUnionOptions({})).toStrictEqual([]);
  });

  it("should fail loudly for options without a $type literal", () => {
    const broken = union([v.looseObject({ name: v.string() })]);
    expect(() => v.parse(broken, { name: "x" })).toThrow(
      "Union options must declare a `$type` entry"
    );
  });
});
