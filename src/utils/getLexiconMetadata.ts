import type { BaseLexiconMetadata, LexiconMetadata } from "../types/index.js";

/**
 * Returns the pipeline items of a schema, or just the schema itself when it
 * has no pipeline.
 *
 * @param schema The schema to inspect.
 *
 * @returns The pipeline items.
 */
export function getPipeItems(schema: object): readonly unknown[] {
  if ("pipe" in schema && Array.isArray(schema.pipe)) {
    return schema.pipe;
  }
  return [schema];
}

/**
 * Returns the Lexicon metadata attached to a schema, if any.
 *
 * Valicon schemas such as `blob()`, `record()` and `union()` tag themselves
 * with a `v.metadata({ lexicon: {...} })` action, and `knownValues()` or
 * `id()` add further keys. This helper merges every such tag found in the
 * pipeline of the schema, including nested pipelines (outer tags win).
 *
 * Hint: Unlike `v.getMetadata()`, which only keeps the last `lexicon` object,
 * this merges them, so `knownValues()` and `id()` can be combined.
 *
 * @param schema The schema to inspect.
 *
 * @returns The merged Lexicon metadata, or `null` if the schema has none.
 */
export function getLexiconMetadata(schema: object): LexiconMetadata | null {
  const merged: BaseLexiconMetadata = {};
  return collect(schema, merged) ? merged : null;
}

/**
 * Collects Lexicon metadata from a schema and its nested pipelines.
 *
 * @param schema The schema to inspect.
 * @param merged The metadata object to merge into.
 *
 * @returns Whether any Lexicon metadata was found.
 */
function collect(schema: unknown, merged: BaseLexiconMetadata): boolean {
  if (typeof schema !== "object" || schema === null) {
    return false;
  }
  const [base, ...actions] = getPipeItems(schema);
  let found = base === schema ? false : collect(base, merged);
  for (const action of actions) {
    if (isMetadataAction(action) && hasLexiconMetadata(action.metadata)) {
      Object.assign(merged, action.metadata.lexicon);
      found = true;
    }
  }
  return found;
}

/**
 * Checks whether a pipeline item is a metadata action.
 *
 * @param item The pipeline item.
 *
 * @returns Whether it is a metadata action.
 */
function isMetadataAction(item: unknown): item is { metadata: unknown } {
  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    item.type === "metadata" &&
    "metadata" in item
  );
}

/**
 * Checks whether a metadata object carries Lexicon metadata.
 *
 * @param metadata The metadata object.
 *
 * @returns Whether it has a `lexicon` key.
 */
function hasLexiconMetadata(
  metadata: unknown
): metadata is { lexicon: LexiconMetadata } {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "lexicon" in metadata &&
    typeof metadata.lexicon === "object" &&
    metadata.lexicon !== null
  );
}
