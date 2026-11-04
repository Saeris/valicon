import type { RecordKeyType } from "./metadata.js";

/**
 * The string formats defined by the Lexicon language. Each one has a matching
 * Valicon action (`did()`, `handle()`, `datetime()`, ...).
 */
export type LexStringFormat =
  | "at-identifier"
  | "at-uri"
  | "cid"
  | "datetime"
  | "did"
  | "handle"
  | "language"
  | "nsid"
  | "record-key"
  | "tid"
  | "uri";

/**
 * Lexicon `boolean` type.
 */
export interface LexBoolean {
  readonly type: "boolean";
  readonly description?: string;
  readonly default?: boolean;
  readonly const?: boolean;
}

/**
 * Lexicon `integer` type. Integers are signed 64-bit in the data model, but
 * should stay within the safe integer range of JavaScript in practice. Floats
 * are not allowed anywhere in atproto data.
 */
export interface LexInteger {
  readonly type: "integer";
  readonly description?: string;
  readonly default?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly enum?: readonly number[];
  readonly const?: number;
}

/**
 * Lexicon `string` type.
 *
 * Hint: `minLength` and `maxLength` count UTF-8 bytes, not characters, while
 * `minGraphemes` and `maxGraphemes` count user-perceived characters (grapheme
 * clusters). `enum` is a closed set of allowed values, while `knownValues`
 * are only suggestions and any string is still valid.
 */
export interface LexString {
  readonly type: "string";
  readonly format?: LexStringFormat;
  readonly description?: string;
  readonly default?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minGraphemes?: number;
  readonly maxGraphemes?: number;
  readonly enum?: readonly string[];
  readonly const?: string;
  readonly knownValues?: readonly string[];
}

/**
 * Lexicon `unknown` type. Any object is accepted. It should be avoided in
 * records, but is common in API responses that embed arbitrary records.
 */
export interface LexUnknown {
  readonly type: "unknown";
  readonly description?: string;
}

/**
 * Lexicon `bytes` type. Encoded in JSON as `{ "$bytes": "<base64>" }`. The
 * length limits count the raw (decoded) bytes.
 */
export interface LexBytes {
  readonly type: "bytes";
  readonly description?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
}

/**
 * Lexicon `cid-link` type. Encoded in JSON as `{ "$link": "<cid>" }`.
 */
export interface LexCidLink {
  readonly type: "cid-link";
  readonly description?: string;
}

/**
 * Lexicon `ref` type. Points at another definition, either in the same file
 * (`#name`) or anywhere on the network (`com.example.nsid` or
 * `com.example.nsid#name`). A bare NSID refers to the `main` definition of
 * that file.
 */
export interface LexRef {
  readonly type: "ref";
  readonly description?: string;
  readonly ref: string;
}

/**
 * Lexicon `union` type. The data must be an object with a `$type` field naming
 * one of the referenced definitions. Unions are open by default, meaning an
 * unknown `$type` is still accepted so that new variants can be added later.
 * A closed union rejects anything not listed in `refs`.
 */
export interface LexRefUnion {
  readonly type: "union";
  readonly description?: string;
  readonly refs: readonly string[];
  readonly closed?: boolean;
}

/**
 * Lexicon `blob` type. A reference to a file uploaded to a PDS. `accept` lists
 * allowed MIME types (with `type/*` or `*\/*` globs) and `maxSize` is a byte
 * limit.
 */
export interface LexBlob {
  readonly type: "blob";
  readonly description?: string;
  readonly accept?: readonly string[];
  readonly maxSize?: number;
}

/**
 * Lexicon `array` type.
 */
export interface LexArray {
  readonly type: "array";
  readonly description?: string;
  readonly items: LexArrayItem;
  readonly minLength?: number;
  readonly maxLength?: number;
}

/**
 * The types allowed as array items.
 */
export type LexArrayItem =
  | LexBlob
  | LexBoolean
  | LexBytes
  | LexCidLink
  | LexInteger
  | LexRef
  | LexRefUnion
  | LexString
  | LexUnknown;

/**
 * Lexicon `token` type. A token is a named symbol with no data representation.
 * It is referenced by its fully qualified name in `knownValues` or `enum`
 * lists of string fields.
 */
export interface LexToken {
  readonly type: "token";
  readonly description?: string;
}

