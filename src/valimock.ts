import type { Faker } from "@faker-js/faker";
import type * as v from "valibot";
import type {
  MockFunction,
  StringActionHandler,
  StringFormatGenerator,
  ValimockOptions
} from "valimock";
import {
  getTypeName,
  getUnionOptions,
  resolveUnionOption
} from "./schemas/union.js";
import {
  BASE32_ALPHABET,
  encodeBase32,
  encodeTid,
  getLexiconMetadata
} from "./utils/index.js";

/**
 * Common MIME types grouped by their top-level type, used to satisfy `accept`
 * globs with realistic values.
 */
const MIME_TYPES: Readonly<Record<string, readonly string[]>> = {
  image: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm"],
  audio: ["audio/mpeg", "audio/ogg"],
  text: ["text/plain", "text/html"],
  application: ["application/json", "application/octet-stream"]
};

/**
 * Common BCP 47 language tags.
 */
const LANGUAGES = [
  "en",
  "en-US",
  "en-GB",
  "pt-BR",
  "ja",
  "de",
  "fr",
  "es",
  "ko",
  "zh-Hant"
];

/**
 * Generates a random `did:plc` identifier.
 *
 * @param faker The Faker instance.
 *
 * @returns A DID.
 */
export function mockDid(faker: Faker): string {
  return `did:plc:${faker.string.fromCharacters(BASE32_ALPHABET, 24)}`;
}

/**
 * Generates a random `did:web` identifier.
 *
 * @param faker The Faker instance.
 *
 * @returns A DID.
 */
export function mockDidWeb(faker: Faker): string {
  return `did:web:${faker.internet.domainName()}`;
}

/**
 * Generates a random handle such as `alice-smith.bsky.social`.
 *
 * @param faker The Faker instance.
 *
 * @returns A handle.
 */
export function mockHandle(faker: Faker): string {
  const label = faker.internet
    .username()
    .toLowerCase()
    .replace(/[^a-z0-9-]/gu, "")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 63);
  const domain = faker.helpers.arrayElement([
    "bsky.social",
    "bsky.social",
    faker.internet.domainName()
  ]);
  return `${label || "user"}.${domain}`;
}

/**
 * Generates a random DID or handle.
 *
 * @param faker The Faker instance.
 *
 * @returns An AT identifier.
 */
export function mockAtIdentifier(faker: Faker): string {
  return faker.datatype.boolean() ? mockDid(faker) : mockHandle(faker);
}

/**
 * Generates a random NSID such as `com.example.feed.post`.
 *
 * @param faker The Faker instance.
 *
 * @returns An NSID.
 */
export function mockNsid(faker: Faker): string {
  const authority = faker.internet.domainName().split(".").reverse().join(".");
  const name = `${faker.word.noun()}${capitalize(faker.word.verb())}`.replace(
    /[^a-zA-Z0-9]/gu,
    ""
  );
  return `${authority}.${faker.word.noun().replace(/[^a-z]/gu, "") || "feed"}.${name}`;
}

/**
 * Generates a random TID for a recent timestamp.
 *
 * @param faker The Faker instance.
 *
 * @returns A TID.
 */
export function mockTid(faker: Faker): string {
  return encodeTid(
    faker.date.recent().getTime() * 1000,
    faker.number.int({ min: 0, max: 1023 })
  );
}

/**
 * Generates a random CID of the atproto profile.
 *
 * @param faker The Faker instance.
 * @param codec The multicodec: `dag-cbor` for records and commits, `raw` for
 * blobs.
 *
 * @returns A CID.
 */
export function mockCid(
  faker: Faker,
  codec: "dag-cbor" | "raw" = "dag-cbor"
): string {
  const bytes = new Uint8Array(36);
  bytes.set([1, codec === "raw" ? 0x55 : 0x71, 0x12, 0x20]);
  for (let index = 4; index < 36; index++) {
    bytes[index] = faker.number.int({ min: 0, max: 255 });
  }
  return `b${encodeBase32(bytes)}`;
}

/**
 * Generates a random atproto datetime for a recent instant.
 *
 * @param faker The Faker instance.
 *
 * @returns A datetime string.
 */
export function mockDatetime(faker: Faker): string {
  return faker.date.recent({ days: 30 }).toISOString();
}

