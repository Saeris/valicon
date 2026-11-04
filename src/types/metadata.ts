/**
 * The record key scheme of a Lexicon `record`.
 *
 * - `tid` names each record with a timestamp identifier (most common).
 * - `nsid` requires the key to be a valid NSID.
 * - `literal:<value>` means the collection holds a single record with a fixed
 *   key, almost always `literal:self`.
 * - `any` allows any string that is a valid record key.
 */
export type RecordKeyType = "any" | "nsid" | "tid" | `literal:${string}`;

/**
 * Base Lexicon metadata interface.
 */
export interface BaseLexiconMetadata {
  /**
   * The Lexicon type the schema represents.
   */
  readonly type?: string;
  /**
   * The fully qualified reference of the definition (`nsid` or `nsid#name`).
   * Object definitions carry this in their `$type` entry instead.
   */
  readonly id?: string;
}

/**
 * Lexicon record metadata interface.
 */
export interface RecordLexiconMetadata extends BaseLexiconMetadata {
  readonly type: "record";
  readonly key?: RecordKeyType;
}

/**
 * Lexicon blob metadata interface.
 */
export interface BlobLexiconMetadata extends BaseLexiconMetadata {
  readonly type: "blob";
  readonly accept?: readonly string[];
  readonly maxSize?: number;
}

/**
 * Lexicon bytes metadata interface.
 */
export interface BytesLexiconMetadata extends BaseLexiconMetadata {
  readonly type: "bytes";
  readonly minLength?: number;
  readonly maxLength?: number;
}

/**
 * Lexicon CID link metadata interface.
 */
export interface CidLinkLexiconMetadata extends BaseLexiconMetadata {
  readonly type: "cid-link";
}

/**
 * Lexicon token metadata interface.
 */
export interface TokenLexiconMetadata extends BaseLexiconMetadata {
  readonly type: "token";
}

/**
 * Lexicon union metadata interface.
 */
export interface UnionLexiconMetadata extends BaseLexiconMetadata {
  readonly type: "union";
  readonly closed: boolean;
}

/**
 * Lexicon unknown metadata interface.
 */
export interface UnknownLexiconMetadata extends BaseLexiconMetadata {
  readonly type: "unknown";
}

/**
 * Lexicon string metadata interface.
 */
export interface StringLexiconMetadata extends BaseLexiconMetadata {
  readonly type: "string";
  readonly knownValues?: readonly string[];
}

/**
 * Lexicon metadata type.
 *
 * Valicon stores everything the Lexicon language can express but Valibot
 * cannot (record key schemes, blob limits, open vs. closed unions, known
 * values, definition ids, etc.) under the `lexicon` key of a `v.metadata()`
 * action. Read it back with `getLexiconMetadata()`.
 */
export type LexiconMetadata =
  | BaseLexiconMetadata
  | BlobLexiconMetadata
  | BytesLexiconMetadata
  | CidLinkLexiconMetadata
  | RecordLexiconMetadata
  | StringLexiconMetadata
  | TokenLexiconMetadata
  | UnionLexiconMetadata
  | UnknownLexiconMetadata;
