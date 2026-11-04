import * as v from "valibot";
import {
  atIdentifier,
  atUri,
  cid,
  datetime,
  did,
  handle,
  id,
  knownValues,
  language,
  nsid,
  recordKey,
  tid,
  uri
} from "../actions/index.js";
import {
  procedure,
  query,
  subscription,
  type XrpcDefinition
} from "../definitions/index.js";
import {
  blob,
  bytes,
  cidLink,
  object,
  record,
  token,
  union,
  unknown
} from "../schemas/index.js";
import type { LexiconDoc } from "../types/index.js";
import { joinLexRef } from "../utils/index.js";
import { type BuildConfig, buildLexicon, type Expr } from "./expressions.js";

/**
 * A compiled definition: a Valibot schema or an XRPC definition.
 */
export type CompiledDefinition = v.GenericSchema | XrpcDefinition;

/**
 * Compile Lexicon config interface.
 */
export interface CompileLexiconConfig extends BuildConfig {
  /**
   * Resolves a reference to a definition of another document. Called lazily,
   * the first time the reference is validated.
   */
  readonly resolve?: (nsid: string, name: string) => CompiledDefinition;
}

/**
 * Any function callable by the evaluator.
 */
type AnyFunction = (...args: never[]) => unknown;

/**
 * The Valicon functions the evaluator can call.
 */
const LEX: Readonly<Record<string, AnyFunction>> = {
  atIdentifier,
  atUri,
  blob,
  bytes,
  cid,
  cidLink,
  datetime,
  did,
  handle,
  id,
  knownValues,
  language,
  nsid,
  object,
  procedure,
  query,
  record,
  recordKey,
  subscription,
  tid,
  token,
  union,
  unknown,
  uri
};

/**
 * Evaluation environment interface.
 */
interface Environment {
  readonly locals: Map<string, CompiledDefinition>;
  readonly resolve: (nsid: string, name: string) => CompiledDefinition;
}

/**
 * Looks up a callable function by its printed name.
 *
 * @param callee The printed name, such as `v.pipe` or `lex.did`.
 *
 * @returns The function.
 */
function lookup(callee: string): AnyFunction {
  const [namespace, name] = callee.split(".");
  const table: object = namespace === "v" ? v : LEX;
  const fn: unknown =
    name !== void 0 && Object.hasOwn(table, name)
      ? Reflect.get(table, name)
      : null;
  if (typeof fn !== "function") {
    throw new Error(`Unknown function "${callee}"`);
  }
  // A function value is always callable.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return fn as AnyFunction;
}

/**
 * Checks whether a value is a compiled definition.
 *
 * @param value The value to check.
 *
 * @returns Whether it is a schema or XRPC definition.
 */
function isCompiledDefinition(value: unknown): value is CompiledDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value.kind === "schema" || value.kind === "definition")
  );
}

/**
 * Returns a local definition as a schema, for use inside other schemas.
 *
 * @param environment The environment.
 * @param name The definition name.
 *
 * @returns The schema.
 */
function localSchema(environment: Environment, name: string): v.GenericSchema {
  const definition = environment.locals.get(name);
  if (definition === void 0) {
    throw new Error(`Unresolved reference "#${name}"`);
  }
  if (definition.kind !== "schema") {
    throw new Error(`Cannot reference the XRPC definition "#${name}"`);
  }
  return definition;
}

/**
 * Evaluates an expression into a schema or value.
 *
 * @param expr The expression.
 * @param environment The environment.
 *
 * @returns The evaluated value.
 */
function evaluate(expr: Expr, environment: Environment): unknown {
  switch (expr.kind) {
    case "value": {
      return expr.value;
    }
    case "array": {
      return expr.items.map((item) => evaluate(item, environment));
    }
    case "object": {
      return Object.fromEntries(
        expr.entries.map(([key, item]) => [key, evaluate(item, environment)])
      );
    }
    case "call": {
      return Reflect.apply(
        lookup(expr.callee),
        null,
        expr.args.map((arg) => evaluate(arg, environment))
      );
    }
    case "local": {
      return expr.lazy
        ? v.lazy(() => localSchema(environment, expr.name))
        : localSchema(environment, expr.name);
    }
    case "external": {
      return v.lazy(() => {
        const definition = environment.resolve(expr.nsid, expr.name);
        if (definition.kind !== "schema") {
          throw new Error(
            `Cannot reference the XRPC definition "${joinLexRef(expr.nsid, expr.name)}"`
          );
        }
        return definition;
      });
    }
    default: {
      throw new Error("Unknown expression");
    }
  }
}

/**
 * Compiles a [Lexicon](https://atproto.com/specs/lexicon) document into
 * Valibot schemas at runtime.
 *
 * This produces exactly the schemas that `fromLexicon()` would generate
 * source code for, without a build step. The result maps definition names to
 * schemas, or to XRPC definitions for queries, procedures and
 * subscriptions. References to other documents are resolved lazily through
 * the `resolve` option the first time they are validated.
 *
 * Hint: Use `compileLexicons()` to compile a set of documents that reference
 * each other.
 *
 * @param doc The Lexicon document.
 * @param config The compile config.
 *
 * @returns The compiled definitions.
 */
export function compileLexicon(
  doc: LexiconDoc,
  config?: CompileLexiconConfig
): Record<string, CompiledDefinition> {
  const environment: Environment = {
    // A Map keeps the accumulator in one hidden class however many
    // definitions a document has.
    locals: new Map(),
    resolve:
      config?.resolve ??
      ((nsid, name): CompiledDefinition => {
        throw new Error(
          `Unresolved reference "${joinLexRef(nsid, name)}" in Lexicon "${doc.id}"`
        );
      })
  };
  for (const { name, expr } of buildLexicon(doc, config).defs) {
    const definition = evaluate(expr, environment);
    if (!isCompiledDefinition(definition)) {
      throw new Error(`Definition "${name}" did not compile to a schema`);
    }
    environment.locals.set(name, definition);
  }
  return Object.fromEntries(environment.locals);
}

/**
 * Compiles a set of [Lexicon](https://atproto.com/specs/lexicon) documents
 * that may reference each other.
 *
 * References between the documents are resolved automatically. References to
 * documents outside the set are passed to the `resolve` option, or fail when
 * first validated.
 *
 * @param docs The Lexicon documents.
 * @param config The compile config.
 *
 * @returns The compiled definitions of every document, keyed by NSID.
 */
export function compileLexicons(
  docs: readonly LexiconDoc[],
  config?: CompileLexiconConfig
): Record<string, Record<string, CompiledDefinition>> {
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const compiled: Record<string, Record<string, CompiledDefinition>> = {};
  const resolve = (nsid: string, name: string): CompiledDefinition => {
    const doc = byId.get(nsid);
    if (doc === void 0) {
      if (config?.resolve) {
        return config.resolve(nsid, name);
      }
      throw new Error(`Unresolved reference "${joinLexRef(nsid, name)}"`);
    }
    const definition = (compiled[nsid] ??= compileLexicon(doc, {
      ...config,
      resolve
    }))[name];
    if (definition === void 0) {
      throw new Error(`Unresolved reference "${joinLexRef(nsid, name)}"`);
    }
    return definition;
  };
  for (const doc of docs) {
    compiled[doc.id] ??= compileLexicon(doc, { ...config, resolve });
  }
  return compiled;
}