/**
 * Picks a common BCP 47 language tag.
 *
 * @param faker The Faker instance.
 *
 * @returns A language tag.
 */
export function mockLanguage(faker: Faker): string {
  return faker.helpers.arrayElement(LANGUAGES);
}

/**
 * Generates a random AT URI pointing at a record.
 *
 * @param faker The Faker instance.
 *
 * @returns An AT URI.
 */
export function mockAtUri(faker: Faker): string {
  return `at://${mockDid(faker)}/${mockNsid(faker)}/${mockTid(faker)}`;
}

/**
 * Generates a random URI, usually an `https://` URL.
 *
 * @param faker The Faker instance.
 *
 * @returns A URI.
 */
export function mockUri(faker: Faker): string {
  return faker.helpers.arrayElement([
    faker.internet.url(),
    faker.internet.url(),
    mockAtUri(faker)
  ]);
}

/**
 * Picks a MIME type matching an `accept` list.
 *
 * @param faker The Faker instance.
 * @param accept The accepted MIME type patterns.
 *
 * @returns A MIME type.
 */
export function mockMimeType(faker: Faker, accept: readonly string[]): string {
  const pattern = faker.helpers.arrayElement(
    accept.length > 0 ? accept : ["*/*"]
  );
  if (pattern === "*/*") {
    return faker.helpers.arrayElement(Object.values(MIME_TYPES).flat());
  }
  if (pattern.endsWith("/*")) {
    const group = MIME_TYPES[pattern.slice(0, -2)];
    return group
      ? faker.helpers.arrayElement(group)
      : `${pattern.slice(0, -1)}${faker.word.noun()}`;
  }
  return pattern;
}

/**
 * Generates random base64 encoded bytes.
 *
 * @param faker The Faker instance.
 * @param minLength The minimum number of decoded bytes.
 * @param maxLength The maximum number of decoded bytes.
 *
 * @returns Unpadded base64.
 */
export function mockBytes(faker: Faker, minLength = 0, maxLength = 64): string {
  const length = faker.number.int({
    min: minLength,
    max: Math.max(minLength, maxLength)
  });
  let binary = "";
  for (let index = 0; index < length; index++) {
    binary += String.fromCharCode(faker.number.int({ min: 0, max: 255 }));
  }
  return btoa(binary).replace(/=+$/u, "");
}

/**
 * Capitalizes the first character of a word.
 *
 * @param word The word.
 *
 * @returns The capitalized word.
 */
function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * The Valimock format name for each Valicon string action type.
 */
const FORMATS: Readonly<Record<string, string>> = {
  at_identifier: "at_identifier",
  at_uri: "at_uri",
  cid: "cid",
  datetime: "datetime",
  did: "did",
  did_plc: "did",
  did_web: "did_web",
  handle: "handle",
  language: "language",
  nsid: "nsid",
  record_key: "tid",
  tid: "tid",
  uri: "uri"
};

/**
 * Reads the `requirement` of a pipeline action, if any.
 *
 * @param action The action.
 *
 * @returns The requirement.
 */
function requirementOf(action: unknown): unknown {
  return typeof action === "object" &&
    action !== null &&
    "requirement" in action
    ? action.requirement
    : null;
}

/**
 * Valimock string action handlers for every Valicon action.
 *
 * Each handler names the format a `stringFormats` generator produces, and
 * `accept` and the decoded byte length actions stash their requirement on
 * `ctx.custom` for the generator. The `metadata` handler turns Lexicon
 * `knownValues` into an allow-list, so fields such as label values pick one
 * of their known names instead of a random word.
 */
export const stringActions: Readonly<Record<string, StringActionHandler>> = {
  ...Object.fromEntries(
    Object.entries(FORMATS).map(
      ([type, format]): [string, StringActionHandler] => [
        type,
        (ctx) => {
          ctx.format = format;
        }
      ]
    )
  ),
  accept: (ctx, action) => {
    ctx.format = "mime_type";
    ctx.custom.accept = requirementOf(action);
  },
  min_decoded_bytes: (ctx, action) => {
    ctx.format = "bytes";
    ctx.custom.minDecodedBytes = requirementOf(action);
  },
  max_decoded_bytes: (ctx, action) => {
    ctx.format = "bytes";
    ctx.custom.maxDecodedBytes = requirementOf(action);
  },
  metadata: (ctx, action) => {
    const metadata = getLexiconMetadata({ pipe: [null, action] });
    if (
      metadata &&
      "knownValues" in metadata &&
      metadata.knownValues.length > 0
    ) {
      ctx.allowedValues = metadata.knownValues;
    }
  }
};

