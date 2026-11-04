import type {
  LexArray,
  LexiconDoc,
  LexObject,
  LexObjectProperty,
  LexRecord,
  LexUserType,
  LexXrpcBody,
  LexXrpcError,
  LexXrpcParameters,
  LexXrpcProcedure,
  LexXrpcQuery,
  LexXrpcSubscription,
  ObjectMode
} from "../types/index.js";
import { joinLexRef, splitLexRef } from "../utils/index.js";

/**
 * A call to a Valibot (`v.*`) or Valicon (`lex.*`) function.
 */
export interface CallExpr {
  readonly kind: "call";
  readonly callee: `lex.${string}` | `v.${string}`;
  readonly args: readonly Expr[];
}

/**
 * A JSON literal value.
 */
export interface ValueExpr {
  readonly kind: "value";
  readonly value: boolean | number | string | null;
}

/**
 * An array literal.
 */
export interface ArrayExpr {
  readonly kind: "array";
  readonly items: readonly Expr[];
}

/**
 * An object literal.
 */
export interface ObjectExpr {
  readonly kind: "object";
  readonly entries: ReadonlyArray<readonly [string, Expr]>;
}

/**
 * A reference to a definition of the same document. Lazy references break
 * cycles between definitions.
 */
export interface LocalExpr {
  readonly kind: "local";
  readonly name: string;
  readonly lazy: boolean;
}

/**
 * A reference to a definition of another document. Always resolved lazily,
 * because modules may import each other.
 */
export interface ExternalExpr {
  readonly kind: "external";
  readonly nsid: string;
  readonly name: string;
}

/**
 * Expression type. A tiny, printable description of the Valibot schema a
 * Lexicon definition translates to. `fromLexicon()` prints it as source code
 * and `compileLexicon()` evaluates it in memory, so both agree exactly.
 */
export type Expr =
  | ArrayExpr
  | CallExpr
  | ExternalExpr
  | LocalExpr
  | ObjectExpr
  | ValueExpr;

/**
 * Build config interface.
 */
export interface BuildConfig {
  /**
   * How object schemas treat unknown properties. Defaults to `loose`.
   */
  readonly objectMode?: ObjectMode;
}

/**
 * A built definition.
 */
export interface BuiltDefinition {
  readonly name: string;
  readonly expr: Expr;
}

/**
 * Build result interface.
 */
export interface BuildResult {
  /**
   * The definitions in dependency order, so each one only references
   * definitions before it (or lazily, itself and later ones).
   */
  readonly defs: readonly BuiltDefinition[];
  /**
   * The NSIDs of other documents referenced by this one.
   */
  readonly externals: readonly string[];
}

/**
 * Build context interface.
 */
interface Context {
  readonly doc: LexiconDoc;
  readonly objectCallee: `v.${string}`;
  readonly objectMode: ObjectMode | undefined;
  readonly state: Map<string, "done" | "visiting">;
  readonly defs: BuiltDefinition[];
  readonly externals: Set<string>;
}

/**
 * The Valicon action names keyed by Lexicon string format.
 */
const FORMAT_ACTIONS: Readonly<Record<string, `lex.${string}`>> = {
  "at-identifier": "lex.atIdentifier",
  "at-uri": "lex.atUri",
  cid: "lex.cid",
  datetime: "lex.datetime",
  did: "lex.did",
  handle: "lex.handle",
  language: "lex.language",
  nsid: "lex.nsid",
  "record-key": "lex.recordKey",
  tid: "lex.tid",
  uri: "lex.uri"
};

/**
 * Creates a call expression.
 *
 * @param callee The function to call.
 * @param args The arguments.
 *
 * @returns The expression.
 */
function call(callee: CallExpr["callee"], ...args: readonly Expr[]): CallExpr {
  return { kind: "call", callee, args };
}

/**
 * Creates a value expression.
 *
 * @param value The JSON value.
 *
 * @returns The expression.
 */
function value(value: ValueExpr["value"]): ValueExpr {
  return { kind: "value", value };
}

/**
 * Creates an array expression.
 *
 * @param items The items.
 *
 * @returns The expression.
 */
function array(items: readonly Expr[]): ArrayExpr {
  return { kind: "array", items };
}

/**
 * Creates an object expression.
 *
 * @param entries The entries.
 *
 * @returns The expression.
 */
function object(entries: ReadonlyArray<readonly [string, Expr]>): ObjectExpr {
  return { kind: "object", entries };
}

/**
 * Appends actions to a schema expression, reusing an existing `v.pipe` call.
 *
 * @param base The schema expression.
 * @param actions The action expressions.
 *
 * @returns The piped expression.
 */
