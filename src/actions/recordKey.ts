import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { RECORD_KEY_REGEX } from "../regex.js";

/**
 * Record key issue interface.
 */
export interface RecordKeyIssue<
  TInput extends string
> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "record_key";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The record key regex.
   */
  readonly requirement: RegExp;
}

/**
 * Record key action interface.
 */
export interface RecordKeyAction<
  TInput extends string,
  TMessage extends ErrorMessage<RecordKeyIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, RecordKeyIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "record_key";
  /**
   * The action reference.
   */
  readonly reference: typeof recordKey;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The record key regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates a [record key](https://atproto.com/specs/record-key) validation
 * action.
 *
 * A record key (often abbreviated `rkey`) names a single record within a
 * collection, and is the last path segment of an AT URI. It may be 1 to 512
 * characters from the set of ASCII letters, digits and `.-_:~`, except for
 * the special values `.` and `..`. This is the Lexicon `record-key` string
 * format.
 *
 * Hint: This action checks the general syntax only. A specific collection may
 * restrict keys further, for example to TIDs. Use `tid()` for that.
 *
 * @returns A record key action.
 */
export function recordKey<TInput extends string>(): RecordKeyAction<
  TInput,
  undefined
>;

/**
 * Creates a [record key](https://atproto.com/specs/record-key) validation
 * action.
 *
 * A record key (often abbreviated `rkey`) names a single record within a
 * collection, and is the last path segment of an AT URI. It may be 1 to 512
 * characters from the set of ASCII letters, digits and `.-_:~`, except for
 * the special values `.` and `..`. This is the Lexicon `record-key` string
 * format.
 *
 * Hint: This action checks the general syntax only. A specific collection may
 * restrict keys further, for example to TIDs. Use `tid()` for that.
 *
 * @param message The error message.
 *
 * @returns A record key action.
 */
export function recordKey<
  TInput extends string,
  const TMessage extends ErrorMessage<RecordKeyIssue<TInput>> | undefined
>(message: TMessage): RecordKeyAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function recordKey(
  message?: ErrorMessage<RecordKeyIssue<string>>
): RecordKeyAction<string, ErrorMessage<RecordKeyIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "record_key",
    reference: recordKey,
    async: false,
    expects: null,
    requirement: RECORD_KEY_REGEX,
    message,
    "~run"(dataset, config) {
      if (
        dataset.typed &&
        !(
          this.requirement.test(dataset.value) &&
          dataset.value !== "." &&
          dataset.value !== ".."
        )
      ) {
        _addIssue(this, "record key", dataset, config);
      }
      return dataset;
    }
  };
}
