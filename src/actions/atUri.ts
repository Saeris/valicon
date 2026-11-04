import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { parseAtUri } from "../utils/index.js";

/**
 * AT URI issue interface.
 */
export interface AtUriIssue<TInput extends string> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "at_uri";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The validation function.
   */
  readonly requirement: (input: string) => boolean;
}

/**
 * AT URI action interface.
 */
export interface AtUriAction<
  TInput extends string,
  TMessage extends ErrorMessage<AtUriIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, AtUriIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "at_uri";
  /**
   * The action reference.
   */
  readonly reference: typeof atUri;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The validation function.
   */
  readonly requirement: (input: string) => boolean;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Checks whether a string is a valid AT URI.
 *
 * @param input The string to check.
 *
 * @returns Whether it is an AT URI.
 */
function isAtUri(input: string): boolean {
  return parseAtUri(input) !== null;
}

/**
 * Creates an [AT URI](https://atproto.com/specs/at-uri-scheme) validation
 * action.
 *
 * An AT URI points at a repository, collection or record, in the form
 * `at://AUTHORITY[/COLLECTION[/RKEY]]`, for example
 * `at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3jzfcijpj2z2a`.
 * The authority is a DID or handle, the collection an NSID and the record key
 * a valid record key. This is the Lexicon `at-uri` string format.
 *
 * Hint: This action validates the restricted form used in Lexicons, which
 * forbids query strings and trailing slashes. A `#/...` JSON Pointer fragment
 * is allowed. Use `parseAtUri()` to extract the parts.
 *
 * @returns An AT URI action.
 */
export function atUri<TInput extends string>(): AtUriAction<TInput, undefined>;

/**
 * Creates an [AT URI](https://atproto.com/specs/at-uri-scheme) validation
 * action.
 *
 * An AT URI points at a repository, collection or record, in the form
 * `at://AUTHORITY[/COLLECTION[/RKEY]]`, for example
 * `at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3jzfcijpj2z2a`.
 * The authority is a DID or handle, the collection an NSID and the record key
 * a valid record key. This is the Lexicon `at-uri` string format.
 *
 * Hint: This action validates the restricted form used in Lexicons, which
 * forbids query strings and trailing slashes. A `#/...` JSON Pointer fragment
 * is allowed. Use `parseAtUri()` to extract the parts.
 *
 * @param message The error message.
 *
 * @returns An AT URI action.
 */
export function atUri<
  TInput extends string,
  const TMessage extends ErrorMessage<AtUriIssue<TInput>> | undefined
>(message: TMessage): AtUriAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function atUri(
  message?: ErrorMessage<AtUriIssue<string>>
): AtUriAction<string, ErrorMessage<AtUriIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "at_uri",
    reference: atUri,
    async: false,
    expects: null,
    requirement: isAtUri,
    message,
    "~run"(dataset, config) {
      if (dataset.typed && !this.requirement(dataset.value)) {
        _addIssue(this, "AT URI", dataset, config);
      }
      return dataset;
    }
  };
}
