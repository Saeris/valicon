import type { GenericSchema } from "valibot";
import type { XrpcDefinition } from "../definitions/index.js";
import {
  getTypeName,
  getUnionOptions,
  resolveUnionOption
} from "../schemas/union.js";
import type {
  LexArray,
  LexArrayItem,
  LexiconDoc,
  LexObject,
  LexObjectProperty,
  LexRefUnion,
  LexStringFormat,
  LexUserType,
  LexXrpcBody,
  LexXrpcParameters,
  LexXrpcProcedure,
  LexXrpcQuery,
  LexXrpcSubscription,
  ObjectLikeSchema,
  RecordKeyType
} from "../types/index.js";
import {
  getLexiconMetadata,
  getPipeItems,
  splitLexRef,
  toAbsoluteLexRef,
  toRelativeLexRef
} from "../utils/index.js";

/**
 * Lexicon definition type. A Valibot schema or an XRPC definition.
 */
export type LexiconDefinition = GenericSchema | XrpcDefinition;

/**
 * To Lexicon input type. A single primary definition (used as `main`) or a
 * map of definition names to definitions.
 */
export type ToLexiconInput =
  | LexiconDefinition
  | Readonly<Record<string, LexiconDefinition>>;

/**
 * To Lexicon config interface.
 */
export interface ToLexiconConfig {
  /**
   * The NSID of the document. Inferred from the `$type` literal of the
   * definitions when omitted.
   */
  readonly id?: string;
  /**
   * The description of the document.
   */
  readonly description?: string;
  /**
   * The policy for handling schemas and actions that cannot be converted.
   * Defaults to `throw`.
   */
  readonly errorMode?: "ignore" | "throw" | "warn";
}

/**
 * Conversion context interface.
 */
interface Context {
  readonly id: string;
  readonly config: ToLexiconConfig | undefined;
  readonly defs: Map<string, LexUserType>;
  readonly names: Map<unknown, string>;
  readonly queued: Set<string>;
  readonly queue: Array<readonly [string, LexiconDefinition]>;
}

/**
 * Pipeline action interface.
 */
interface Action {
  readonly kind: string;
  readonly type: string;
  readonly requirement?: unknown;
  readonly description?: unknown;
  readonly metadata?: unknown;
}

/**
 * A schema split into its base schema and its pipeline actions.
 */
interface SplitSchema {
  readonly base: GenericSchema;
  readonly actions: readonly Action[];
}

/**
 * The string formats keyed by the Valicon action type.
 */
const FORMATS: Readonly<Record<string, LexStringFormat>> = {
  at_identifier: "at-identifier",
  at_uri: "at-uri",
  cid: "cid",
  datetime: "datetime",
  did: "did",
  did_plc: "did",
  did_web: "did",
  handle: "handle",
  language: "language",
  nsid: "nsid",
  record_key: "record-key",
  tid: "tid",
  uri: "uri"
};

/**
 * Throws an error or logs a warning based on the configuration.
 *
 * @param message The message to throw or log.
 * @param config The conversion configuration.
 */
function handleError(
  message: string,
  config: ToLexiconConfig | undefined
): void {
  if (config?.errorMode === "warn") {
    console.warn(message);
  } else if (config?.errorMode !== "ignore") {
    throw new Error(message);
  }
}

/**
 * Reads a property of an object without type information.
 *
 * @param value The object.
 * @param key The property key.
 *
 * @returns The property value.
 */
function prop(value: object, key: string): unknown {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (value as Record<string, unknown>)[key];
}

/**
 * Checks whether a value is an XRPC definition.
 *
 * @param value The value to check.
 *
 * @returns Whether it is an XRPC definition.
 */
function isDefinition(value: unknown): value is XrpcDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    prop(value, "kind") === "definition"
  );
}

/**
 * Checks whether a value is a Valibot schema.
 *
 * @param value The value to check.
 *
 * @returns Whether it is a schema.
 */
function isSchema(value: unknown): value is GenericSchema {
  return (
    typeof value === "object" &&
    value !== null &&
    prop(value, "kind") === "schema"
  );
}

/**
 * Checks whether a value is a pipeline action.
 *
 * @param value The value to check.
 *
 * @returns Whether it is an action.
 */
function isAction(value: unknown): value is Action {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof prop(value, "kind") === "string" &&
    typeof prop(value, "type") === "string"
  );
}

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
 * Checks whether a string is a record key type.
 *
 * @param value The string to check.
 *
 * @returns Whether it is a record key type.
 */
