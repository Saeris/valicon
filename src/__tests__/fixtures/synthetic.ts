import type { LexiconDoc } from "../../types/index.js";

/**
 * Hand-written documents that use the Lexicon features the published
 * fixtures happen not to: string and integer enums and constants, byte and
 * grapheme minimums, nullable required fields, open unions without variants,
 * top-level primitive definitions, and XRPC endpoints with every optional
 * part left out or filled in.
 */
export const kitchenSink: LexiconDoc = {
  lexicon: 1,
  id: "com.example.kitchenSink",
  description: "Every Lexicon feature the published fixtures do not use.",
  defs: {
    main: {
      type: "record",
      key: "any",
      record: {
        type: "object",
        required: ["status", "when"],
        nullable: ["note", "when"],
        properties: {
          status: { type: "string", enum: ["draft", "published"] },
          note: { type: "string" },
          kind: { type: "string", const: "note" },
          title: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            minGraphemes: 1,
            maxGraphemes: 50
          },
          "content-type": { type: "string" },
          priority: { type: "integer", enum: [1, 2, 3] },
          version: { type: "integer", const: 1 },
          when: { type: "string", format: "datetime" },
          cover: { type: "blob" },
          payload: { type: "bytes" },
          embed: { type: "union", refs: [] },
          tags: { type: "array", items: { type: "string" }, minLength: 1 }
        }
      }
    },
    history: {
      type: "array",
      items: { type: "ref", ref: "#entry" },
      maxLength: 10
    },
    entry: {
      type: "object",
      properties: { at: { type: "string", format: "datetime" } }
    },
    photo: { type: "blob", accept: ["image/*"], maxSize: 1000 },
    enabled: { type: "boolean" },
    signature: { type: "bytes", minLength: 1, maxLength: 64 },
    link: { type: "cid-link" },
    count: { type: "integer", minimum: 0, maximum: 10 },
    label: { type: "string", description: "A free-form label." },
    anything: { type: "unknown" }
  }
};

export const ping: LexiconDoc = {
  lexicon: 1,
  id: "com.example.ping",
  defs: {
    main: { type: "procedure", description: "Checks that the service is up." }
  }
};

export const count: LexiconDoc = {
  lexicon: 1,
  id: "com.example.count",
  defs: {
    main: {
      type: "query",
      parameters: {
        type: "params",
        required: ["q"],
        properties: {
          q: { type: "string" },
          limit: { type: "integer", default: 10 },
          tags: { type: "array", items: { type: "string" } },
          verbose: { type: "boolean", default: false }
        }
      },
      errors: [{ name: "TooMany" }]
    }
  }
};

export const upload: LexiconDoc = {
  lexicon: 1,
  id: "com.example.upload",
  defs: {
    main: {
      type: "procedure",
      input: { encoding: "*/*", description: "The raw file." },
      output: {
        encoding: "application/json",
        description: "The stored file.",
        schema: { type: "ref", ref: "#result" }
      }
    },
    result: {
      type: "object",
      required: ["cid"],
      properties: { cid: { type: "string", format: "cid" } }
    }
  }
};

export const events: LexiconDoc = {
  lexicon: 1,
  id: "com.example.events",
  defs: {
    main: {
      type: "subscription",
      parameters: {
        type: "params",
        properties: { cursor: { type: "integer" } }
      },
      errors: [{ name: "FutureCursor", description: "The cursor is ahead." }]
    }
  }
};

export const feed: LexiconDoc = {
  lexicon: 1,
  id: "com.example.feed",
  defs: {
    main: {
      type: "subscription",
      message: {
        description: "A feed event.",
        schema: { type: "union", refs: ["#post"] }
      }
    },
    post: {
      type: "object",
      properties: { text: { type: "string" } }
    }
  }
};

export const syntheticLexicons: LexiconDoc[] = [
  kitchenSink,
  ping,
  count,
  upload,
  events,
  feed
];
