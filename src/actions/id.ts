import { metadata, type MetadataAction } from "valibot";
import type { BaseLexiconMetadata } from "../types/index.js";

/**
 * Id action type.
 */
export type IdAction<TInput, TId extends string> = MetadataAction<
  TInput,
  { readonly lexicon: BaseLexiconMetadata & { readonly id: TId } }
>;

/**
 * Creates an id metadata action.
 *
 * Every definition in a Lexicon document has a name, and other documents can
 * point at it with a `ref`. Object definitions announce their name through
 * their `$type` literal, but strings, arrays, blobs and other non-object
 * definitions have no such field. Attach this action to them so that
 * `toLexicon()` can emit a `ref` to the definition instead of inlining a
 * copy of it. Generated code from `fromLexicon()` does this automatically.
 *
 * Hint: The id is the fully qualified reference: a bare NSID for the `main`
 * definition, otherwise `nsid#name`.
 *
 * @param id The fully qualified reference of the definition.
 *
 * @returns An id action.
 */
// @__NO_SIDE_EFFECTS__
export function id<TInput, const TId extends string>(
  id_: TId
): IdAction<TInput, TId> {
  return metadata({ lexicon: { id: id_ } });
}