function isRecordKeyType(value: string): value is RecordKeyType {
  return (
    value === "tid" ||
    value === "nsid" ||
    value === "any" ||
    value.startsWith("literal:")
  );
}

/**
 * Splits a schema into its outermost base schema and actions, without
 * flattening nested pipelines.
 *
 * @param schema The schema to split.
 *
 * @returns The split schema.
 */
function splitOuter(schema: GenericSchema): SplitSchema {
  const [base, ...rest] = getPipeItems(schema);
  // The first pipe item of a Valibot pipe is always a schema.
  /* istanbul ignore next */
  return {
    base: isSchema(base) ? base : schema,
    actions: rest.filter(isAction)
  };
}

/**
 * Splits a schema into its innermost base schema and all actions of every
 * nested pipeline, outermost actions last.
 *
 * @param schema The schema to split.
 *
 * @returns The split schema.
 */
function splitDeep(schema: GenericSchema): SplitSchema {
  const actions: Action[] = [];
  let current = schema;
  for (;;) {
    const outer = splitOuter(current);
    actions.unshift(...outer.actions);
    if (outer.base === current) {
      return { base: current, actions };
    }
    current = outer.base;
  }
}

/**
 * Resolves lazy schemas.
 *
 * @param schema The schema to resolve.
 *
 * @returns The resolved schema.
 */
function resolveLazy(schema: GenericSchema): GenericSchema {
  let resolved = schema;
  while (resolved.type === "lazy") {
    const getter = prop(resolved, "getter");
    // A Valibot lazy schema always has a getter that returns a schema.
    /* istanbul ignore next */
    if (typeof getter !== "function") {
      return resolved;
    }
    const next: unknown = getter(null);
    /* istanbul ignore next */
    if (!isSchema(next)) {
      return resolved;
    }
    resolved = next;
  }
  return resolved;
}

/**
 * Returns the description declared by the actions, if any.
 *
 * @param actions The pipeline actions.
 *
 * @returns The description.
 */
function getDescription(actions: readonly Action[]): string | null {
  let description: string | null = null;
  for (const action of actions) {
    if (
      action.type === "description" &&
      typeof action.description === "string"
    ) {
      description = action.description;
    }
  }
  return description;
}

/**
 * Returns the fully qualified reference of a definition schema, if it is one.
 * Object definitions are identified by their `$type` literal, other
 * definitions by `id()` metadata.
 *
 * @param schema The schema to inspect.
 *
 * @returns The reference, or `null`.
 */
function getDefinitionRef(schema: GenericSchema): string | null {
  let current = schema;
  for (;;) {
    const metadata = getLexiconMetadata(current);
    if (typeof metadata?.id === "string") {
      return metadata.id;
    }
    // Inline Lexicon types such as blobs carry a `$type` that is not a
    // reference (`"blob"`), so they are never treated as definitions.
    if (metadata?.type !== void 0 && metadata.type !== "record") {
      return null;
    }
    const resolved = resolveLazy(splitOuter(current).base);
    if (isObjectLike(resolved)) {
      const name = getTypeName(resolved);
      if (name !== null) {
        return name;
      }
    }
    if (resolved === current) {
      return null;
    }
    current = resolved;
  }
}

/**
 * Converts a reference to its relative form and queues the referenced
 * definition for conversion when it belongs to this document.
 *
 * @param schema The referenced schema.
 * @param ref The fully qualified reference.
 * @param context The conversion context.
 *
 * @returns The relative reference.
 */
function addReference(
  schema: GenericSchema,
  ref: string,
  context: Context
): string {
  const { nsid, name } = splitLexRef(toAbsoluteLexRef(ref, context.id));
  if (
    nsid === context.id &&
    !context.defs.has(name) &&
    !context.queued.has(name)
  ) {
    context.queued.add(name);
    context.queue.push([name, schema]);
    context.names.set(schema, name);
  }
  return toRelativeLexRef(ref, context.id);
}

/**
 * Splits a reference usage into the referenced definition and the actions
 * that describe this particular usage.
 *
 * A definition is either passed to `toLexicon()` explicitly, discovered
 * earlier, or a schema whose own pipeline declares its `$type`. Wrapping such
 * a definition in another `v.pipe()` describes the usage, not the definition.
 *
 * @param schema The property schema.
 * @param context The conversion context.
 *
 * @returns The definition schema and the usage actions.
 */
