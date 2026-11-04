import {
  looseObject,
  type LooseObjectSchema,
  metadata,
  type MetadataAction,
  pipe,
  type SchemaWithPipe
} from "valibot";
import type { UnknownLexiconMetadata } from "../types/index.js";

/**
 * Unknown schema type.
 */
export type UnknownSchema = SchemaWithPipe<
  readonly [
    LooseObjectSchema<Record<never, never>, undefined>,
    MetadataAction<
      Record<string, unknown>,
      { readonly lexicon: UnknownLexiconMetadata }
    >
  ]
>;

/**
 * Creates an [unknown](https://atproto.com/specs/lexicon#unknown) schema.
 *
 * The Lexicon `unknown` type accepts any object without validating its
 * contents. It is how API responses embed records of arbitrary collections,
 * for example the `value` of `com.atproto.repo.getRecord` or the `record`
 * inside a post view. The object usually carries a `$type` field that tells
 * you which Lexicon to validate it against next.
 *
 * Hint: The spec strongly discourages `unknown` inside records themselves.
 * Unlike `v.unknown()`, non-object values such as strings are rejected, as
 * the Lexicon spec requires.
 *
 * @returns An unknown schema.
 */
// @__NO_SIDE_EFFECTS__
export function unknown(): UnknownSchema {
  return pipe(looseObject({}), metadata({ lexicon: { type: "unknown" } }));
}
