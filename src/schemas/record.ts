import {
  type InferOutput,
  literal,
  metadata,
  type MetadataAction,
  type ObjectEntries,
  pipe,
  type SchemaWithPipe
} from "valibot";
import type {
  ObjectMode,
  ObjectSchemaForMode,
  RecordKeyType,
  RecordLexiconMetadata
} from "../types/index.js";
import {
  type LexiconEntries,
  objectForMode,
  type ObjectOptions,
  type TypedEntries
} from "./object.js";

/**
 * Record options interface.
 */
export interface RecordOptions<
  TMode extends ObjectMode
> extends ObjectOptions<TMode> {
  /**
   * The record key scheme. Almost always `tid`, or `literal:self` for
   * single-record collections such as profiles.
   */
  readonly key?: RecordKeyType;
}

/**
 * Record schema type.
 */
export type RecordSchema<
  TId extends string,
  TEntries extends ObjectEntries,
  TMode extends ObjectMode
> = SchemaWithPipe<
  readonly [
    ObjectSchemaForMode<TypedEntries<TId, TEntries, true>, TMode>,
    MetadataAction<
      InferOutput<
        ObjectSchemaForMode<TypedEntries<TId, TEntries, true>, TMode>
      >,
      { readonly lexicon: RecordLexiconMetadata }
    >
  ]
>;

/**
 * Creates a [record](https://atproto.com/specs/lexicon#record) schema.
 *
 * A record is a single item stored in a repository collection, such as a
 * post, a like or a follow. Records must always include a `$type` field equal
 * to the NSID of their Lexicon (`app.bsky.feed.post`), which this helper adds
 * as a required `v.literal()` entry. This is the Lexicon `record` type, which
 * is always the `main` definition of its document, so the NSID is also the
 * document id `toLexicon()` emits.
 *
 * Hint: The `key` option records how records of this collection are named.
 * Like `object()`, this keeps unknown properties unless `mode` says
 * otherwise. Add a description with `v.pipe(record(...), v.description())`.
 *
 * @param id The NSID of the record collection.
 * @param entries The object entries.
 * @param options The record options.
 *
 * @returns A record schema.
 */
// @__NO_SIDE_EFFECTS__
export function record<
  const TId extends string,
  const TEntries extends LexiconEntries,
  const TMode extends ObjectMode = "loose"
>(
  id: TId,
  entries: TEntries,
  options?: RecordOptions<TMode>
): RecordSchema<TId, TEntries, TMode> {
  const { mode, ...lexicon } = options ?? {};
  // The schema kind depends on the mode option at runtime.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return pipe(
    objectForMode({ $type: literal(id), ...entries }, mode),
    metadata({ lexicon: { type: "record", ...lexicon } })
  ) as RecordSchema<TId, TEntries, TMode>;
}