function pipe(base: Expr, actions: readonly Expr[]): Expr {
  if (actions.length === 0) {
    return base;
  }
  if (base.kind === "call" && base.callee === "v.pipe") {
    return call("v.pipe", ...base.args, ...actions);
  }
  return call("v.pipe", base, ...actions);
}

/**
 * Appends a description action, if any.
 *
 * @param base The schema expression.
 * @param description The description.
 *
 * @returns The expression.
 */
function describe(base: Expr, description: string | undefined): Expr {
  return description === void 0
    ? base
    : pipe(base, [call("v.description", value(description))]);
}

/**
 * Creates an object expression from string keyed options, skipping omitted
 * values.
 *
 * @param entries The entries.
 *
 * @returns The object expression.
 */
function options(
  entries: ReadonlyArray<readonly [string, Expr | undefined]>
): ObjectExpr {
  return object(
    entries.filter((entry): entry is readonly [string, Expr] =>
      Boolean(entry[1])
    )
  );
}

/**
 * Creates a value expression for an optional value.
 *
 * @param input The value.
 *
 * @returns The expression, if any.
 */
function optionalValue(
  input: boolean | number | string | undefined
): ValueExpr | undefined {
  return input === void 0 ? void 0 : value(input);
}

/**
 * Creates an array expression of values.
 *
 * @param values The values.
 *
 * @returns The expression.
 */
function values(values: ReadonlyArray<number | string>): ArrayExpr {
  return array(values.map((item) => value(item)));
}

/**
 * Converts a reference to an expression, visiting local definitions first.
 *
 * @param ref The reference string.
 * @param context The build context.
 *
 * @returns The expression.
 */
function refExpr(ref: string, context: Context): Expr {
  const { nsid, name } = splitLexRef(ref);
  if (nsid === "" || nsid === context.doc.id) {
    if (!(name in context.doc.defs)) {
      throw new Error(
        `Unknown reference "${ref}" in Lexicon "${context.doc.id}"`
      );
    }
    const state = context.state.get(name);
    if (state === "visiting") {
      return { kind: "local", name, lazy: true };
    }
    if (state !== "done") {
      visit(name, context);
    }
    return { kind: "local", name, lazy: false };
  }
  context.externals.add(nsid);
  return { kind: "external", nsid, name };
}

/**
 * Converts a Lexicon type to a schema expression.
 *
 * @param def The Lexicon type.
 * @param context The build context.
 *
 * @returns The expression.
 */
function typeExpr(def: LexObjectProperty, context: Context): Expr {
  switch (def.type) {
    case "string": {
      const actions: Expr[] = [];
      let base: Expr = call("v.string");
      if (def.enum) {
        base = call("v.picklist", values(def.enum));
      } else if (def.const !== void 0) {
        base = call("v.literal", value(def.const));
      }
      if (def.format) {
        const action = FORMAT_ACTIONS[def.format];
        if (!action) {
          throw new Error(`Unknown string format "${def.format}"`);
        }
        actions.push(call(action));
      }
      if (def.minLength !== void 0) {
        actions.push(call("v.minBytes", value(def.minLength)));
      }
      if (def.maxLength !== void 0) {
        actions.push(call("v.maxBytes", value(def.maxLength)));
      }
      if (def.minGraphemes !== void 0) {
        actions.push(call("v.minGraphemes", value(def.minGraphemes)));
      }
      if (def.maxGraphemes !== void 0) {
        actions.push(call("v.maxGraphemes", value(def.maxGraphemes)));
      }
      if (def.knownValues) {
        actions.push(call("lex.knownValues", values(def.knownValues)));
      }
      return describe(pipe(base, actions), def.description);
    }
    case "integer": {
      const actions: Expr[] = [];
      let base: Expr = call("v.number");
      if (def.enum) {
        base = call("v.picklist", values(def.enum));
      } else if (def.const !== void 0) {
        base = call("v.literal", value(def.const));
      } else {
        actions.push(call("v.integer"));
      }
      if (def.minimum !== void 0) {
        actions.push(call("v.minValue", value(def.minimum)));
      }
      if (def.maximum !== void 0) {
        actions.push(call("v.maxValue", value(def.maximum)));
      }
      return describe(pipe(base, actions), def.description);
    }
    case "boolean": {
      return describe(
        def.const === void 0
          ? call("v.boolean")
          : call("v.literal", value(def.const)),
        def.description
      );
    }
    case "array": {
      return arrayExpr(def, context);
    }
    case "blob": {
      const opts = options([
        ["accept", def.accept ? values(def.accept) : void 0],
        ["maxSize", optionalValue(def.maxSize)]
      ]);
      return describe(
        opts.entries.length > 0 ? call("lex.blob", opts) : call("lex.blob"),
        def.description
      );
    }
    case "bytes": {
      const opts = options([
        ["minLength", optionalValue(def.minLength)],
        ["maxLength", optionalValue(def.maxLength)]
      ]);
      return describe(
        opts.entries.length > 0 ? call("lex.bytes", opts) : call("lex.bytes"),
        def.description
      );
    }
    case "cid-link": {
      return describe(call("lex.cidLink"), def.description);
    }
    case "unknown": {
      return describe(call("lex.unknown"), def.description);
    }
    case "ref": {
      return describe(refExpr(def.ref, context), def.description);
    }
    case "union": {
      const refs = array(def.refs.map((ref) => refExpr(ref, context)));
      return describe(
        def.closed
          ? call("lex.union", refs, object([["closed", value(true)]]))
          : call("lex.union", refs),
        def.description
      );
    }
    default: {
      throw new Error(
        `Unsupported Lexicon type "${(def as { type: string }).type}"`
      );
    }
  }
}