function splitUsage(
  schema: GenericSchema,
  context: Context
): { readonly definition: GenericSchema; readonly actions: readonly Action[] } {
  if (context.names.has(schema)) {
    return { definition: schema, actions: [] };
  }
  const outer = splitOuter(schema);
  if (
    outer.base !== schema &&
    (context.names.has(outer.base) ||
      outer.base.type === "lazy" ||
      "pipe" in outer.base)
  ) {
    return { definition: outer.base, actions: outer.actions };
  }
  return { definition: schema, actions: [] };
}

/**
 * Queues an anonymous object schema as a named definition.
 *
 * @param schema The object schema.
 * @param key The property key to derive the name from.
 * @param context The conversion context.
 *
 * @returns The relative reference.
 */
function hoist(schema: GenericSchema, key: string, context: Context): string {
  let name = context.names.get(schema);
  if (name === void 0) {
    name = key;
    for (
      let count = 2;
      context.defs.has(name) || context.queued.has(name);
      count++
    ) {
      name = `${key}${count}`;
    }
    context.names.set(schema, name);
    context.queued.add(name);
    context.queue.push([name, schema]);
  }
  return `#${name}`;
}

/**
 * Converts a `union()` schema to a Lexicon union.
 *
 * @param split The split union schema.
 * @param closed Whether the union is closed.
 * @param context The conversion context.
 *
 * @returns The Lexicon union.
 */
function convertUnion(
  split: SplitSchema,
  closed: boolean,
  context: Context
): LexRefUnion {
  const refs = getUnionOptions(split.base).map((option) => {
    const resolved = resolveUnionOption(option);
    const name = getTypeName(resolved);
    // `union()` already rejects options without a `$type` literal when the
    // options are read above.
    /* istanbul ignore next */
    if (name === null) {
      throw new Error("Union options must declare a `$type` literal");
    }
    return addReference(resolved, name, context);
  });
  const description = getDescription(split.actions);
  return {
    type: "union",
    ...(description === null ? {} : { description }),
    refs,
    ...(closed ? { closed } : {})
  };
}

/**
 * Reports an action that has no Lexicon equivalent.
 *
 * @param action The action.
 * @param context The conversion context.
 */
function reportUnsupportedAction(action: Action, context: Context): void {
  if (action.kind === "validation" || action.kind === "transformation") {
    handleError(
      `The "${action.type}" action cannot be converted to Lexicon.`,
      context.config
    );
  }
}

/**
 * Converts a string schema to a Lexicon string.
 *
 * @param split The split schema.
 * @param context The conversion context.
 *
 * @returns The Lexicon string.
 */
function convertString(
  split: SplitSchema,
  context: Context
): LexObjectProperty {
  const result: {
    type: "string";
    format?: LexStringFormat;
    description?: string;
    minLength?: number;
    maxLength?: number;
    minGraphemes?: number;
    maxGraphemes?: number;
    enum?: string[];
    const?: string;
    knownValues?: string[];
  } = { type: "string" };
  let knownValues = getKnownValues({
    lexicon: getLexiconMetadata(split.base)
  });
  for (const action of split.actions) {
    const { type, requirement } = action;
    const format = FORMATS[type];
    if (format) {
      result.format = format;
    } else if (type === "min_bytes" && typeof requirement === "number") {
      result.minLength = requirement;
    } else if (type === "max_bytes" && typeof requirement === "number") {
      result.maxLength = requirement;
    } else if (type === "non_empty") {
      result.minLength = 1;
    } else if (type === "min_graphemes" && typeof requirement === "number") {
      result.minGraphemes = requirement;
    } else if (type === "max_graphemes" && typeof requirement === "number") {
      result.maxGraphemes = requirement;
    } else if (type === "values" && Array.isArray(requirement)) {
      result.enum = requirement.filter(
        (value): value is string => typeof value === "string"
      );
    } else if (type === "value" && typeof requirement === "string") {
      result.const = requirement;
    } else if (type === "metadata") {
      const values = getKnownValues(action.metadata);
      if (values) {
        knownValues = values;
      }
    } else if (
      type === "min_length" ||
      type === "max_length" ||
      type === "length"
    ) {
      handleError(
        `The "${type}" action counts UTF-16 code units and cannot be converted to Lexicon. Use "minBytes"/"maxBytes" or "minGraphemes"/"maxGraphemes" instead.`,
        context.config
      );
    } else {
      reportUnsupportedAction(action, context);
    }
  }
  const description = getDescription(split.actions);
  if (description !== null) {
    result.description = description;
  }
  if (knownValues) {
    result.knownValues = [...knownValues];
  }
  return result;
}

