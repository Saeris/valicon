import {
  check,
  type GenericSchema,
  type InferInput,
  type InferOutput,
  lazy,
  type LazySchema,
  looseObject,
  metadata,
  type MetadataAction,
  notValues,
  pipe,
  type SchemaWithPipe,
  string,
  union as unionSchema,
  variant,
  type VariantOptions
} from "valibot";
import type { ObjectLikeSchema, UnionLexiconMetadata } from "../types/index.js";

/**
 * Union option type. Any object schema that declares a `$type` literal, or a
 * lazy schema resolving to one.
 */
export type UnionOption = LazySchema<GenericSchema> | ObjectLikeSchema;

/**
 * Checks whether a schema is an object schema.
 *
 * @param schema The schema to check.
 *
 * @returns Whether it is an object schema.
 */
function isObjectLike(schema: GenericSchema): schema is ObjectLikeSchema {
  return (
    schema.type === "object" ||
    schema.type === "loose_object" ||
    schema.type === "strict_object" ||
    schema.type === "object_with_rest"
  );
}

/**
 * Union config interface.
 */
export interface UnionConfig<TClosed extends boolean> {
  /**
   * Whether the union is closed. Open unions (the default) accept objects
   * with an unknown `$type`, closed unions reject them.
   */
  readonly closed?: TClosed;
}

/**
 * An object with an unknown `$type`, as accepted by open unions.
 */
export interface UnknownVariant {
  readonly $type: string;
  readonly [key: string]: unknown;
}

/**
 * Extracts the `$type` name declared by a variant, falling back to `string`
 * when it declares none.
 */
type TypeName<TType> = unknown extends TType
  ? string
  : TType extends string
    ? TType
    : never;

/**
 * Makes the `$type` field of a variant required.
 */
type Typed<TValue> = TValue & {
  readonly $type: TValue extends { $type?: infer TType }
    ? TypeName<TType>
    : string;
};

/**
 * Infer union input type.
 */
export type InferUnionInput<
  TOptions extends readonly UnionOption[],
  TClosed extends boolean
> =
  | Typed<InferInput<TOptions[number]>>
  | (TClosed extends true ? never : UnknownVariant);

/**
 * Infer union output type.
 */
export type InferUnionOutput<
  TOptions extends readonly UnionOption[],
  TClosed extends boolean
> =
  | Typed<InferOutput<TOptions[number]>>
  | (TClosed extends true ? never : UnknownVariant);

/**
 * Union schema type.
 */
export type UnionSchema<
  TOptions extends readonly UnionOption[],
  TClosed extends boolean
> = SchemaWithPipe<
  readonly [
    LazySchema<
      GenericSchema<
        InferUnionInput<TOptions, TClosed>,
        InferUnionOutput<TOptions, TClosed>
      >
    >,
    MetadataAction<
      InferUnionOutput<TOptions, TClosed>,
      { readonly lexicon: UnionLexiconMetadata }
    >
  ]
>;

/**
 * Checks whether a value looks like a Valibot schema.
 *
 * @param value The value to check.
 *
 * @returns Whether it has a string `type`.
 */
function isSchemaLike(
  value: unknown
): value is { type: string; literal?: unknown; wrapped?: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string"
  );
}

/**
 * Returns the `$type` name declared by an object schema, or `null` if the
 * schema has no `$type` literal entry.
 *
 * @param option The object schema.
 *
 * @returns The `$type` literal.
 */
export function getTypeName(option: ObjectLikeSchema): string | null {
  let entry: unknown = option.entries.$type;
  while (isSchemaLike(entry) && entry.type !== "literal") {
    entry = entry.wrapped;
  }
  return isSchemaLike(entry) && typeof entry.literal === "string"
    ? entry.literal
    : null;
}

/**
 * Resolves lazy schemas until an object schema is reached.
 *
 * @param option The union option.
 *
 * @returns The object schema.
 */
export function resolveUnionOption(option: UnionOption): ObjectLikeSchema {
  let resolved: GenericSchema = option;
  while (
    resolved.type === "lazy" &&
    "getter" in resolved &&
    typeof resolved.getter === "function"
  ) {
    const next: unknown = resolved.getter(null);
    if (!isSchemaLike(next) || !("kind" in next)) {
      throw new Error("Lazy union options must resolve to a schema");
    }
    // A lazy getter always returns a schema.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    resolved = next as GenericSchema;
  }
  if (!isObjectLike(resolved)) {
    throw new Error(
      `Union options must be object schemas, received "${resolved.type}"`
    );
  }
  return resolved;
}

