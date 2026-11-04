import { describe, expect, expectTypeOf, it } from "vitest";
import * as v from "valibot";
import { datetime } from "../../actions/index.js";
import { getLexiconMetadata } from "../../utils/index.js";
import { record } from "../record.js";

describe("record", () => {
  const follow = record(
    "app.bsky.graph.follow",
    {
      subject: v.string(),
      createdAt: v.pipe(v.string(), datetime())
    },
    { key: "tid" }
  );

  it("should validate like the wrapped object schema", () => {
    const value = {
      $type: "app.bsky.graph.follow",
      subject: "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
      createdAt: "2024-01-15T12:30:00.000Z"
    };
    expect(v.parse(follow, value)).toStrictEqual(value);
    expectTypeOf(
      v.parse(follow, value).$type
    ).toEqualTypeOf<"app.bsky.graph.follow">();
  });

  it("should require the $type of the record", () => {
    // Records must always carry `$type`, which is how a PDS knows which
    // Lexicon to validate them against.
    expect(
      v.safeParse(follow, {
        subject: "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
        createdAt: "2024-01-15T12:30:00.000Z"
      }).success
    ).toBe(false);
    expect(
      v.safeParse(follow, {
        $type: "app.bsky.graph.block",
        subject: "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
        createdAt: "2024-01-15T12:30:00.000Z"
      }).success
    ).toBe(false);
  });

  it("should keep unknown fields unless a stricter mode is chosen", () => {
    const value = {
      $type: "app.bsky.graph.follow",
      subject: "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
      createdAt: "2024-01-15T12:30:00.000Z",
      via: "future"
    };
    expect(v.parse(follow, value)).toStrictEqual(value);
    const strict = record(
      "app.bsky.graph.follow",
      { subject: v.string() },
      { mode: "strict" }
    );
    expect(v.safeParse(strict, value).success).toBe(false);
    const strip = record(
      "app.bsky.graph.follow",
      { subject: v.string() },
      { mode: "strip" }
    );
    expect(v.parse(strip, value)).toStrictEqual({
      $type: "app.bsky.graph.follow",
      subject: "did:plc:ewvi7nxzyoun6zhxrhs64oiz"
    });
  });

  it("should carry the key scheme as Lexicon metadata", () => {
    expect(getLexiconMetadata(follow)).toStrictEqual({
      type: "record",
      key: "tid"
    });
  });
});