/**
 * Valimock string format generators for the formats `stringActions` name.
 */
export const stringFormats: Readonly<Record<string, StringFormatGenerator>> = {
  at_identifier: (ctx) => mockAtIdentifier(ctx.faker),
  at_uri: (ctx) => mockAtUri(ctx.faker),
  bytes: (ctx) =>
    mockBytes(
      ctx.faker,
      typeof ctx.custom.minDecodedBytes === "number"
        ? ctx.custom.minDecodedBytes
        : 0,
      typeof ctx.custom.maxDecodedBytes === "number"
        ? ctx.custom.maxDecodedBytes
        : 64
    ),
  cid: (ctx) => mockCid(ctx.faker),
  datetime: (ctx) => mockDatetime(ctx.faker),
  did: (ctx) => mockDid(ctx.faker),
  did_web: (ctx) => mockDidWeb(ctx.faker),
  handle: (ctx) => mockHandle(ctx.faker),
  language: (ctx) => mockLanguage(ctx.faker),
  mime_type: (ctx) =>
    mockMimeType(
      ctx.faker,
      Array.isArray(ctx.custom.accept)
        ? ctx.custom.accept.filter(
            (pattern): pattern is string => typeof pattern === "string"
          )
        : []
    ),
  nsid: (ctx) => mockNsid(ctx.faker),
  tid: (ctx) => mockTid(ctx.faker),
  uri: (ctx) => mockUri(ctx.faker)
};

/**
 * Mocks a lazy schema, always picking a declared variant for `union()`
 * schemas so that mocks carry a real `$type` rather than an unknown one.
 *
 * @param schema The lazy schema.
 * @param options The Valimock options.
 * @param mock The mock function of the calling instance.
 *
 * @returns The mock value.
 */
function mockLazy(
  schema: v.GenericSchema | v.GenericSchemaAsync,
  options?: ValimockOptions,
  mock?: MockFunction
): unknown {
  if (!options || !mock) {
    throw new Error("Valicon mocks require Valimock 1.7 or newer");
  }
  const unionOptions = getUnionOptions(schema);
  if (getLexiconMetadata(schema)?.type === "union" && unionOptions.length > 0) {
    const option = resolveUnionOption(
      options.faker.helpers.arrayElement(unionOptions)
    );
    const mocked: unknown = mock(option);
    return {
      $type: getTypeName(option),
      ...(typeof mocked === "object" && mocked !== null ? mocked : {})
    };
  }
  if ("getter" in schema && typeof schema.getter === "function") {
    const inner: unknown = schema.getter(null);
    if (typeof inner === "object" && inner !== null && "kind" in inner) {
      // The getter of a lazy schema always returns a schema.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      return mock(inner as v.GenericSchema);
    }
  }
  throw new Error("Unable to resolve lazy schema");
}

/**
 * Valimock options that teach [Valimock](https://github.com/Saeris/valimock)
 * to generate realistic atproto data.
 *
 * Spread these into the options of a Valimock instance. Strings validated
 * with a Valicon format action (`did()`, `handle()`, `datetime()`, ...)
 * receive values that look like real identifiers instead of random words,
 * `knownValues()` are honored, `blob()` MIME types match their `accept` list,
 * `bytes()` produce base64 of the right size, and `union()` schemas always
 * produce one of their declared variants with the right `$type`.
 *
 * Hint: The three tables (`stringActions`, `stringFormats` and
 * `customMocks`) are also exported separately so they can be merged with
 * your own entries.
 *
 * @example
 * ```ts
 * import { Valimock } from "valimock";
 * import { lexiconMocks } from "@saeris/valicon/valimock";
 *
 * const mock = new Valimock({ ...lexiconMocks, seed: 42 }).mock(post);
 * ```
 */
export const lexiconMocks: Pick<
  Partial<ValimockOptions>,
  "customMocks" | "stringActions" | "stringFormats"
> = {
  stringActions,
  stringFormats,
  customMocks: { lazy: mockLazy }
};
