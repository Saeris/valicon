import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { HANDLE_REGEX } from "../regex.js";

/**
 * Handle issue interface.
 */
export interface HandleIssue<TInput extends string> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "handle";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The handle regex.
   */
  readonly requirement: RegExp;
}

/**
 * Handle action interface.
 */
export interface HandleAction<
  TInput extends string,
  TMessage extends ErrorMessage<HandleIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, HandleIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "handle";
  /**
   * The action reference.
   */
  readonly reference: typeof handle;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The handle regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates a [handle](https://atproto.com/specs/handle) validation action.
 *
 * A handle is the human-readable domain name of an atproto account, such as
 * `alice.bsky.social`. It must be a valid DNS hostname of at least two
 * labels and at most 253 characters, without a leading `@`. Handles are case
 * insensitive and should be stored in lowercase. This is the Lexicon
 * `handle` string format.
 *
 * Hint: Only the syntax is checked. Whether the handle actually resolves to a
 * DID, or uses a reserved TLD such as `.test` or `.local`, is not validated.
 *
 * @returns A handle action.
 */
export function handle<TInput extends string>(): HandleAction<
  TInput,
  undefined
>;

/**
 * Creates a [handle](https://atproto.com/specs/handle) validation action.
 *
 * A handle is the human-readable domain name of an atproto account, such as
 * `alice.bsky.social`. It must be a valid DNS hostname of at least two
 * labels and at most 253 characters, without a leading `@`. Handles are case
 * insensitive and should be stored in lowercase. This is the Lexicon
 * `handle` string format.
 *
 * Hint: Only the syntax is checked. Whether the handle actually resolves to a
 * DID, or uses a reserved TLD such as `.test` or `.local`, is not validated.
 *
 * @param message The error message.
 *
 * @returns A handle action.
 */
export function handle<
  TInput extends string,
  const TMessage extends ErrorMessage<HandleIssue<TInput>> | undefined
>(message: TMessage): HandleAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function handle(
  message?: ErrorMessage<HandleIssue<string>>
): HandleAction<string, ErrorMessage<HandleIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "handle",
    reference: handle,
    async: false,
    expects: null,
    requirement: HANDLE_REGEX,
    message,
    "~run"(dataset, config) {
      if (
        dataset.typed &&
        !(dataset.value.length <= 253 && this.requirement.test(dataset.value))
      ) {
        _addIssue(this, "handle", dataset, config);
      }
      return dataset;
    }
  };
}
