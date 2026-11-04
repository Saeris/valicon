import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { TID_REGEX } from "../regex.js";

/**
 * TID issue interface.
 */
export interface TidIssue<TInput extends string> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "tid";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The TID regex.
   */
  readonly requirement: RegExp;
}

/**
 * TID action interface.
 */
export interface TidAction<
  TInput extends string,
  TMessage extends ErrorMessage<TidIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, TidIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "tid";
  /**
   * The action reference.
   */
  readonly reference: typeof tid;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The TID regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates a [TID](https://atproto.com/specs/tid) validation action.
 *
 * A TID (Timestamp Identifier) is a 13 character base32-sortable string that
 * encodes a microsecond timestamp and a small random clock id, such as
 * `3jzfcijpj2z2a`. TIDs are the most common record key scheme and are also
 * used as repository commit revisions, because sorting them as strings sorts
 * them by time. This is the Lexicon `tid` string format.
 *
 * @returns A TID action.
 */
export function tid<TInput extends string>(): TidAction<TInput, undefined>;

/**
 * Creates a [TID](https://atproto.com/specs/tid) validation action.
 *
 * A TID (Timestamp Identifier) is a 13 character base32-sortable string that
 * encodes a microsecond timestamp and a small random clock id, such as
 * `3jzfcijpj2z2a`. TIDs are the most common record key scheme and are also
 * used as repository commit revisions, because sorting them as strings sorts
 * them by time. This is the Lexicon `tid` string format.
 *
 * @param message The error message.
 *
 * @returns A TID action.
 */
export function tid<
  TInput extends string,
  const TMessage extends ErrorMessage<TidIssue<TInput>> | undefined
>(message: TMessage): TidAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function tid(
  message?: ErrorMessage<TidIssue<string>>
): TidAction<string, ErrorMessage<TidIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "tid",
    reference: tid,
    async: false,
    expects: null,
    requirement: TID_REGEX,
    message,
    "~run"(dataset, config) {
      if (dataset.typed && !this.requirement.test(dataset.value)) {
        _addIssue(this, "TID", dataset, config);
      }
      return dataset;
    }
  };
}