/**
 * Reads known values from a metadata object.
 *
 * @param metadata The metadata object.
 *
 * @returns The known values, if any.
 */
function getKnownValues(metadata: unknown): readonly string[] | null {
  // Valibot metadata is always an object.
  /* istanbul ignore else */
  if (typeof metadata === "object" && metadata !== null) {
    const lexicon = prop(metadata, "lexicon");
    if (typeof lexicon === "object" && lexicon !== null) {
      const knownValues = prop(lexicon, "knownValues");
      if (Array.isArray(knownValues)) {
        return knownValues.filter(
          (value): value is string => typeof value === "string"
        );
      }
    }
  }
  return null;
}

/**
 * Converts a number schema to a Lexicon integer.
 *
 * @param split The split schema.
 * @param context The conversion context.
 *
 * @returns The Lexicon integer.
 */
function convertInteger(
  split: SplitSchema,
  context: Context
): LexObjectProperty {
  const result: {
    type: "integer";
    description?: string;
    minimum?: number;
    maximum?: number;
    enum?: number[];
    const?: number;
  } = { type: "integer" };
  let isInteger = false;
  for (const action of split.actions) {
    const { type, requirement } = action;
    if (type === "integer" || type === "safe_integer") {
      isInteger = true;
    } else if (type === "min_value" && typeof requirement === "number") {
      result.minimum = requirement;
    } else if (type === "max_value" && typeof requirement === "number") {
      result.maximum = requirement;
    } else if (type === "values" && Array.isArray(requirement)) {
      result.enum = requirement.filter(
        (value): value is number => typeof value === "number"
      );
    } else if (type === "value" && typeof requirement === "number") {
      result.const = requirement;
    } else {
      reportUnsupportedAction(action, context);
    }
  }
  if (!isInteger) {
    handleError(
      'Lexicon has no floating point type. Add the "integer" action to number schemas.',
      context.config
    );
  }
  const description = getDescription(split.actions);
  if (description !== null) {
    result.description = description;
  }
  return result;
}

/**
 * Converts an array schema to a Lexicon array.
 *
 * @param split The split schema.
 * @param key The property key.
 * @param context The conversion context.
 *
 * @returns The Lexicon array.
 */
function convertArray(
  split: SplitSchema,
  key: string,
  context: Context
): LexArray {
  const item = prop(split.base, "item");
  let items: LexArrayItem = { type: "unknown" };
  // A Valibot array schema always carries an item schema.
  /* istanbul ignore else */
  if (isSchema(item)) {
    const converted = convertValue(item, key, context);
    if (converted.type === "array") {
      handleError("Lexicon arrays cannot be nested.", context.config);
    } else {
      items = converted;
    }
  }
  const result: {
    type: "array";
    description?: string;
    items: LexArrayItem;
    minLength?: number;
    maxLength?: number;
  } = { type: "array", items };
  for (const action of split.actions) {
    const { type, requirement } = action;
    if (type === "min_length" && typeof requirement === "number") {
      result.minLength = requirement;
    } else if (type === "max_length" && typeof requirement === "number") {
      result.maxLength = requirement;
    } else if (type === "non_empty") {
      result.minLength = 1;
    } else {
      reportUnsupportedAction(action, context);
    }
  }
  const description = getDescription(split.actions);
  if (description !== null) {
    result.description = description;
  }
  return result;
}

/**
 * Attaches a description to a Lexicon type.
 *
 * @param def The Lexicon type.
 * @param description The description.
 *
 * @returns The Lexicon type.
 */
function withDescription<const TDef extends object>(
  def: TDef,
  description: string | null
): TDef | (TDef & { readonly description: string }) {
  return description === null ? def : { ...def, description };
}

/**
 * Converts a schema used as a property, array item or body to a Lexicon type.
 *
 * @param schema The schema to convert.
 * @param key The property key, used to name hoisted definitions.
 * @param context The conversion context.
 *
 * @returns The Lexicon type.
 */
