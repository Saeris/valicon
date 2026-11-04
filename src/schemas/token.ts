import {
  literal,
  type LiteralSchema,
  metadata,
  type MetadataAction,
  pipe,
  type SchemaWithPipe
} from "valibot";
import type { TokenLexiconMetadata } from "../types/index.js";

/**
 * Token schema type.
 */
export type TokenSchema<TName extends string> = SchemaWithPipe<
  readonly [
    LiteralSchema<TName, undefined>,
    MetadataAction<TName, { readonly lexicon: TokenLexiconMetadata }>
  ]
>;

/**
 * Creates a [token](https://atproto.com/specs/lexicon#token) schema.
 *
 * A token is a named constant with no data of its own, similar to an enum
 * member. Lexicons declare tokens as definitions (for example
 * `app.bsky.feed.defs#requestLess`) and then list their fully qualified
 * names in the `knownValues` of a string field. The string field holds the
 * token name as its value. This is the Lexicon `token` type.
 *
 * Hint: Tokens cannot be the target of a `ref` or `union`. Validating a
 * token schema simply checks for its exact name.
 *
 * @param name The fully qualified token name, such as `com.example.defs#foo`.
 *
 * @returns A token schema.
 */
// @__NO_SIDE_EFFECTS__
export function token<const TName extends string>(
  name: TName
): TokenSchema<TName> {
  return pipe(literal(name), metadata({ lexicon: { type: "token" } }));
}