/**
 * The types allowed as object properties.
 */
export type LexObjectProperty = LexArray | LexArrayItem;

/**
 * Lexicon `object` type. `required` lists the properties that must be
 * present, and `nullable` lists the properties that may be `null`. A missing
 * property, a `null` value and a falsy value are three different things.
 */
export interface LexObject {
  readonly type: "object";
  readonly description?: string;
  readonly required?: readonly string[];
  readonly nullable?: readonly string[];
  readonly properties: Readonly<Record<string, LexObjectProperty>>;
}

/**
 * The primitive types allowed as XRPC query parameters.
 */
export type LexPrimitive = LexBoolean | LexInteger | LexString | LexUnknown;

/**
 * An array of primitives, as allowed in XRPC query parameters.
 */
export interface LexPrimitiveArray extends Omit<LexArray, "items"> {
  readonly items: LexPrimitive;
}

/**
 * Lexicon `params` type. Describes the HTTP query parameters of an XRPC
 * endpoint, so only booleans, integers, strings and arrays of them are
 * allowed.
 */
export interface LexXrpcParameters {
  readonly type: "params";
  readonly description?: string;
  readonly required?: readonly string[];
  readonly properties: Readonly<
    Record<string, LexPrimitive | LexPrimitiveArray>
  >;
}

/**
 * The input or output body of an XRPC endpoint. `encoding` is a MIME type
 * such as `application/json`, and `schema` describes the body when it is
 * JSON.
 */
export interface LexXrpcBody {
  readonly description?: string;
  readonly encoding: string;
  readonly schema?: LexObject | LexRef | LexRefUnion;
}

/**
 * A named error an XRPC endpoint may return.
 */
export interface LexXrpcError {
  readonly name: string;
  readonly description?: string;
}

/**
 * Lexicon `query` type. An HTTP GET endpoint.
 */
export interface LexXrpcQuery {
  readonly type: "query";
  readonly description?: string;
  readonly parameters?: LexXrpcParameters;
  readonly output?: LexXrpcBody;
  readonly errors?: readonly LexXrpcError[];
}

/**
 * Lexicon `procedure` type. An HTTP POST endpoint.
 */
export interface LexXrpcProcedure {
  readonly type: "procedure";
  readonly description?: string;
  readonly parameters?: LexXrpcParameters;
  readonly input?: LexXrpcBody;
  readonly output?: LexXrpcBody;
  readonly errors?: readonly LexXrpcError[];
}

/**
 * The message schema of a subscription. It must be a union of refs.
 */
export interface LexXrpcSubscriptionMessage {
  readonly description?: string;
  readonly schema: LexRefUnion;
}

/**
 * Lexicon `subscription` type. A WebSocket event stream.
 */
export interface LexXrpcSubscription {
  readonly type: "subscription";
  readonly description?: string;
  readonly parameters?: LexXrpcParameters;
  readonly message?: LexXrpcSubscriptionMessage;
  readonly errors?: readonly LexXrpcError[];
}

/**
 * Lexicon `record` type. Describes the shape of records stored in a
 * repository collection. Records must always carry a `$type` field equal to
 * the Lexicon NSID.
 */
export interface LexRecord {
  readonly type: "record";
  readonly description?: string;
  readonly key?: RecordKeyType;
  readonly record: LexObject;
}

/**
 * The primary types that may only appear as the `main` definition.
 */
export type LexPrimaryType =
  | LexRecord
  | LexXrpcProcedure
  | LexXrpcQuery
  | LexXrpcSubscription;

/**
 * Any user-defined Lexicon type.
 */
export type LexUserType =
  | LexArray
  | LexBlob
  | LexBoolean
  | LexBytes
  | LexCidLink
  | LexInteger
  | LexObject
  | LexPrimaryType
  | LexString
  | LexToken
  | LexUnknown;

/**
 * A Lexicon schema document.
 *
 * A document is identified by its NSID (`id`) and holds named definitions in
 * `defs`. The definition named `main` is the primary one and can be
 * referenced by the bare NSID. Shared definitions usually live in a `*.defs`
 * document that has no `main`.
 */
export interface LexiconDoc {
  readonly lexicon: 1;
  readonly id: string;
  readonly revision?: number;
  readonly description?: string;
  readonly defs: Readonly<Record<string, LexUserType>>;
}
