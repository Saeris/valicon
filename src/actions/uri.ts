import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { URI_REGEX } from "../regex.js";

/**
 * URI issue interface.
 */
export interface UriIssue<TInput extends string> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "uri";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The URI regex.
   */
  readonly requirement: RegExp;
}

/**
 * URI action interface.
 */
export interface UriAction<
  TInput extends string,
  TMessage extends ErrorMessage<UriIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, UriIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "uri";
  /**
   * The action reference.
   */
  readonly reference: typeof uri;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The URI regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates a [URI](https://atproto.com/specs/lexicon#uri) validation action.
 *
 * URI fields accept any RFC 3986 style URI with any scheme: `https://`,
 * `at://`, `did:`, `mailto:` and so on. They are used where a Lexicon wants
 * to link to something without restricting what kind of thing it is, such as
 * the target of a rich text link facet. This is the Lexicon `uri` string
 * format.
 *
 * Hint: The check is deliberately loose: a scheme, no whitespace, and at most
 * 8 kilobytes. Use `atUri()` when the value must be an AT URI.
 *
 * @returns A URI action.
 */
export function uri<TInput extends string>(): UriAction<TInput, undefined>;

/**
 * Creates a [URI](https://atproto.com/specs/lexicon#uri) validation action.
 *
 * URI fields accept any RFC 3986 style URI with any scheme: `https://`,
 * `at://`, `did:`, `mailto:` and so on. They are used where a Lexicon wants
 * to link to something without restricting what kind of thing it is, such as
 * the target of a rich text link facet. This is the Lexicon `uri` string
 * format.
 *
 * Hint: The check is deliberately loose: a scheme, no whitespace, and at most
 * 8 kilobytes. Use `atUri()` when the value must be an AT URI.
 *
 * @param message The error message.
 *
 * @returns A URI action.
 */
export function uri<
  TInput extends string,
  const TMessage extends ErrorMessage<UriIssue<TInput>> | undefined
>(message: TMessage): UriAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function uri(
  message?: ErrorMessage<UriIssue<string>>
): UriAction<string, ErrorMessage<UriIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "uri",
    reference: uri,
    async: false,
    expects: null,
    requirement: URI_REGEX,
    message,
    "~run"(dataset, config) {
      if (
        dataset.typed &&
        !(dataset.value.length <= 8192 && this.requirement.test(dataset.value))
      ) {
        _addIssue(this, "URI", dataset, config);
      }
      return dataset;
    }
  };
}
