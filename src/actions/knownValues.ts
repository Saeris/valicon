import { metadata, type MetadataAction } from "valibot";
import type { StringLexiconMetadata } from "../types/index.js";

/**
 * Known values action type.
 */
export type KnownValuesAction<
  TInput extends string,
  TValues extends readonly string[]
> = MetadataAction<
  TInput,
  {
    readonly lexicon: StringLexiconMetadata & { readonly knownValues: TValues };
  }
>;

/**
 * Creates a known values metadata action.
 *
 * In a Lexicon, `knownValues` lists the string values an application knows
 * how to handle, without making the list exhaustive the way `enum` does. Any
 * string still validates, so new values can be introduced without breaking
 * older clients, which should treat unrecognized values as "unknown". A
 * common example is `labels` or `status` fields that name well-known tokens
 * such as `app.bsky.actor.defs#requestLess`.
 *
 * Hint: This action does not validate anything. It records the values as
 * Lexicon metadata so that `toLexicon()` emits them and Valimock can generate
 * realistic mock data. Use `v.picklist()` when you need a closed set.
 *
 * @param values The known values.
 *
 * @returns A known values action.
 */
// @__NO_SIDE_EFFECTS__
export function knownValues<
  TInput extends string,
  const TValues extends readonly string[]
>(values: TValues): KnownValuesAction<TInput, TValues> {
  return metadata({ lexicon: { type: "string", knownValues: values } });
}