/**
 * Returns the option schemas of a `union()` schema, in declaration order.
 *
 * Hint: This looks through the lazy wrapper and the validation structure the
 * union is built from, so it also works on a union that has been piped with
 * further actions.
 *
 * @param schema The union schema.
 *
 * @returns The options, or an empty array if the schema is not a union.
 */
export function getUnionOptions(schema: object): readonly UnionOption[] {
  let current: unknown = schema;
  for (;;) {
    if (!isSchemaLike(current)) {
      return [];
    }
    const options = "options" in current ? current.options : null;
    if (current.type === "variant" && Array.isArray(options)) {
      return options.filter(
        (option): option is UnionOption =>
          isSchemaLike(option) &&
          (option.type === "lazy" ||
            option.type === "object" ||
            option.type === "loose_object" ||
            option.type === "strict_object" ||
            option.type === "object_with_rest")
      );
    }
    if (
      current.type === "lazy" &&
      "getter" in current &&
      typeof current.getter === "function"
    ) {
      current = current.getter(null);
    } else if ("pipe" in current && Array.isArray(current.pipe)) {
      [current] = current.pipe;
    } else if (current.type === "union" && Array.isArray(options)) {
      [current] = options;
    } else {
      return [];
    }
  }
}

/**
 * Checks whether a value is an object with a `$type` field.
 *
 * @param input The value to check.
 *
 * @returns Whether it has a `$type` field.
 */
function hasType(input: unknown): boolean {
  return typeof input === "object" && input !== null && "$type" in input;
}

/**
 * Builds the schema that performs union validation.
 *
 * @param options The union options.
 * @param closed Whether the union is closed.
 *
 * @returns The schema.
 */
function buildUnion(
  options: readonly UnionOption[],
  closed: boolean
): GenericSchema {
  const resolved = options.map(resolveUnionOption);
  const names = resolved.map((option) => {
    const name = getTypeName(option);
    if (name === null) {
      throw new Error(
        "Union options must declare a `$type` entry with a string literal"
      );
    }
    return name;
  });
  const known: GenericSchema = pipe(
    // The options are validated to carry a `$type` entry above.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    variant("$type", resolved as unknown as VariantOptions<"$type">),
    check(hasType, "Invalid union: Expected an object with a $type field")
  );
  if (closed) {
    return known;
  }
  if (names.length === 0) {
    return looseObject({ $type: string() });
  }
  return unionSchema([
    known,
    looseObject({ $type: pipe(string(), notValues(names)) })
  ]);
}

/**
 * Creates a [union](https://atproto.com/specs/lexicon#union) schema.
 *
 * A Lexicon union is a choice between several object definitions,
 * discriminated by the `$type` field of the data. For example a post embed
 * may be `app.bsky.embed.images`, `app.bsky.embed.external`, and so on. Each
 * option you pass must declare a `$type` literal entry (optionally wrapped
 * in `v.optional()`), which this schema makes required and uses to pick the
 * matching option.
 *
 * Hint: Unions are *open* by default: an object whose `$type` matches none
 * of the options is still accepted, so that Lexicons can add variants without
 * breaking older clients. Pass `{ closed: true }` to reject unknown types.
 *
 * Hint: The union is built lazily so that options can reference definitions
 * declared later in the module, including the union itself.
 *
 * @param options The object schemas to choose from.
 * @param config The union config.
 *
 * @returns A union schema.
 */
// @__NO_SIDE_EFFECTS__
export function union<
  const TOptions extends readonly UnionOption[],
  const TClosed extends boolean = false
>(
  options: TOptions,
  config?: UnionConfig<TClosed>
): UnionSchema<TOptions, TClosed> {
  const closed = config?.closed === true;
  let built: GenericSchema | null = null;
  // The static type is derived from the options, the runtime schema is not.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return pipe(
    lazy(() => (built ??= buildUnion(options, closed))),
    metadata({ lexicon: { type: "union", closed } })
  ) as UnionSchema<TOptions, TClosed>;
}
