<div align="center">

# 🌡 Valicon

[![npm version][npm_badge]][npm]
[![CI status][ci_badge]][ci]

[Valibot](https://valibot.dev) schemas, codegen and mocks for [AT Protocol Lexicons](https://atproto.com/specs/lexicon)

</div>

---

Lexicons are the machine-readable schemas behind every atproto record and API endpoint. They are great as an interchange format and tedious to maintain by hand. Valicon lets you describe records, request parameters and responses as ordinary Valibot schemas, with the atproto-specific pieces (DIDs, handles, TIDs, blobs, open unions, ...) covered by small composable functions, and converts in both directions:

- **Validate** atproto data with Lexicon-aware actions such as `did()`, `handle()`, `atUri()` and `datetime()`, each documented inline so the rules are a hover away in your editor.
- **`toLexicon()`** turns your Valibot schemas into a publishable Lexicon document.
- **`fromLexicon()`** generates Valibot source code from existing Lexicons, and **`compileLexicon()`** does the same at runtime without a build step.
- **`@saeris/valicon/valimock`** teaches [Valimock](https://github.com/Saeris/valimock) to generate realistic mock records.

Everything is a plain function with no side effects, so bundlers only keep what you import.

## 📦 Installation

```bash
vp add valibot @saeris/valicon
```

Valimock and Faker are optional peer dependencies, only needed for `@saeris/valicon/valimock`:

```bash
vp add -D valimock @faker-js/faker
```

## 🔧 Usage

### Validating atproto data

Lexicon string formats are Valibot actions. Pipe them after `v.string()` exactly like `v.email()`:

```ts
import * as v from "valibot";
import * as lex from "@saeris/valicon";

const follow = v.object({
  $type: v.literal("app.bsky.graph.follow"),
  subject: v.pipe(v.string(), lex.did()),
  createdAt: v.pipe(v.string(), lex.datetime())
});

v.parse(follow, {
  $type: "app.bsky.graph.follow",
  subject: "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
  createdAt: "2024-01-15T12:30:00.000Z"
});
```

| Action           | Lexicon format  | Validates                                                       |
| ---------------- | --------------- | --------------------------------------------------------------- |
| `did()`          | `did`           | Any W3C DID, at most 2048 characters                            |
| `didPlc()`       |                 | `did:plc:` identifiers (24 base32 characters)                   |
| `didWeb()`       |                 | `did:web:` hostname identifiers                                 |
| `handle()`       | `handle`        | A domain name handle such as `alice.bsky.social`                |
| `atIdentifier()` | `at-identifier` | A DID or a handle                                               |
| `nsid()`         | `nsid`          | A namespaced identifier such as `app.bsky.feed.post`            |
| `tid()`          | `tid`           | A 13 character timestamp identifier                             |
| `recordKey()`    | `record-key`    | A record key                                                    |
| `atUri()`        | `at-uri`        | `at://` URIs in the restricted Lexicon form                     |
| `cid()`          | `cid`           | CIDs allowed by the atproto data model (CIDv1, base32, sha-256) |
| `datetime()`     | `datetime`      | RFC 3339 and ISO 8601 timestamps with a timezone                |
| `language()`     | `language`      | Well-formed BCP 47 language tags                                |
| `uri()`          | `uri`           | Any URI with a scheme                                           |
| `accept()`       |                 | A MIME type against an `accept` list such as `["image/*"]`      |
| `knownValues()`  | `knownValues`   | Nothing. Records suggested values as metadata                   |
| `id()`           |                 | Nothing. Names a non-object definition so it can be referenced  |

The underlying regexes are exported too (`DID_REGEX`, `HANDLE_REGEX`, ...), as is `parseAtUri()`.

Lexicon types that have no Valibot equivalent are schemas:

| Schema      | Lexicon type | Accepts                                                                             |
| ----------- | ------------ | ----------------------------------------------------------------------------------- |
| `blob()`    | `blob`       | `{ $type: "blob", ref: { $link }, mimeType, size }` with `accept` and `maxSize`     |
| `cidLink()` | `cid-link`   | `{ $link: "bafy..." }`                                                              |
| `bytes()`   | `bytes`      | `{ $bytes: "<base64>" }` with decoded `minLength` and `maxLength`                   |
| `unknown()` | `unknown`    | Any object                                                                          |
| `token()`   | `token`      | The fully qualified token name                                                      |
| `union()`   | `union`      | An object whose `$type` picks one of the given object schemas (open by default)     |
| `object()`  | `object`     | A named object definition: `object("nsid#name", entries)` adds the optional `$type` |
| `record()`  | `record`     | A record definition: `record("nsid", entries, { key })` requires `$type`            |

`query()`, `procedure()` and `subscription()` describe XRPC endpoints. They are plain descriptors holding the `parameters`, `input`, `output` and `message` schemas you validate requests and responses with.

### Describing records and generating Lexicons

Name each object definition with `object()` and each record with `record()`, and Valicon can produce the Lexicon document for you. Both add the `$type` entry that identifies a definition (`nsid#name`, or the bare NSID for `main`): optional on objects, required on records.

```ts
import * as v from "valibot";
import * as lex from "@saeris/valicon";

const strongRef = lex.object("com.atproto.repo.strongRef", {
  uri: v.pipe(v.string(), lex.atUri()),
  cid: v.pipe(v.string(), lex.cid())
});

const replyRef = lex.object("app.bsky.feed.post#replyRef", {
  root: strongRef,
  parent: strongRef
});

const post = v.pipe(
  lex.record(
    "app.bsky.feed.post",
    {
      text: v.pipe(v.string(), v.maxBytes(3000), v.maxGraphemes(300)),
      reply: v.optional(replyRef),
      createdAt: v.pipe(v.string(), lex.datetime())
    },
    { key: "tid" }
  ),
  v.description("Record containing a Bluesky post.")
);

const doc = lex.toLexicon(post);
// { lexicon: 1, id: "app.bsky.feed.post", defs: { main: {...}, replyRef: {...} } }
```

The document id, `ref` targets and union `refs` are all derived from `$type` literals. Definitions in the same namespace are discovered automatically, anonymous nested objects are hoisted into named definitions, and definitions from other documents become global references.

A few Lexicon rules to keep in mind, all of which `toLexicon()` enforces with a clear error:

- String length limits count UTF-8 bytes and graphemes, so use `v.maxBytes()` and `v.maxGraphemes()`, not `v.maxLength()`.
- There is no float type. Numbers need `v.integer()`.
- Unions must be created with `lex.union()`, because Lexicon unions dispatch on `$type`.

### Generating schemas from existing Lexicons

`fromLexicon()` emits a TypeScript module per Lexicon document, with one exported constant per definition:

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { fromLexicon } from "@saeris/valicon";

const doc = JSON.parse(
  readFileSync("lexicons/app/bsky/feed/post.json", "utf8")
);
writeFileSync("src/lexicons/app.bsky.feed.post.ts", fromLexicon(doc));
```

References to other documents are imported from sibling modules named after their NSID (`./com.atproto.repo.strongRef.js`); pass `resolveImport` to change that. Definitions are generated with `object()` and `record()`, which keep unknown fields so that records written against a newer version of a Lexicon still validate, as the evolution rules expect; `objectMode: "strip"` or `"strict"` switch them (and inline XRPC bodies) to the `v.object()` or `v.strictObject()` behavior.

When you would rather not commit generated code, `compileLexicon()` builds the same schemas in memory, and `compileLexicons()` resolves references between a set of documents:

```ts
import * as v from "valibot";
import { compileLexicons } from "@saeris/valicon";

const schemas = compileLexicons(docs);
const post = schemas["app.bsky.feed.post"].main;
if (post.kind === "schema") {
  v.parse(post, record);
}
```

### Mocking records with Valimock

```ts
import { Valimock } from "valimock";
import { lexiconMocks } from "@saeris/valicon/valimock";

const mock = new Valimock({ ...lexiconMocks, seed: 42 });
mock.mock(post);
// { $type: "app.bsky.feed.post", text: "...", createdAt: "2024-...", reply: { root: { uri: "at://did:plc:...", cid: "bafyrei..." } } }
```

DIDs, handles, TIDs, CIDs, AT URIs and timestamps come out looking real, `knownValues` and `accept` lists are honored, and unions always produce one of their declared variants. `lexiconMocks` is a set of Valimock options (`stringActions`, `stringFormats` and a `lazy` custom mock), so it spreads alongside your own; the generators (`mockDid()`, `mockHandle()`, `mockTid()`, ...) are exported for direct use. Requires Valimock 1.7.1 or newer.

## 🎛 Configuration

`toLexicon(input, { id, description, errorMode })` infers `id` from the definitions and throws on unsupported schemas unless `errorMode` is `"warn"` or `"ignore"`.

`fromLexicon(doc, { objectMode, resolveImport, valibotImport, valiconImport })` and `compileLexicon(doc, { objectMode, resolve })` share the `objectMode` option described above.

## 🤝 Contributing

The project uses [Vite+][viteplus] as a unified toolchain (Oxlint + Oxfmt + tsdown + Vitest) and [Bumpy][bumpy] for versioning and release.

```bash
vp install           # install dependencies
vp check --fix       # format + lint + typecheck (with autofixes)
vp test              # run Vitest
vp run bench         # profile the deoptkit workloads in bench/ and fail on new V8 findings
yarn bumpy add       # create a bump file for your PR
```

The test suite runs the official atproto [interop test files](https://github.com/bluesky-social/atproto/tree/main/interop-test-files/syntax) against every format action, and round-trips a set of published `app.bsky` and `com.atproto` Lexicons through `compileLexicon()` and `toLexicon()`.

## 📣 Acknowledgements

Built on [Valibot](https://valibot.dev) by Fabian Hiller, following the design of [`@valibot/to-json-schema`](https://github.com/fabian-hiller/valibot/tree/main/packages/to-json-schema). Format rules and test fixtures come from the [atproto](https://github.com/bluesky-social/atproto) reference implementation by Bluesky.

## 🥂 License

Released under the [MIT license][license] © [Drake Costa][personal-website].

[npm_badge]: https://img.shields.io/npm/v/@saeris/valicon.svg?style=flat
[npm]: https://www.npmjs.com/package/@saeris/valicon
[ci_badge]: https://github.com/Saeris/valicon/actions/workflows/ci.yml/badge.svg
[ci]: https://github.com/Saeris/valicon/actions/workflows/ci.yml
[viteplus]: https://viteplus.dev/
[bumpy]: https://bumpy.varlock.dev/
[license]: ./LICENSE.md
[personal-website]: https://saeris.gg
