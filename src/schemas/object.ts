import {
  type GenericSchema,
  literal,
  type LiteralSchema,
  looseObject,
  object as objectSchema,
  type ObjectEntries,
  optional,
  type OptionalSchema,
  strictObject
} from "valibot";
import type { ObjectMode, ObjectSchemaForMode } from "../types/index.js";

/**
 * Object entries that leave `$type` to Valicon.
 */
export type LexiconEntries = ObjectEntries & {
  readonly $type?: never;
};

/**
 * Object options interface.
 */
export interface ObjectOptions<TMode extends ObjectMode> {
  /**
   * How properties the Lexicon does not declare are treated. Defaults to
   * `loose`, which keeps them, so that records with fields added by a newer
   * version of the Lexicon survive validation.
   */
  readonly mode?: TMode;
}

/**
 * The entries of a Lexicon object definition: the declared entries plus the
 * `$type` literal that names the definition.
 */
export type TypedEntries<
  TId extends string,
  TEntries extends ObjectEntries,
  TRequired extends boolean
> = {
  readonly $type: TRequired extends true
    ? LiteralSchema<TId, undefined>
    : OptionalSchema<LiteralSchema<TId, undefined>, undefined>;
} & TEntries;

/**
 * Lexicon object schema type.
 */
export type LexiconObjectSchema<
  TId extends string,
  TEntries extends ObjectEntries,
  TMode extends ObjectMode
> = ObjectSchemaForMode<TypedEntries<TId, TEntries, false>, TMode>;

/**
 * Creates a Valibot object schema for the given mode.
 *
 * @param entries The object entries.
 * @param mode The object mode.
 *
 * @returns The object schema.
 */
export function objectForMode(
  entries: ObjectEntries,
  mode: ObjectMode | undefined
): GenericSchema {
  if (mode === "strict") {
    return strictObject(entries);
  }
  if (mode === "strip") {
    return objectSchema(entries);
  }
  return looseObject(entries);
}

/**
 * Creates a Lexicon [object](https://atproto.com/specs/lexicon#object)
 * definition schema.
 *
 * Every object definition in a Lexicon has a name, written as `nsid#name`
 * (or the bare NSID for the `main` definition), and data may carry that name
 * in a `$type` field. This helper adds the `$type: v.optional(v.literal(id))`
 * entry for you, so the definition can be referenced by `toLexicon()`, used
 * as a `union()` variant, and understood by other atproto software.
 *
 * Hint: This is `v.looseObject()` underneath. Unknown properties are kept by
 * default because Lexicons evolve by adding optional fields; pass
 * `{ mode: "strip" }` or `{ mode: "strict" }` to use `v.object()` or
 * `v.strictObject()` instead. Add a description with
 * `v.pipe(object(...), v.description("..."))`.
 *
 * @param id The fully qualified name of the definition.
 * @param entries The object entries.
 * @param options The object options.
 *
 * @returns A Lexicon object schema.
 */
// @__NO_SIDE_EFFECTS__
export function object<
  const TId extends string,
  const TEntries extends LexiconEntries,
  const TMode extends ObjectMode = "loose"
>(
  id: TId,
  entries: TEntries,
  options?: ObjectOptions<TMode>
): LexiconObjectSchema<TId, TEntries, TMode> {
  // The schema kind depends on the mode option at runtime.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return objectForMode(
    { $type: optional(literal(id)), ...entries },
    options?.mode
  ) as LexiconObjectSchema<TId, TEntries, TMode>;
}
