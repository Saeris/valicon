import type { Faker } from "@faker-js/faker";
import type * as v from "valibot";
import { Valimock, type ValimockOptions } from "valimock";
import { BYTES_REGEX } from "./regex.js";
import {
  getTypeName,
  getUnionOptions,
  resolveUnionOption
} from "./schemas/union.js";
import {
  BASE32_ALPHABET,
  encodeBase32,
  encodeTid,
  getLexiconMetadata,
  getPipeItems
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
 * Valimock instances derived from the options of a calling instance, so that
 * nested schemas can be mocked with the same configuration.
 */
const instances = new WeakMap<ValimockOptions, Valimock>();

/**
 * Returns a Valimock instance that mocks with the given options, keeping
 * these hooks for nested schemas.
 *
 * @param options The options of the calling instance.
 *
 * @returns The instance.
 */
function instanceFor(options: ValimockOptions): Valimock {
  let instance = instances.get(options);
  if (!instance) {
    instance = new Valimock(options);
    // Nested instances must not reseed, or every nested value would repeat.
    delete instance.options.seed;
    instances.set(options, instance);
  }
  return instance;
}

/**
 * Valimock instances that fall back to the built-in string generator.
 */
const fallbacks = new WeakMap<ValimockOptions, Valimock>();

/**
 * Returns a Valimock instance without the string hook, for strings that
 * carry no Lexicon format.
 *
 * @param options The options of the calling instance.
 *
 * @returns The instance.
 */
function fallbackFor(options: ValimockOptions): Valimock {
  let instance = fallbacks.get(options);
  if (!instance) {
    instance = new Valimock({
      ...options,
      customMocks: Object.fromEntries(
        Object.entries(options.customMocks).filter(([key]) => key !== "string")
      )
    });
    delete instance.options.seed;
    fallbacks.set(options, instance);
  }
  return instance;
}

/**
 * Pipeline action interface.
 */
interface Action {
  readonly type: string;
  readonly requirement?: unknown;
}

/**
 * Returns the actions of every nested pipeline of a schema.
 *
 * @param schema The schema.
 *
 * @returns The actions.
 */
function getActions(schema: object): Action[] {
  const [base, ...rest] = getPipeItems(schema);
  const actions = rest.filter(
    (item): item is Action =>
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      typeof item.type === "string"
  );
  return base !== schema && typeof base === "object" && base !== null
    ? [...getActions(base), ...actions]
    : actions;
}

/**
 * Mocks a string schema, generating realistic values for Lexicon formats.
 *
 * @param schema The string schema.
 * @param options The Valimock options.
 *
 * @returns The mock value.
 */
function mockString(
  schema: v.GenericSchema | v.GenericSchemaAsync,
  options?: ValimockOptions
): unknown {
  if (!options) {
    throw new Error("Valimock options are required");
  }
  const { faker } = options;
  const metadata = getLexiconMetadata(schema);
  if (
    metadata &&
    "knownValues" in metadata &&
    metadata.knownValues.length > 0
  ) {
    return faker.helpers.arrayElement(metadata.knownValues);
  }
  const actions = getActions(schema);
  let minDecodedBytes: number | undefined;
  let maxDecodedBytes: number | undefined;
  let isBytes = false;
  for (const action of actions) {
    switch (action.type) {
      case "did":
      case "did_plc": {
        return mockDid(faker);
      }
      case "did_web": {
        return mockDidWeb(faker);
      }
      case "handle": {
        return mockHandle(faker);
      }
      case "at_identifier": {
        return mockAtIdentifier(faker);
      }
      case "nsid": {
        return mockNsid(faker);
      }
      case "tid":
      case "record_key": {
        return mockTid(faker);
      }
      case "cid": {
        return mockCid(faker);
      }
      case "datetime": {
        return mockDatetime(faker);
      }
      case "language": {
        return mockLanguage(faker);
      }
      case "at_uri": {
        return mockAtUri(faker);
      }
      case "uri": {
        return mockUri(faker);
      }
      case "accept": {
        return mockMimeType(
          faker,
          Array.isArray(action.requirement) ? action.requirement : []
        );
      }
      case "regex": {
        isBytes ||= action.requirement === BYTES_REGEX;
        break;
      }
      case "min_decoded_bytes": {
        if (typeof action.requirement === "number") {
          minDecodedBytes = action.requirement;
        }
        break;
      }
      case "max_decoded_bytes": {
        if (typeof action.requirement === "number") {
          maxDecodedBytes = action.requirement;
        }
        break;
      }
      default: {
        break;
      }
    }
  }
  if (isBytes) {
    return mockBytes(faker, minDecodedBytes, maxDecodedBytes);
  }
  return fallbackFor(options).mock(schema);
}

/**
 * Mocks a lazy schema, picking a declared variant for `union()` schemas.
 *
 * @param schema The lazy schema.
 * @param options The Valimock options.
 *
 * @returns The mock value.
 */
function mockLazy(
  schema: v.GenericSchema | v.GenericSchemaAsync,
  options?: ValimockOptions
): unknown {
  if (!options) {
    throw new Error("Valimock options are required");
  }
  const instance = instanceFor(options);
  const unionOptions = getUnionOptions(schema);
  if (getLexiconMetadata(schema)?.type === "union" && unionOptions.length > 0) {
    const option = resolveUnionOption(
      options.faker.helpers.arrayElement(unionOptions)
    );
    const mocked: unknown = instance.mock(option);
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
      return instance.mock(inner as v.GenericSchema);
    }
  }
  throw new Error("Unable to resolve lazy schema");
}

/**
 * Custom mocks that teach [Valimock](https://github.com/Saeris/valimock) to
 * generate realistic atproto data.
 *
 * Spread this into the `customMocks` option of a Valimock instance. Strings
 * validated with a Valicon format action (`did()`, `handle()`, `datetime()`,
 * ...) receive values that look like real identifiers instead of random
 * words, `knownValues()` are honored, `blob()` MIME types match their
 * `accept` list, `bytes()` produce base64, and `union()` schemas always
 * produce one of their declared variants with the right `$type`.
 *
 * Hint: Any string without a Lexicon format falls back to the default
 * Valimock generator, so the usual `stringMap` and key name heuristics still
 * apply.
 *
 * @example
 * ```ts
 * import { Valimock } from "valimock";
 * import { lexiconMocks } from "valicon/valimock";
 *
 * const mock = new Valimock({ customMocks: lexiconMocks }).mock(post);
 * ```
 */
export const lexiconMocks: ValimockOptions["customMocks"] = {
  string: mockString,
  lazy: mockLazy
};
