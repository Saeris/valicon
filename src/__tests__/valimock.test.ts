import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { Valimock } from "valimock";
import { readLexiconFixtures } from "./fixtures/lexicons.js";
import { resolvePlaceholder } from "./fixtures/samples.js";
import { compileLexicons } from "../methods/compileLexicon.js";
import {
  CID_REGEX,
  DATETIME_REGEX,
  DID_PLC_REGEX,
  HANDLE_REGEX,
  NSID_REGEX,
  TID_REGEX
} from "../regex.js";
import { lexiconMocks } from "../valimock.js";

describe("lexiconMocks", () => {
  const compiled = compileLexicons(readLexiconFixtures(), {
    resolve: resolvePlaceholder
  });
  const mock = new Valimock({
    customMocks: lexiconMocks,
    seed: 42,
    onWarn: () => {}
  }).mock;

  const schemas = Object.entries(compiled).flatMap(([nsid, defs]) =>
    Object.entries(defs).flatMap(
      ([name, definition]): [string, v.GenericSchema][] =>
        definition.kind === "schema" ? [[`${nsid}#${name}`, definition]] : []
    )
  );

  // Every schema compiled from a real Lexicon must produce mocks that pass
  // its own validation, otherwise the mocks are useless as test data.
  it.each(schemas)("should mock valid data for %s", (_name, schema) => {
    for (let round = 0; round < 3; round++) {
      const value: unknown = mock(schema);
      const result = v.safeParse(schema, value);
      expect(result.issues ?? []).toStrictEqual([]);
    }
  });

  it("should generate realistic identifiers", () => {
    const post = compiled["app.bsky.feed.post"]!.main;
    if (post?.kind !== "schema") {
      throw new Error("expected a schema");
    }
    const value = mock(post) as {
      $type: string;
      createdAt: string;
      reply?: { root: { uri: string; cid: string } };
    };
    expect(value.$type).toBe("app.bsky.feed.post");
    expect(value.createdAt).toMatch(DATETIME_REGEX);
    const schema = v.object({
      did: v.pipe(v.string(), v.regex(DID_PLC_REGEX)),
      handle: v.pipe(v.string(), v.regex(HANDLE_REGEX)),
      nsid: v.pipe(v.string(), v.regex(NSID_REGEX)),
      tid: v.pipe(v.string(), v.regex(TID_REGEX)),
      cid: v.pipe(v.string(), v.regex(CID_REGEX))
    });
    const identifiers = mock(
      v.object({
        did: v.pipe(v.string(), v.regex(DID_PLC_REGEX)),
        handle: v.pipe(v.string(), v.regex(HANDLE_REGEX)),
        nsid: v.pipe(v.string(), v.regex(NSID_REGEX)),
        tid: v.pipe(v.string(), v.regex(TID_REGEX)),
        cid: v.pipe(v.string(), v.regex(CID_REGEX))
      })
    );
    expect(v.safeParse(schema, identifiers).success).toBe(true);
  });

  it("should prefer known values and honor accept lists", () => {
    const labels = compiled["com.atproto.label.defs"]!.labelValue;
    const image = compiled["app.bsky.embed.images"]!.image;
    if (labels?.kind !== "schema" || image?.kind !== "schema") {
      throw new Error("expected schemas");
    }
    expect([
      "!hide",
      "!warn",
      "!no-unauthenticated",
      "porn",
      "sexual",
      "nudity",
      "graphic-media",
      "bot"
    ]).toContain(mock(labels));
    const { image: blob } = mock(image) as {
      image: { mimeType: string; size: number };
    };
    expect(blob.mimeType).toMatch(/^image\//u);
    expect(blob.size).toBeLessThanOrEqual(2_000_000);
  });

  it("should leave plain strings to the default generator", () => {
    const value = mock(v.object({ firstName: v.string() }));
    expect(typeof value.firstName).toBe("string");
    expect(value.firstName.length).toBeGreaterThan(0);
  });
});