/**
 * Converts a Lexicon array to a schema expression.
 *
 * @param def The Lexicon array.
 * @param context The build context.
 *
 * @returns The expression.
 */
function arrayExpr(def: LexArray, context: Context): Expr {
  const actions: Expr[] = [];
  if (def.minLength !== void 0) {
    actions.push(call("v.minLength", value(def.minLength)));
  }
  if (def.maxLength !== void 0) {
    actions.push(call("v.maxLength", value(def.maxLength)));
  }
  return describe(
    pipe(call("v.array", typeExpr(def.items, context)), actions),
    def.description
  );
}

/**
 * Wraps a property expression according to its `required`, `nullable` and
 * `default` settings.
 *
 * @param expr The property expression.
 * @param def The Lexicon type.
 * @param required Whether the property is required.
 * @param nullable Whether the property is nullable.
 *
 * @returns The wrapped expression.
 */
function wrapProperty(
  expr: Expr,
  def: LexObjectProperty,
  required: boolean,
  nullable: boolean
): Expr {
  const defaultArgs: Expr[] = [];
  if (
    (def.type === "string" ||
      def.type === "integer" ||
      def.type === "boolean") &&
    def.default !== void 0
  ) {
    defaultArgs.push(value(def.default));
  }
  if (!required && nullable) {
    return call("v.nullish", expr, ...defaultArgs);
  }
  if (!required) {
    return call("v.optional", expr, ...defaultArgs);
  }
  if (nullable) {
    return call("v.nullable", expr);
  }
  return expr;
}

/**
 * Converts the properties of an object or params definition to entries.
 *
 * @param properties The properties.
 * @param required The required property names.
 * @param nullable The nullable property names.
 * @param context The build context.
 *
 * @returns The entries.
 */
function entriesExpr(
  properties: Readonly<Record<string, LexObjectProperty>>,
  required: readonly string[] | undefined,
  nullable: readonly string[] | undefined,
  context: Context
): Array<readonly [string, Expr]> {
  return Object.entries(properties).map(([key, def]) => [
    key,
    wrapProperty(
      typeExpr(def, context),
      def,
      required?.includes(key) ?? false,
      nullable?.includes(key) ?? false
    )
  ]);
}

/**
 * Converts a Lexicon object to an object schema expression.
 *
 * @param def The Lexicon object.
 * @param typeName The `$type` name to declare, if any.
 * @param typeRequired Whether `$type` is required (records) or optional.
 * @param context The build context.
 * @param key The record key scheme, for records.
 *
 * @returns The expression.
 */
function objectExpr(
  def: LexObject,
  typeName: string | null,
  typeRequired: boolean,
  context: Context,
  key?: string
): Expr {
  const entries = object(
    entriesExpr(def.properties, def.required, def.nullable, context)
  );
  if (typeName === null) {
    return describe(call(context.objectCallee, entries), def.description);
  }
  // Named definitions use the Valicon helpers, which add the `$type` entry.
  const opts = options([
    ["key", typeRequired ? optionalValue(key) : void 0],
    ["mode", optionalValue(context.objectMode)]
  ]);
  return describe(
    call(
      typeRequired ? "lex.record" : "lex.object",
      value(typeName),
      entries,
      ...(opts.entries.length > 0 ? [opts] : [])
    ),
    def.description
  );
}

/**
 * Converts Lexicon params to an object schema expression.
 *
 * @param def The Lexicon params.
 * @param context The build context.
 *
 * @returns The expression.
 */
function paramsExpr(def: LexXrpcParameters, context: Context): Expr {
  return describe(
    call(
      context.objectCallee,
      object(entriesExpr(def.properties, def.required, void 0, context))
    ),
    def.description
  );
}