function convertValue(
  schema: GenericSchema,
  key: string,
  context: Context
): LexObjectProperty {
  const ref = getDefinitionRef(schema);
  if (ref !== null) {
    const { definition, actions } = splitUsage(schema, context);
    return withDescription(
      { type: "ref", ref: addReference(definition, ref, context) },
      getDescription(actions)
    );
  }
  return convertInline(schema, key, context);
}

/**
 * Converts a schema to a Lexicon type without checking whether it is a
 * reference to a definition.
 *
 * @param schema The schema to convert.
 * @param key The property key, used to name hoisted definitions.
 * @param context The conversion context.
 *
 * @returns The Lexicon type.
 */
function convertInline(
  schema: GenericSchema,
  key: string,
  context: Context
): LexObjectProperty {
  const metadata = getLexiconMetadata(schema);
  const outer = splitOuter(schema);
  const deep = splitDeep(schema);
  const description = getDescription(deep.actions);
  if (metadata?.type === "blob") {
    const accept = prop(metadata, "accept");
    const maxSize = prop(metadata, "maxSize");
    return withDescription(
      {
        type: "blob",
        ...(Array.isArray(accept)
          ? {
              accept: accept.filter(
                (value): value is string => typeof value === "string"
              )
            }
          : {}),
        ...(typeof maxSize === "number" ? { maxSize } : {})
      },
      description
    );
  }
  if (metadata?.type === "bytes") {
    const minLength = prop(metadata, "minLength");
    const maxLength = prop(metadata, "maxLength");
    return withDescription(
      {
        type: "bytes",
        ...(typeof minLength === "number" ? { minLength } : {}),
        ...(typeof maxLength === "number" ? { maxLength } : {})
      },
      description
    );
  }
  if (metadata?.type === "cid-link") {
    return withDescription({ type: "cid-link" }, description);
  }
  if (metadata?.type === "unknown") {
    return withDescription({ type: "unknown" }, description);
  }
  if (metadata?.type === "union") {
    return convertUnion(outer, prop(metadata, "closed") === true, context);
  }
  if (metadata?.type === "token") {
    handleError(
      "Tokens cannot be used as properties. Reference them by name in knownValues instead.",
      context.config
    );
    return { type: "unknown" };
  }
  const base = resolveLazy(deep.base);
  switch (base.type) {
    case "string": {
      return convertString({ base, actions: deep.actions }, context);
    }
    case "number": {
      return convertInteger({ base, actions: deep.actions }, context);
    }
    case "boolean": {
      const constant = deep.actions.find((action) => action.type === "value");
      return withDescription(
        {
          type: "boolean",
          ...(typeof constant?.requirement === "boolean"
            ? { const: constant.requirement }
            : {})
        },
        description
      );
    }
    case "literal": {
      const literal = prop(base, "literal");
      if (typeof literal === "string") {
        return withDescription({ type: "string", const: literal }, description);
      }
      if (typeof literal === "number") {
        return withDescription(
          { type: "integer", const: literal },
          description
        );
      }
      if (typeof literal === "boolean") {
        return withDescription(
          { type: "boolean", const: literal },
          description
        );
      }
      break;
    }
    case "picklist": {
      const options = prop(base, "options");
      // A Valibot picklist always carries an options array.
      /* istanbul ignore else */
      if (Array.isArray(options)) {
        if (options.every((option) => typeof option === "string")) {
          return withDescription(
            { type: "string", enum: [...options] },
            description
          );
        }
        if (options.every((option) => typeof option === "number")) {
          return withDescription(
            { type: "integer", enum: [...options] },
            description
          );
        }
      }
      break;
    }
    case "array": {
      return convertArray({ base, actions: deep.actions }, key, context);
    }
    case "any":
    case "unknown":
    case "record": {
      return withDescription({ type: "unknown" }, description);
    }
    case "loose_object":
    case "object":
    case "object_with_rest":
    case "strict_object": {
      return withDescription(
        { type: "ref", ref: hoist(schema, key, context) },
        getDescription(outer.actions)
      );
    }
    case "union":
    case "variant": {
      handleError(
        'Lexicon unions must be created with the "union" function of Valicon so that their variants can be referenced by "$type".',
        context.config
      );
      return { type: "unknown" };
    }
    default: {
      break;
    }
  }
  handleError(
    `The "${base.type}" schema cannot be converted to Lexicon.`,
    context.config
  );
  return { type: "unknown" };
}

/**
 * Unwrapped property interface.
 */
