import type {
  BaseIssue,
  BaseSchema,
  ErrorMessage,
  GenericPipeItem,
  LooseObjectIssue,
  LooseObjectSchema,
  ObjectEntries,
  ObjectIssue,
  ObjectSchema,
  ObjectWithRestIssue,
  ObjectWithRestSchema,
  SchemaWithPipe,
  StrictObjectIssue,
  StrictObjectSchema
} from "valibot";

/**
 * Any Valibot object schema type, with or without a pipeline.
 */
export type ObjectLikeSchema =
  | BaseObjectSchema
  | SchemaWithPipe<readonly [BaseObjectSchema, ...GenericPipeItem[]]>;

/**
 * Any Valibot object schema type without a pipeline.
 */
export type BaseObjectSchema =
  | LooseObjectSchema<ObjectEntries, ErrorMessage<LooseObjectIssue> | undefined>
  | ObjectSchema<ObjectEntries, ErrorMessage<ObjectIssue> | undefined>
  | ObjectWithRestSchema<
      ObjectEntries,
      BaseSchema<unknown, unknown, BaseIssue<unknown>>,
      ErrorMessage<ObjectWithRestIssue> | undefined
    >
  | StrictObjectSchema<
      ObjectEntries,
      ErrorMessage<StrictObjectIssue> | undefined
    >;

/**
 * How object schemas treat properties the Lexicon does not declare.
 *
 * - `loose` keeps unknown properties (`v.looseObject`). This is the default
 *   because Lexicons evolve by adding optional fields, and dropping them
 *   silently loses data.
 * - `strip` removes unknown properties (`v.object`).
 * - `strict` rejects unknown properties (`v.strictObject`).
 */
export type ObjectMode = "loose" | "strict" | "strip";

/**
 * The Valibot object schema type produced for an object mode.
 */
export type ObjectSchemaForMode<
  TEntries extends ObjectEntries,
  TMode extends ObjectMode
> = TMode extends "strict"
  ? StrictObjectSchema<TEntries, undefined>
  : TMode extends "strip"
    ? ObjectSchema<TEntries, undefined>
    : LooseObjectSchema<TEntries, undefined>;