/**
 * Converts an XRPC body to an options expression.
 *
 * @param def The Lexicon body.
 * @param context The build context.
 *
 * @returns The expression.
 */
function bodyExpr(def: LexXrpcBody, context: Context): ObjectExpr {
  let schema: Expr | undefined;
  if (def.schema) {
    schema =
      def.schema.type === "object"
        ? objectExpr(def.schema, null, false, context)
        : typeExpr(def.schema, context);
  }
  return options([
    ["encoding", value(def.encoding)],
    ["description", optionalValue(def.description)],
    ["schema", schema]
  ]);
}

/**
 * Converts XRPC errors to an array expression.
 *
 * @param errors The errors.
 *
 * @returns The expression.
 */
function errorsExpr(errors: readonly LexXrpcError[]): ArrayExpr {
  return array(
    errors.map((error) =>
      options([
        ["name", value(error.name)],
        ["description", optionalValue(error.description)]
      ])
    )
  );
}

/**
 * Converts an XRPC definition to a definition expression.
 *
 * @param def The Lexicon XRPC type.
 * @param context The build context.
 *
 * @returns The expression.
 */
function xrpcExpr(
  def: LexXrpcProcedure | LexXrpcQuery | LexXrpcSubscription,
  context: Context
): Expr {
  const entries: Array<readonly [string, Expr | undefined]> = [
    ["description", optionalValue(def.description)],
    [
      "parameters",
      def.parameters ? paramsExpr(def.parameters, context) : void 0
    ]
  ];
  if (def.type === "procedure") {
    entries.push(["input", def.input ? bodyExpr(def.input, context) : void 0]);
  }
  if (def.type === "query" || def.type === "procedure") {
    entries.push([
      "output",
      def.output ? bodyExpr(def.output, context) : void 0
    ]);
  }
  if (def.type === "subscription") {
    entries.push([
      "message",
      def.message
        ? options([
            ["description", optionalValue(def.message.description)],
            ["schema", typeExpr(def.message.schema, context)]
          ])
        : void 0
    ]);
  }
  entries.push(["errors", def.errors ? errorsExpr(def.errors) : void 0]);
  return call(`lex.${def.type}`, value(context.doc.id), options(entries));
}

/**
 * Converts a Lexicon record to a definition expression.
 *
 * @param def The Lexicon record.
 * @param context The build context.
 *
 * @returns The expression.
 */
function recordExpr(def: LexRecord, context: Context): Expr {
  return describe(
    objectExpr(def.record, context.doc.id, true, context, def.key),
    def.description
  );
}

/**
 * Converts a named definition to an expression.
 *
 * @param def The Lexicon type.
 * @param name The definition name.
 * @param context The build context.
 *
 * @returns The expression.
 */
function defExpr(def: LexUserType, name: string, context: Context): Expr {
  const ref = joinLexRef(context.doc.id, name);
  switch (def.type) {
    case "record": {
      return recordExpr(def, context);
    }
    case "object": {
      return objectExpr(def, ref, false, context);
    }
    case "token": {
      return describe(call("lex.token", value(ref)), def.description);
    }
    case "query":
    case "procedure":
    case "subscription": {
      return xrpcExpr(def, context);
    }
    case "array":
    case "blob":
    case "boolean":
    case "bytes":
    case "cid-link":
    case "integer":
    case "string":
    case "unknown": {
      return pipe(typeExpr(def, context), [call("lex.id", value(ref))]);
    }
    default: {
      throw new Error(
        `Unsupported Lexicon definition type "${(def as { type: string }).type}"`
      );
    }
  }
}

/**
 * Visits a definition, building its dependencies first.
 *
 * @param name The definition name.
 * @param context The build context.
 */
function visit(name: string, context: Context): void {
  if (!context.state.has(name)) {
    context.state.set(name, "visiting");
    const expr = defExpr(context.doc.defs[name]!, name, context);
    context.state.set(name, "done");
    context.defs.push({ name, expr });
  }
}

/**
 * Builds schema expressions for every definition of a Lexicon document.
 *
 * @param doc The Lexicon document.
 * @param config The build config.
 *
 * @returns The build result.
 */
export function buildLexicon(
  doc: LexiconDoc,
  config?: BuildConfig
): BuildResult {
  const context: Context = {
    doc,
    objectCallee:
      config?.objectMode === "strict"
        ? "v.strictObject"
        : config?.objectMode === "strip"
          ? "v.object"
          : "v.looseObject",
    objectMode: config?.objectMode,
    state: new Map(),
    defs: [],
    externals: new Set()
  };
  for (const name of Object.keys(doc.defs)) {
    visit(name, context);
  }
  return { defs: context.defs, externals: [...context.externals] };
}
