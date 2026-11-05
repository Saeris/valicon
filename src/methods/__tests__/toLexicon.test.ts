import { describe, expect, it, vi } from "vitest";
import * as v from "valibot";
import { readLexiconFixture } from "../../__tests__/fixtures/lexicons.js";
import {
  atUri,
  cid,
  datetime,
  did,
  id,
  knownValues,
  language,
  uri
} from "../../actions/index.js";
import { procedure, query, subscription } from "../../definitions/index.js";
import {
  blob,
  object,
  record,
  token,
  union,
  unknown
} from "../../schemas/index.js";
import { toLexicon } from "../toLexicon.js";

/**
 * Minimal stand-ins for definitions from other documents. Only their `$type`
 * matters to toLexicon, which emits references rather than copies.
 */
const strongRef = object("com.atproto.repo.strongRef", {
  uri: v.pipe(v.string(), atUri()),
  cid: v.pipe(v.string(), cid())
});
const facet = object("app.bsky.richtext.facet", {});
const selfLabels = object("com.atproto.label.defs#selfLabels", {});
const embedOption = (name: string) => object(name, {});

describe("toLexicon", () => {
  it("should produce the published app.bsky.feed.post document from hand-written schemas", () => {
    const textSlice = v.pipe(
      object("app.bsky.feed.post#textSlice", {
        start: v.pipe(v.number(), v.integer(), v.minValue(0)),
        end: v.pipe(v.number(), v.integer(), v.minValue(0))
      }),
      v.description(
        "Deprecated. Use app.bsky.richtext instead -- A text segment. Start is inclusive, end is exclusive. Indices are for utf16-encoded strings."
      )
    );
    const entity = v.pipe(
      object("app.bsky.feed.post#entity", {
        index: textSlice,
        type: v.pipe(
          v.string(),
          v.description("Expected values are 'mention' and 'link'.")
        ),
        value: v.string()
      }),
      v.description("Deprecated: use facets instead.")
    );
    const replyRef = object("app.bsky.feed.post#replyRef", {
      root: strongRef,
      parent: strongRef
    });
    const post = v.pipe(
      record(
        "app.bsky.feed.post",
        {
          text: v.pipe(
            v.string(),
            v.maxBytes(3000),
            v.maxGraphemes(300),
            v.description(
              "The primary post content. May be an empty string, if there are embeds."
            )
          ),
          entities: v.optional(
            v.pipe(
              v.array(entity),
              v.description("DEPRECATED: replaced by app.bsky.richtext.facet.")
            )
          ),
          facets: v.optional(
            v.pipe(
              v.array(facet),
              v.description(
                "Annotations of text (mentions, URLs, hashtags, etc)"
              )
            )
          ),
          reply: v.optional(replyRef),
          embed: v.optional(
            union([
              embedOption("app.bsky.embed.images"),
              embedOption("app.bsky.embed.video"),
              embedOption("app.bsky.embed.gallery"),
              embedOption("app.bsky.embed.external"),
              embedOption("app.bsky.embed.record"),
              embedOption("app.bsky.embed.recordWithMedia")
            ])
          ),
          langs: v.optional(
            v.pipe(
              v.array(v.pipe(v.string(), language())),
              v.maxLength(3),
              v.description(
                "Indicates human language of post primary text content."
              )
            )
          ),
          labels: v.optional(
            v.pipe(
              union([selfLabels]),
              v.description(
                "Self-label values for this post. Effectively content warnings."
              )
            )
          ),
          tags: v.optional(
            v.pipe(
              v.array(v.pipe(v.string(), v.maxBytes(640), v.maxGraphemes(64))),
              v.maxLength(8),
              v.description(
                "Additional hashtags, in addition to any included in post text and facets."
              )
            )
          ),
          createdAt: v.pipe(
            v.string(),
            datetime(),
            v.description(
              "Client-declared timestamp when this post was originally created."
            )
          )
        },
        { key: "tid" }
      ),
      v.description("Record containing a Bluesky post.")
    );
    expect(toLexicon(post)).toEqual(readLexiconFixture("app.bsky.feed.post"));
  });

  it("should emit XRPC definitions with params, bodies and errors", () => {
    const createRecord = procedure("com.atproto.repo.createRecord", {
      description: "Create a single new repository record.",
      input: {
        encoding: "application/json",
        schema: v.object({
          repo: v.pipe(v.string(), did()),
          record: unknown(),
          validate: v.optional(v.boolean())
        })
      },
      output: {
        encoding: "application/json",
        schema: v.object({ uri: v.pipe(v.string(), atUri()) })
      },
      errors: [{ name: "InvalidSwap", description: "Stale swapCommit." }]
    });
    const getPosts = query("app.bsky.feed.getPosts", {
      parameters: v.object({
        uris: v.pipe(v.array(v.pipe(v.string(), atUri())), v.maxLength(25)),
        limit: v.optional(v.pipe(v.number(), v.integer(), v.maxValue(100)), 50)
      })
    });
    expect(toLexicon(createRecord).defs.main).toEqual({
      type: "procedure",
      description: "Create a single new repository record.",
      input: {
        encoding: "application/json",
        schema: {
          type: "object",
          required: ["repo", "record"],
          properties: {
            repo: { type: "string", format: "did" },
            record: { type: "unknown" },
            validate: { type: "boolean" }
          }
        }
      },
      output: {
        encoding: "application/json",
        schema: {
          type: "object",
          required: ["uri"],
          properties: { uri: { type: "string", format: "at-uri" } }
        }
      },
      errors: [{ name: "InvalidSwap", description: "Stale swapCommit." }]
    });
    expect(toLexicon(getPosts).defs.main).toEqual({
      type: "query",
      parameters: {
        type: "params",
        required: ["uris"],
        properties: {
          uris: {
            type: "array",
            items: { type: "string", format: "at-uri" },
            maxLength: 25
          },
          limit: { type: "integer", maximum: 100, default: 50 }
        }
      }
    });
  });

  it("should hoist anonymous nested objects into named definitions", () => {
    // Lexicon objects cannot nest, so an inline object becomes a `ref`.
    const doc = toLexicon(
      record("com.example.profile", {
        location: v.object({ city: v.string(), country: v.string() }),
        avatar: v.optional(blob({ accept: ["image/*"], maxSize: 1000 }))
      })
    );
    expect(doc).toEqual({
      lexicon: 1,
      id: "com.example.profile",
      defs: {
        main: {
          type: "record",
          record: {
            type: "object",
            required: ["location"],
            properties: {
              location: { type: "ref", ref: "#location" },
              avatar: { type: "blob", accept: ["image/*"], maxSize: 1000 }
            }
          }
        },
        location: {
          type: "object",
          required: ["city", "country"],
          properties: {
            city: { type: "string" },
            country: { type: "string" }
          }
        }
      }
    });
  });

  it("should convert definition-only documents", () => {
    const labelValue = v.pipe(
      v.string(),
      knownValues(["!hide", "!warn"]),
      id("com.atproto.label.defs#labelValue")
    );
    const doc = toLexicon(
      {
        label: object("com.atproto.label.defs#label", {
          src: v.pipe(v.string(), did()),
          uri: v.pipe(v.string(), uri()),
          neg: v.optional(v.boolean()),
          val: labelValue
        }),
        labelValue,
        confirmed: token("com.atproto.label.defs#confirmed")
      },
      { description: "Label definitions." }
    );
    expect(doc).toEqual({
      lexicon: 1,
      id: "com.atproto.label.defs",
      description: "Label definitions.",
      defs: {
        label: {
          type: "object",
          required: ["src", "uri", "val"],
          properties: {
            src: { type: "string", format: "did" },
            uri: { type: "string", format: "uri" },
            neg: { type: "boolean" },
            val: { type: "ref", ref: "#labelValue" }
          }
        },
        labelValue: { type: "string", knownValues: ["!hide", "!warn"] },
        confirmed: { type: "token" }
      }
    });
  });

  it("should map nullable and defaults", () => {
    const doc = toLexicon(
      record("com.example.thing", {
        since: v.nullable(v.string()),
        status: v.nullish(v.picklist(["a", "b"])),
        limit: v.optional(v.pipe(v.number(), v.integer()), 10),
        on: v.optional(v.boolean(), false),
        flag: v.literal(true)
      })
    );
    expect(doc.defs.main).toEqual({
      type: "record",
      record: {
        type: "object",
        required: ["since", "flag"],
        nullable: ["since", "status"],
        properties: {
          since: { type: "string" },
          status: { type: "string", enum: ["a", "b"] },
          limit: { type: "integer", default: 10 },
          on: { type: "boolean", default: false },
          flag: { type: "boolean", const: true }
        }
      }
    });
  });

  it("should fail loudly for schemas Lexicon cannot express", () => {
    const thing = (entries: v.ObjectEntries) =>
      record("com.example.thing", entries);
    expect(() =>
      toLexicon(thing({ text: v.pipe(v.string(), v.maxLength(10)) }))
    ).toThrow('The "max_length" action counts UTF-16 code units');
    expect(() => toLexicon(thing({ ratio: v.number() }))).toThrow(
      "Lexicon has no floating point type"
    );
    expect(() =>
      toLexicon(thing({ when: v.pipe(v.string(), v.isoTimestamp()) }))
    ).toThrow('The "iso_timestamp" action cannot be converted');
    expect(() =>
      toLexicon(thing({ embed: v.union([v.string(), v.number()]) }))
    ).toThrow(
      'Lexicon unions must be created with the "union" function of Valicon'
    );
    expect(() => toLexicon(v.object({ a: v.string() }))).toThrow(
      "Unable to infer the Lexicon NSID"
    );
  });

  it("should convert the constraints the published fixtures never use", () => {
    const shared = v.object({ city: v.string() });
    const doc = toLexicon(
      record("com.example.kitchen", {
        slug: v.pipe(
          v.string(),
          v.nonEmpty(),
          v.minBytes(2),
          v.minGraphemes(1)
        ),
        status: v.pipe(v.string(), v.values(["draft", "live"])),
        kind: v.pipe(v.string(), v.value("note")),
        priority: v.pipe(v.number(), v.integer(), v.values([1, 2, 3])),
        version: v.pipe(v.number(), v.integer(), v.value(1)),
        one: v.literal(1),
        yes: v.pipe(v.boolean(), v.value(true)),
        level: v.picklist([1, 2]),
        anything: v.any(),
        bag: v.record(v.string(), v.unknown()),
        strict: v.strictObject({ a: v.string() }),
        loose: v.looseObject({ b: v.string() }),
        home: shared,
        work: shared,
        name: v.optional(v.string(), () => "anon"),
        tags: v.pipe(v.array(v.string()), v.nonEmpty())
      })
    );
    expect(doc.defs).toEqual({
      main: {
        type: "record",
        record: {
          type: "object",
          required: [
            "slug",
            "status",
            "kind",
            "priority",
            "version",
            "one",
            "yes",
            "level",
            "anything",
            "bag",
            "strict",
            "loose",
            "home",
            "work",
            "tags"
          ],
          properties: {
            slug: { type: "string", minLength: 2, minGraphemes: 1 },
            status: { type: "string", enum: ["draft", "live"] },
            kind: { type: "string", const: "note" },
            priority: { type: "integer", enum: [1, 2, 3] },
            version: { type: "integer", const: 1 },
            one: { type: "integer", const: 1 },
            yes: { type: "boolean", const: true },
            level: { type: "integer", enum: [1, 2] },
            anything: { type: "unknown" },
            bag: { type: "unknown" },
            strict: { type: "ref", ref: "#strict" },
            loose: { type: "ref", ref: "#loose" },
            // A schema used twice is hoisted once and referenced twice.
            home: { type: "ref", ref: "#home" },
            work: { type: "ref", ref: "#home" },
            name: { type: "string", default: "anon" },
            tags: { type: "array", items: { type: "string" }, minLength: 1 }
          }
        }
      },
      strict: {
        type: "object",
        required: ["a"],
        properties: { a: { type: "string" } }
      },
      loose: {
        type: "object",
        required: ["b"],
        properties: { b: { type: "string" } }
      },
      home: {
        type: "object",
        required: ["city"],
        properties: { city: { type: "string" } }
      }
    });
  });

  it("should suffix hoisted names that collide", () => {
    // Two different anonymous objects under the same property name must
    // become two definitions, not one overwriting the other.
    const doc = toLexicon(
      record("com.example.thing", {
        first: v.object({ item: v.object({ a: v.string() }) }),
        second: v.object({ item: v.object({ b: v.string() }) })
      })
    );
    expect(Object.keys(doc.defs)).toStrictEqual([
      "main",
      "first",
      "second",
      "item",
      "item2"
    ]);
    expect(doc.defs.first).toMatchObject({
      properties: { item: { type: "ref", ref: "#item" } }
    });
    expect(doc.defs.second).toMatchObject({
      properties: { item: { type: "ref", ref: "#item2" } }
    });
  });

  it("should infer the NSID from a token", () => {
    expect(
      toLexicon({ confirmed: token("com.atproto.label.defs#confirmed") }).id
    ).toBe("com.atproto.label.defs");
  });

  it("should fail loudly for more schemas Lexicon cannot express", () => {
    const thing = (entries: v.ObjectEntries) =>
      record("com.example.thing", entries);
    const cases: [v.ObjectEntries, string][] = [
      [
        { grid: v.array(v.array(v.string())) },
        "Lexicon arrays cannot be nested."
      ],
      [
        { list: v.pipe(v.array(v.string()), v.includes("a")) },
        'The "includes" action cannot be converted'
      ],
      [{ big: v.literal(1n) }, 'The "literal" schema cannot be converted'],
      [
        { mixed: v.picklist(["a", 1]) },
        'The "picklist" schema cannot be converted'
      ],
      [{ when: v.date() }, 'The "date" schema cannot be converted'],
      [
        { kind: token("com.example.defs#kind") },
        "Tokens cannot be used as properties"
      ],
      [
        { embed: v.variant("$type", [v.object({ $type: v.literal("a") })]) },
        'Lexicon unions must be created with the "union" function'
      ]
    ];
    for (const [entries, message] of cases) {
      expect(() => toLexicon(thing(entries))).toThrow(message);
    }
    expect(() =>
      toLexicon(
        v.pipe(v.string(), v.metadata({ lexicon: { type: "record" } })),
        { id: "com.example.thing" }
      )
    ).toThrow("Records must wrap an object schema.");
    expect(() =>
      toLexicon(
        { embed: union([v.object({ $type: v.literal("com.example.a") })]) },
        { id: "com.example.thing" }
      )
    ).toThrow('The definition "embed" cannot be a reference or union.');
  });

  it("should report actions whose requirement is not what Lexicon expects", () => {
    // Another tool could build a schema that reuses Valibot action types
    // with a different requirement shape. Those must be reported rather
    // than silently dropped from the document.
    const bogus = (type: string) =>
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      ({ kind: "validation", type, requirement: Symbol("bogus") }) as never;
    const cases: [v.GenericSchema, string][] = [
      [v.string(), "min_bytes"],
      [v.string(), "max_bytes"],
      [v.string(), "min_graphemes"],
      [v.string(), "max_graphemes"],
      [v.string(), "values"],
      [v.string(), "value"],
      [v.pipe(v.number(), v.integer()), "min_value"],
      [v.pipe(v.number(), v.integer()), "max_value"],
      [v.pipe(v.number(), v.integer()), "values"],
      [v.pipe(v.number(), v.integer()), "value"],
      [v.array(v.string()), "min_length"],
      [v.array(v.string()), "max_length"]
    ];
    for (const [schema, type] of cases) {
      expect(() =>
        toLexicon(
          record("com.example.thing", { x: v.pipe(schema, bogus(type)) })
        )
      ).toThrow(`The "${type}" action cannot be converted`);
    }
  });

  it("should describe parameters and allow unknown array items", () => {
    const doc = toLexicon(
      query("com.example.q", {
        parameters: v.pipe(
          v.object({ raw: v.array(v.unknown()) }),
          v.description("Filters.")
        )
      })
    );
    expect(doc.defs.main).toEqual({
      type: "query",
      parameters: {
        type: "params",
        description: "Filters.",
        required: ["raw"],
        properties: { raw: { type: "array", items: { type: "unknown" } } }
      }
    });
  });

  it("should fail loudly for XRPC shapes Lexicon cannot express", () => {
    const params = (entries: v.ObjectEntries) =>
      query("com.example.q", { parameters: v.object(entries) });
    expect(() => toLexicon(params({ since: v.nullable(v.string()) }))).toThrow(
      "XRPC parameters cannot be nullable."
    );
    expect(() =>
      toLexicon(params({ tags: v.optional(v.array(v.string()), () => []) }))
    ).toThrow(
      'Only string, integer and boolean properties can have a default value, not "tags".'
    );
    expect(() =>
      toLexicon(params({ filter: v.object({ a: v.string() }) }))
    ).toThrow(
      'XRPC parameters can only be primitives or arrays of primitives, not "filter".'
    );
    expect(() =>
      toLexicon(query("com.example.q", { parameters: v.string() }))
    ).toThrow("XRPC parameters must be an object schema.");
    expect(() =>
      toLexicon(
        query("com.example.q", {
          output: { encoding: "application/json", schema: v.string() }
        })
      )
    ).toThrow(
      'XRPC bodies must be an object, a reference or a union schema, not "output".'
    );
    expect(() =>
      toLexicon(
        subscription("com.example.s", {
          message: { schema: v.object({ a: v.string() }) }
        })
      )
    ).toThrow("Subscription messages must be a union schema.");
  });

  it("should stay silent when errorMode is ignore", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const doc = toLexicon(
        record("com.example.thing", { ratio: v.number() }),
        {
          errorMode: "ignore"
        }
      );
      expect(doc.defs.main).toMatchObject({ type: "record" });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("should only warn when errorMode is warn", () => {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (message: string) => warnings.push(message);
    try {
      const doc = toLexicon(
        record("com.example.thing", { ratio: v.number() }),
        {
          errorMode: "warn"
        }
      );
      expect(doc.defs.main).toMatchObject({ type: "record" });
      expect(warnings).toHaveLength(1);
    } finally {
      console.warn = original;
    }
  });
});
