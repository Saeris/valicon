/**
 * Lexicon reference parts interface.
 */
export interface LexRefParts {
  /**
   * The document NSID, or an empty string for a local `#name` reference.
   */
  readonly nsid: string;
  /**
   * The definition name. A bare NSID refers to `main`.
   */
  readonly name: string;
}

/**
 * Splits a Lexicon reference (`com.example.nsid`, `com.example.nsid#name` or
 * `#name`) into its NSID and definition name.
 *
 * @param ref The reference string.
 *
 * @returns The reference parts.
 */
export function splitLexRef(ref: string): LexRefParts {
  const index = ref.indexOf("#");
  if (index === -1) {
    return { nsid: ref, name: "main" };
  }
  return { nsid: ref.slice(0, index), name: ref.slice(index + 1) };
}

/**
 * Joins an NSID and definition name into the canonical reference string used
 * in `$type` fields: the bare NSID for `main`, otherwise `nsid#name`.
 *
 * @param nsid The document NSID.
 * @param name The definition name.
 *
 * @returns The canonical reference string.
 */
export function joinLexRef(nsid: string, name: string): string {
  return name === "main" ? nsid : `${nsid}#${name}`;
}

/**
 * Converts a reference to the shortest form valid inside a given document:
 * `#name` for local references, otherwise the canonical global form.
 *
 * @param ref The reference string.
 * @param docId The NSID of the document the reference appears in.
 *
 * @returns The relative reference string.
 */
export function toRelativeLexRef(ref: string, docId: string): string {
  const { nsid, name } = splitLexRef(ref);
  return nsid === docId || nsid === "" ? `#${name}` : joinLexRef(nsid, name);
}

/**
 * Converts a possibly local reference to the canonical global form.
 *
 * @param ref The reference string.
 * @param docId The NSID of the document the reference appears in.
 *
 * @returns The canonical global reference string.
 */
export function toAbsoluteLexRef(ref: string, docId: string): string {
  const { nsid, name } = splitLexRef(ref);
  return joinLexRef(nsid === "" ? docId : nsid, name);
}