interface UnwrappedProperty {
  readonly schema: GenericSchema;
  readonly required: boolean;
  readonly nullable: boolean;
  readonly hasDefault: boolean;
  readonly defaultValue: unknown;
}

/**
 * Unwraps `optional`, `nullable` and `nullish` wrappers around a property
 * schema.
 *
 * @param schema The property schema.
 *
 * @returns The unwrapped property.
 */
function unwrapProperty(schema: GenericSchema): UnwrappedProperty {
  let current = schema;
  let required = true;
  let nullable = false;
  let hasDefault = false;
  let defaultValue: unknown = null;
  for (;;) {
    const { type } = current;
    if (
      type === "optional" ||
      type === "exact_optional" ||
      type === "undefinedable"
    ) {
      required = false;
    } else if (type === "nullable") {
      nullable = true;
    } else if (type === "nullish") {
      required = false;
      nullable = true;
    } else {
      break;
    }
    const default_ = prop(current, "default");
    if (default_ !== void 0) {
      hasDefault = true;
      // A default can be a value or a function returning the value.
      defaultValue = typeof default_ === "function" ? default_() : default_;
    }
    const wrapped = prop(current, "wrapped");
    // Valibot wrapper schemas always wrap a schema.
    /* istanbul ignore next */
    if (!isSchema(wrapped)) {
      break;
    }
    current = wrapped;
  }
  return { schema: current, required, nullable, hasDefault, defaultValue };
}

/**
 * Converted entries interface.
 */
interface ConvertedEntries {
  readonly required: string[];
  readonly nullable: string[];
  readonly properties: Record<string, LexObjectProperty>;
}

/**
 * Converts the entries of an object schema to Lexicon properties.
 *
 * @param base The object schema.
 * @param context The conversion context.
 * @param allowNullable Whether `nullable` is allowed (not for params).
 *
 * @returns The required and nullable lists and the properties.
 */
function convertEntries(
  base: ObjectLikeSchema,
  context: Context,
  allowNullable: boolean
): ConvertedEntries {
  const required: string[] = [];
  const nullable: string[] = [];
  // Maps keep the accumulators in one hidden class however many properties a
  // definition has; they are converted to plain objects once at the end.
  const properties = new Map<string, LexObjectProperty>();
  for (const [key, entry] of Object.entries(base.entries)) {
    if (key !== "$type") {
      const unwrapped = unwrapProperty(entry);
      let def = convertValue(unwrapped.schema, key, context);
      if (unwrapped.required) {
        required.push(key);
      }
      if (unwrapped.nullable) {
        if (allowNullable) {
          nullable.push(key);
        } else {
          handleError("XRPC parameters cannot be nullable.", context.config);
        }
      }
      if (unwrapped.hasDefault) {
        const { defaultValue } = unwrapped;
        if (def.type === "string" && typeof defaultValue === "string") {
          def = { ...def, default: defaultValue };
        } else if (def.type === "integer" && typeof defaultValue === "number") {
          def = { ...def, default: defaultValue };
        } else if (
          def.type === "boolean" &&
          typeof defaultValue === "boolean"
        ) {
          def = { ...def, default: defaultValue };
        } else {
          handleError(
            `Only string, integer and boolean properties can have a default value, not "${key}".`,
            context.config
          );
        }
      }
      properties.set(key, def);
    }
  }
  return { required, nullable, properties: Object.fromEntries(properties) };
}

/**
 * Converts an object schema to a Lexicon object.
 *
 * @param base The object schema.
 * @param description The description.
 * @param context The conversion context.
 *
 * @returns The Lexicon object.
 */
function convertObject(
  base: ObjectLikeSchema,
  description: string | null,
  context: Context
): LexObject {
  const { required, nullable, properties } = convertEntries(
    base,
    context,
    true
  );
  return {
    type: "object",
    ...(description === null ? {} : { description }),
    ...(required.length > 0 ? { required } : {}),
    ...(nullable.length > 0 ? { nullable } : {}),
    properties
  };
}

/**
 * Converts a parameters schema to Lexicon params.
 *
 * @param schema The parameters schema.
 * @param context The conversion context.
 *
 * @returns The Lexicon params.
 */
