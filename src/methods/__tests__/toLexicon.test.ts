import { describe, expect, it } from "vitest";
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
import { procedure, query } from "../../definitions/index.js";
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
