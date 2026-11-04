import {
  AT_URI_FRAGMENT_REGEX,
  AT_URI_INVALID_CHAR_REGEX,
  AT_URI_REGEX,
  DID_REGEX,
  HANDLE_REGEX,
  NSID_REGEX,
  RECORD_KEY_REGEX
} from "../regex.js";

/**
 * AT URI parts interface.
 */
export interface AtUriParts {
  /**
   * The repository identity: a handle or a DID.
   */
  readonly authority: string;
  /**
   * The record collection NSID, if present.
   */
  readonly collection?: string;
  /**
   * The record key, if present.
   */
  readonly rkey?: string;
  /**
   * The decoded JSON Pointer fragment (without the `#`), if present.
   */
  readonly fragment?: string;
}

/**
 * Parses an AT URI in the restricted form used by Lexicon `at-uri` fields.
 *
 * The restricted form is `at://AUTHORITY[/COLLECTION[/RKEY]][#FRAGMENT]`. The
 * authority must be a valid DID or handle, the collection a valid NSID, the
 * record key a valid record key, and the fragment a JSON Pointer. Query
 * strings and trailing slashes are not allowed.
 *
 * @param input The string to parse.
 *
 * @returns The URI parts, or `null` if the input is not a valid AT URI.
 */
export function parseAtUri(input: string): AtUriParts | null {
  if (input.length > 8192 || AT_URI_INVALID_CHAR_REGEX.test(input)) {
    return null;
  }
  const groups = AT_URI_REGEX.exec(input)?.groups;
  if (
    !groups ||
    typeof groups.trailingSlash === "string" ||
    typeof groups.query === "string" ||
    !isAtIdentifier(groups.authority!)
  ) {
    return null;
  }
  const parts: {
    authority: string;
    collection?: string;
    rkey?: string;
    fragment?: string;
  } = { authority: groups.authority! };
  if (typeof groups.collection === "string") {
    if (!NSID_REGEX.test(groups.collection) || groups.collection.length > 317) {
      return null;
    }
    parts.collection = groups.collection;
  }
  if (typeof groups.rkey === "string") {
    if (
      !RECORD_KEY_REGEX.test(groups.rkey) ||
      groups.rkey === "." ||
      groups.rkey === ".."
    ) {
      return null;
    }
    parts.rkey = groups.rkey;
  }
  if (typeof groups.fragment === "string") {
    if (!AT_URI_FRAGMENT_REGEX.test(groups.fragment)) {
      return null;
    }
    try {
      parts.fragment = decodeURIComponent(groups.fragment);
    } catch {
      return null;
    }
  }
  return parts;
}

/**
 * Checks whether a string is a syntactically valid DID or handle.
 *
 * @param input The string to check.
 *
 * @returns Whether it is an AT identifier.
 */
export function isAtIdentifier(input: string): boolean {
  return input.startsWith("did:")
    ? input.length <= 2048 && DID_REGEX.test(input)
    : input.length <= 253 && HANDLE_REGEX.test(input);
}
