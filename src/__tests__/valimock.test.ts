import { faker } from "@faker-js/faker";
import { describe, expect, it, vi } from "vitest";
import * as v from "valibot";
import { Valimock } from "valimock";
import {
  atIdentifier,
  atUri,
  cid,
  datetime,
  did,
  didPlc,
  didWeb,
  handle,
  language,
  nsid,
  recordKey,
  tid,
  uri
} from "../actions/index.js";
import { readLexiconFixtures } from "./fixtures/lexicons.js";
import { resolvePlaceholder } from "./fixtures/samples.js";
import { compileLexicons } from "../methods/compileLexicon.js";
import { bytes } from "../schemas/bytes.js";
import {
  CID_REGEX,
  DATETIME_REGEX,
  DID_PLC_REGEX,
  HANDLE_REGEX,
  NSID_REGEX,
  TID_REGEX
} from "../regex.js";
import { union } from "../schemas/union.js";
import {
  lexiconMocks,
  mockCid,
  mockHandle,
  mockMimeType,
  mockNsid
} from "../valimock.js";

describe("lexiconMocks", () => {
  const compiled = compileLexicons(readLexiconFixtures(), {
    resolve: resolvePlaceholder
  });
  const warnings: string[] = [];
  const mock = new Valimock({
    ...lexiconMocks,
    seed: 42,
    onWarn: (warning) => warnings.push(warning)
  }).mock;

  const schemas = Object.entries(compiled).flatMap(([nsid, defs]) =>
    Object.entries(defs).flatMap(
      ([name, definition]): [string, v.GenericSchema][] =>
        definition.kind === "schema" ? [[`${nsid}#${name}`, definition]] : []
    )
  );

  // Every schema compiled from a real Lexicon must produce mocks that pass
  // its own validation, otherwise the mocks are useless as test data. A
  // warning means Valimock exhausted its retry budget on some field, which
  // is both a generator that disagrees with the schema and the slow path
  // that made this suite time out.
  it.each(schemas)("should mock valid data for %s", (_name, schema) => {
    warnings.length = 0;
    for (let round = 0; round < 3; round++) {
      const value: unknown = mock(schema);
      const result = v.safeParse(schema, value);
      expect(result.issues ?? []).toStrictEqual([]);
    }
    expect(warnings).toStrictEqual([]);
  });

  it("should keep bytes mocks small and within Lexicon limits", () => {
    // `com.atproto.sync.subscribeRepos#commit` allows a 2 MB CAR file. A mock
    // that size is useless as test data and far exceeds Valimock's string
    // bound, which it would then retry sixteen times per field.
    warnings.length = 0;
    const large = mock(bytes({ maxLength: 2_000_000 }));
    expect(large.$bytes.length).toBeLessThanOrEqual(128);
    // A minimum above the string bound must still be honored rather than
    // reported as unsatisfiable.
    const small = mock(bytes({ minLength: 200, maxLength: 300 }));
    expect(small.$bytes.length).toBeGreaterThanOrEqual(
      Math.ceil((200 * 4) / 3)
    );
    expect(
      v.safeParse(bytes({ minLength: 200, maxLength: 300 }), small).success
    ).toBe(true);
    expect(warnings).toStrictEqual([]);
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

  it("should mock every format action", () => {
    const formats: Record<string, () => v.GenericValidation<string>> = {
      atIdentifier,
      atUri,
      cid,
      datetime,
      did,
      didPlc,
      didWeb,
      handle,
      language,
      nsid,
      recordKey,
      tid,
      uri
    };
    for (const [name, format] of Object.entries(formats)) {
      const schema = v.pipe(v.string(), format());
      // Every top-level mock call reseeds, so one call for a batch of
      // values exercises the generator's own variety.
      for (const value of mock(v.pipe(v.array(schema), v.length(20)))) {
        expect(v.safeParse(schema, value).success, `${name}: ${value}`).toBe(
          true
        );
      }
    }
  });

  it("should pick MIME types that satisfy accept lists", () => {
    const mimeType = /^[a-z]+\/\S+$/u;
    expect(mockMimeType(faker, [])).toMatch(mimeType);
    expect(mockMimeType(faker, ["*/*"])).toMatch(mimeType);
    expect(mockMimeType(faker, ["image/*"])).toMatch(/^image\//u);
    // Groups Valicon has no examples for still get a type of the right kind.
    expect(mockMimeType(faker, ["font/*"])).toMatch(/^font\/\S+$/u);
    expect(mockMimeType(faker, ["application/json"])).toBe("application/json");
  });

  it("should generate CIDs for both atproto codecs", () => {
    // Records and commits are dag-cbor, blobs are raw bytes, and the codec
    // is visible in the CID prefix.
    expect(mockCid(faker)).toMatch(/^bafyrei/u);
    expect(mockCid(faker, "raw")).toMatch(/^bafkrei/u);
    expect(mockCid(faker, "raw")).toMatch(CID_REGEX);
  });

  it("should never produce an empty handle label or NSID segment", () => {
    // Faker words can consist entirely of characters a handle label or an
    // NSID segment cannot contain, so the generators must substitute a
    // placeholder rather than emit an invalid identifier.
    const username = vi
      .spyOn(faker.internet, "username")
      .mockReturnValue("___");
    const noun = vi.spyOn(faker.word, "noun").mockReturnValue("ÉTÉ");
    try {
      expect(mockHandle(faker)).toMatch(/^user\./u);
      expect(mockHandle(faker)).toMatch(HANDLE_REGEX);
      expect(mockNsid(faker)).toContain(".feed.");
      expect(mockNsid(faker)).toMatch(NSID_REGEX);
    } finally {
      username.mockRestore();
      noun.mockRestore();
    }
  });

  it("should tolerate hand-built actions without a requirement", () => {
    // Valimock dispatches on the action type alone, so a schema built by
    // another tool may carry a Valicon action type without its requirement.
    const bare = (type: string) =>
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      ({
        kind: "validation",
        type,
        async: false
      }) as v.GenericValidation<string>;
    for (const type of ["accept", "min_decoded_bytes", "max_decoded_bytes"]) {
      const value = mock(v.pipe(v.string(), bare(type)));
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("should require Valimock 1.7 so the lazy mock can recurse", () => {
    const lazy = lexiconMocks.customMocks?.lazy;
    if (!lazy) {
      throw new Error("expected a lazy mock");
    }
    expect(() => lazy(v.lazy(() => v.string()))).toThrow(
      "Valimock 1.7 or newer"
    );
  });

  it("should fail loudly for lazy schemas that resolve to nothing", () => {
    const lazy = lexiconMocks.customMocks?.lazy;
    if (!lazy) {
      throw new Error("expected a lazy mock");
    }
    const instance = new Valimock({ ...lexiconMocks, seed: 42 });
    expect(() => lazy(v.string(), instance.options, instance.mock)).toThrow(
      "Unable to resolve lazy schema"
    );
    expect(() =>
      lazy(
        v.lazy(() => null as never),
        instance.options,
        instance.mock
      )
    ).toThrow("Unable to resolve lazy schema");
  });

  it("should stamp $type on whatever a variant mock returns", () => {
    const lazy = lexiconMocks.customMocks?.lazy;
    if (!lazy) {
      throw new Error("expected a lazy mock");
    }
    const instance = new Valimock({ ...lexiconMocks, seed: 42 });
    const embed = union([
      v.looseObject({ $type: v.literal("com.example.embed") })
    ]);
    expect(lazy(embed, instance.options, () => "not an object")).toStrictEqual({
      $type: "com.example.embed"
    });
  });

  it("should leave plain strings to the default generator", () => {
    const value = mock(v.object({ firstName: v.string() }));
    expect(typeof value.firstName).toBe("string");
    expect(value.firstName.length).toBeGreaterThan(0);
  });
});