function convertParams(
  schema: GenericSchema,
  context: Context
): LexXrpcParameters {
  const deep = splitDeep(schema);
  const base = resolveLazy(deep.base);
  if (!isObjectLike(base)) {
    handleError("XRPC parameters must be an object schema.", context.config);
    return { type: "params", properties: {} };
  }
  const description = getDescription(deep.actions);
  const { required, properties } = convertEntries(base, context, false);
  const params: Record<string, LexXrpcParameters["properties"][string]> = {};
  for (const [key, def] of Object.entries(properties)) {
    if (
      def.type === "boolean" ||
      def.type === "integer" ||
      def.type === "string" ||
      def.type === "unknown"
    ) {
      params[key] = def;
    } else if (
      def.type === "array" &&
      (def.items.type === "boolean" ||
        def.items.type === "integer" ||
        def.items.type === "string" ||
        def.items.type === "unknown")
    ) {
      params[key] = { ...def, items: def.items };
    } else {
      handleError(
        `XRPC parameters can only be primitives or arrays of primitives, not "${key}".`,
        context.config
      );
    }
  }
  return {
    type: "params",
    ...(description === null ? {} : { description }),
    ...(required.length > 0 ? { required } : {}),
    properties: params
  };
}

/**
 * XRPC body input interface.
 */
interface BodyInput {
  readonly encoding: string;
  readonly schema?: GenericSchema | undefined;
  readonly description?: string | undefined;
}

/**
 * Converts an XRPC body to a Lexicon body.
 *
 * @param body The XRPC body.
 * @param key The key used to name hoisted definitions.
 * @param context The conversion context.
 *
 * @returns The Lexicon body.
 */
function convertBody(
  body: BodyInput,
  key: string,
  context: Context
): LexXrpcBody {
  return {
    ...(typeof body.description === "string"
      ? { description: body.description }
      : {}),
    encoding: body.encoding,
    ...(body.schema
      ? { schema: convertBodySchema(body.schema, key, context) }
      : {})
  };
}

/**
 * Converts the schema of an XRPC body or message.
 *
 * @param schema The schema.
 * @param key The key used to name hoisted definitions.
 * @param context The conversion context.
 *
 * @returns The Lexicon body schema.
 */
function convertBodySchema(
  schema: GenericSchema,
  key: string,
  context: Context
): NonNullable<LexXrpcBody["schema"]> {
  const ref = getDefinitionRef(schema);
  if (ref !== null) {
    return { type: "ref", ref: addReference(schema, ref, context) };
  }
  const metadata = getLexiconMetadata(schema);
  if (metadata?.type === "union") {
    return convertUnion(
      splitOuter(schema),
      prop(metadata, "closed") === true,
      context
    );
  }
  const deep = splitDeep(schema);
  const base = resolveLazy(deep.base);
  if (isObjectLike(base)) {
    return convertObject(base, getDescription(deep.actions), context);
  }
  handleError(
    `XRPC bodies must be an object, a reference or a union schema, not "${key}".`,
    context.config
  );
  return { type: "object", properties: {} };
}

/**
 * Converts an XRPC definition.
 *
 * @param definition The XRPC definition.
 * @param context The conversion context.
 *
 * @returns The Lexicon type.
 */
function convertXrpc(
  definition: XrpcDefinition,
  context: Context
): LexXrpcProcedure | LexXrpcQuery | LexXrpcSubscription {
  const common = {
    ...(definition.description ? { description: definition.description } : {}),
    ...(definition.parameters
      ? { parameters: convertParams(definition.parameters, context) }
      : {})
  };
  const errors = definition.errors
    ? { errors: definition.errors.map((error) => ({ ...error })) }
    : {};
  switch (definition.type) {
    case "query": {
      return {
        type: "query",
        ...common,
        ...(definition.output
          ? { output: convertBody(definition.output, "output", context) }
          : {}),
        ...errors
      };
    }
    case "procedure": {
      return {
        type: "procedure",
        ...common,
        ...(definition.input
          ? { input: convertBody(definition.input, "input", context) }
          : {}),
        ...(definition.output
          ? { output: convertBody(definition.output, "output", context) }
          : {}),
        ...errors
      };
    }
    case "subscription": {
      const { message } = definition;
      let messageDef: LexXrpcSubscription["message"] | null = null;
      if (message) {
        const schema = convertBodySchema(message.schema, "message", context);
        if (schema.type === "union") {
          messageDef = {
            ...(message.description
              ? { description: message.description }
              : {}),
            schema
          };
        } else {
          handleError(
            "Subscription messages must be a union schema.",
            context.config
          );
        }
      }
      return {
        type: "subscription",
        ...common,
        ...(messageDef ? { message: messageDef } : {}),
        ...errors
      };
    }
  }
}

