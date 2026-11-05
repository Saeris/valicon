import { describe, expect, it } from "vitest";
import * as v from "valibot";
import {
  readLexiconFixture,
  readLexiconFixtures
} from "../../__tests__/fixtures/lexicons.js";
import {
  resolvePlaceholder,
  sampleCid,
  samplePost
} from "../../__tests__/fixtures/samples.js";
import type { LexiconDoc } from "../../types/index.js";
import { compileLexicon, compileLexicons } from "../compileLexicon.js";

const endpoint: LexiconDoc = {
  lexicon: 1,
  id: "com.example.endpoint",
  defs: { main: { type: "query" } }
};

function mainSchema(
  compiled: Record<string, Record<string, unknown>>,
  nsid: string
): v.GenericSchema {
  const main = compiled[nsid]?.main;
  if (typeof main !== "object" || main === null || !("kind" in main)) {
    throw new Error(`${nsid} did not compile`);
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return main as v.GenericSchema;
}

describe("compileLexicon", () => {
  const compiled = compileLexicons(readLexiconFixtures(), {
    resolve: resolvePlaceholder
  });

  function schema(nsid: string, name = "main"): v.GenericSchema {
    const definition = compiled[nsid]?.[name];
    if (definition?.kind !== "schema") {
      throw new Error(`${nsid}#${name} is not a schema`);
    }
    return definition;
  }

  it("should validate a realistic post record", () => {
    expect(v.parse(schema("app.bsky.feed.post"), samplePost)).toStrictEqual(
      samplePost
    );
  });

  it("should enforce the Lexicon constraints of a post", () => {
    const post = schema("app.bsky.feed.post");
    const failures = [
      // maxGraphemes: 300
      { ...samplePost, text: "a".repeat(301) },
      // maxLength: 3000 bytes, 4 bytes per emoji
      { ...samplePost, text: "😀".repeat(751) },
      // datetime format
      { ...samplePost, createdAt: "2024-01-15 12:30:00" },
      // langs maxLength: 3
      { ...samplePost, langs: ["en", "de", "fr", "es"] },
      // language format
      { ...samplePost, langs: ["en_US"] },
      // required
      { ...samplePost, text: void 0 },
      // $type
      { ...samplePost, $type: "app.bsky.feed.like" },
      // known union variant with invalid body
      { ...samplePost, embed: { $type: "app.bsky.embed.images", images: "x" } },
      // strongRef cid format
      {
        ...samplePost,
        reply: {
          ...samplePost.reply,
          root: { ...samplePost.reply.root, cid: "x" }
        }
      }
    ];
    for (const failure of failures) {
      expect(v.safeParse(post, failure).success).toBe(false);
    }
    // Unknown embed variants are accepted because the union is open.
    expect(
      v.safeParse(post, {
        ...samplePost,
        embed: { $type: "app.bsky.embed.future", data: 1 }
      }).success
    ).toBe(true);
  });

  it("should validate query parameters with defaults", () => {
    const doc = readLexiconFixture("app.bsky.feed.getPosts");
    const { main } = compileLexicon(doc);
    if (main?.kind !== "definition" || main.type !== "query") {
      throw new Error("expected a query");
    }
    expect(main.id).toBe("app.bsky.feed.getPosts");
    expect(
      v.safeParse(main.parameters!, {
        uris: [
          "at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3jzfcijpj2z2a"
        ]
      }).success
    ).toBe(true);
    expect(v.safeParse(main.parameters!, { uris: ["nope"] }).success).toBe(
      false
    );
    expect(v.safeParse(main.parameters!, {}).success).toBe(false);
  });

  it("should validate firehose messages against the subscription union", () => {
    const { main } = compiled["com.atproto.sync.subscribeRepos"]!;
    if (main?.kind !== "definition" || main.type !== "subscription") {
      throw new Error("expected a subscription");
    }
    const message = main.message!.schema;
    expect(
      v.safeParse(message, {
        $type: "com.atproto.sync.subscribeRepos#identity",
        seq: 1,
        did: "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
        time: "2024-01-15T12:30:00.000Z",
        handle: "alice.test"
      }).success
    ).toBe(true);
    // A known message type with a missing required field must fail, even
    // though the message union is open.
    expect(
      v.safeParse(message, {
        $type: "com.atproto.sync.subscribeRepos#identity",
        seq: 1,
        did: "did:plc:ewvi7nxzyoun6zhxrhs64oiz"
      }).success
    ).toBe(false);
    expect(
      v.safeParse(schema("com.atproto.sync.subscribeRepos", "repoOp"), {
        action: "delete",
        path: "app.bsky.feed.post/3jzfcijpj2z2a",
        cid: null,
        prev: { $link: sampleCid("dag-cbor") }
      }).success
    ).toBe(true);
  });

  it("should fail lazily for unresolved references", () => {
    const { main } = compileLexicon(readLexiconFixture("app.bsky.feed.post"));
    if (main?.kind !== "schema") {
      throw new Error("expected a schema");
    }
    expect(() => v.parse(main, samplePost)).toThrow(
      'Unresolved reference "app.bsky.richtext.facet"'
    );
  });

  it("should reject references to XRPC definitions", () => {
    // Queries, procedures and subscriptions describe endpoints, not data, so
    // nothing can reference them, whether locally or from another document.
    const local: LexiconDoc = {
      lexicon: 1,
      id: "com.example.local",
      defs: {
        main: { type: "query" },
        thing: {
          type: "object",
          properties: { ref: { type: "ref", ref: "#main" } }
        }
      }
    };
    expect(() => compileLexicon(local)).toThrow(
      'Cannot reference the XRPC definition "#main"'
    );
    const remote: LexiconDoc = {
      lexicon: 1,
      id: "com.example.remote",
      defs: {
        main: {
          type: "object",
          properties: { ref: { type: "ref", ref: "com.example.endpoint" } }
        }
      }
    };
    const main = mainSchema(
      compileLexicons([endpoint, remote]),
      "com.example.remote"
    );
    expect(() => v.parse(main, { ref: {} })).toThrow(
      'Cannot reference the XRPC definition "com.example.endpoint"'
    );
  });

  it("should fail for references that cannot be resolved", () => {
    const doc: LexiconDoc = {
      lexicon: 1,
      id: "com.example.dangling",
      defs: {
        main: {
          type: "object",
          properties: {
            missingDoc: { type: "ref", ref: "com.example.missing" },
            missingDef: { type: "ref", ref: "com.example.endpoint#missing" }
          }
        }
      }
    };
    const main = mainSchema(
      compileLexicons([endpoint, doc]),
      "com.example.dangling"
    );
    expect(() => v.parse(main, { missingDoc: {} })).toThrow(
      'Unresolved reference "com.example.missing"'
    );
    expect(() => v.parse(main, { missingDef: {} })).toThrow(
      'Unresolved reference "com.example.endpoint#missing"'
    );
  });

  it("should respect the object mode", () => {
    const { main } = compileLexicon(
      readLexiconFixture("app.bsky.graph.follow"),
      {
        objectMode: "strict"
      }
    );
    if (main?.kind !== "schema") {
      throw new Error("expected a schema");
    }
    expect(
      v.safeParse(main, {
        $type: "app.bsky.graph.follow",
        subject: "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
        createdAt: "2024-01-15T12:30:00.000Z",
        extra: true
      }).success
    ).toBe(false);
  });
});