/**
 * Converts a named definition.
 *
 * @param definition The definition.
 * @param name The definition name.
 * @param context The conversion context.
 *
 * @returns The Lexicon type.
 */
function convertDefinition(
  definition: LexiconDefinition,
  name: string,
  context: Context
): LexUserType {
  if (isDefinition(definition)) {
    return convertXrpc(definition, context);
  }
  const metadata = getLexiconMetadata(definition);
  const deep = splitDeep(definition);
  const description = getDescription(deep.actions);
  const base = resolveLazy(deep.base);
  if (metadata?.type === "record") {
    const key = prop(metadata, "key");
    if (!isObjectLike(base)) {
      handleError("Records must wrap an object schema.", context.config);
      return { type: "record", record: { type: "object", properties: {} } };
    }
    return {
      type: "record",
      ...(description === null ? {} : { description }),
      ...(typeof key === "string" && isRecordKeyType(key) ? { key } : {}),
      record: convertObject(base, null, context)
    };
  }
  if (metadata?.type === "token") {
    return withDescription({ type: "token" }, description);
  }
  if (
    metadata?.type !== "blob" &&
    metadata?.type !== "bytes" &&
    metadata?.type !== "cid-link" &&
    metadata?.type !== "unknown" &&
    metadata?.type !== "union" &&
    isObjectLike(base)
  ) {
    return convertObject(base, description, context);
  }
  const converted = convertInline(definition, name, context);
  if (converted.type === "ref" || converted.type === "union") {
    handleError(
      `The definition "${name}" cannot be a reference or union.`,
      context.config
    );
    return { type: "unknown" };
  }
  return converted;
}

/**
 * Infers the document NSID from the definitions.
 *
 * @param defs The definitions.
 *
 * @returns The NSID, or `null`.
 */
function inferId(
  defs: Readonly<Record<string, LexiconDefinition>>
): string | null {
  for (const definition of Object.values(defs)) {
    if (isDefinition(definition)) {
      return definition.id;
    }
    const ref = getDefinitionRef(definition);
    if (ref !== null) {
      return splitLexRef(ref).nsid;
    }
    if (getLexiconMetadata(definition)?.type === "token") {
      const literal = prop(splitDeep(definition).base, "literal");
      // `token()` is built on a string literal.
      /* istanbul ignore else */
      if (typeof literal === "string") {
        return splitLexRef(literal).nsid;
      }
    }
  }
  return null;
}

/**
 * Converts Valibot schemas to a [Lexicon](https://atproto.com/specs/lexicon)
 * document.
 *
 * Pass a single primary definition (a `record()`, `query()`, `procedure()`
 * or `subscription()`) to use it as `main`, or a map of definition names to
 * schemas for documents with several definitions. Any object schema that
 * declares a `$type` literal in the namespace of this document is discovered
 * and added to `defs` automatically; anonymous nested objects are hoisted
 * into definitions named after their property key.
 *
 * Hint: Lexicon string length limits count UTF-8 bytes, so use `v.maxBytes()`
 * and `v.maxGraphemes()` rather than `v.maxLength()`. Integers need
 * `v.integer()`, because Lexicon has no float type.
 *
 * @param input The definitions to convert.
 * @param config The conversion config.
 *
 * @returns The Lexicon document.
 */
export function toLexicon(
  input: ToLexiconInput,
  config?: ToLexiconConfig
): LexiconDoc {
  const defs: Readonly<Record<string, LexiconDefinition>> =
    isSchema(input) || isDefinition(input) ? { main: input } : input;
  const id = config?.id ?? inferId(defs);
  if (id === null) {
    throw new Error(
      'Unable to infer the Lexicon NSID. Pass the "id" option or add a "$type" literal to a definition.'
    );
  }
  const context: Context = {
    id,
    config,
    defs: new Map(),
    names: new Map(),
    queued: new Set(Object.keys(defs)),
    queue: Object.entries(defs)
  };
  for (const [name, definition] of Object.entries(defs)) {
    context.names.set(definition, name);
  }
  while (context.queue.length > 0) {
    const [name, definition] = context.queue.shift()!;
    context.defs.set(name, convertDefinition(definition, name, context));
  }
  return {
    lexicon: 1,
    id,
    ...(config?.description ? { description: config.description } : {}),
    defs: Object.fromEntries(context.defs)
  };
}
