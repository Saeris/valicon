import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { DATETIME_REGEX } from "../regex.js";

/**
 * Datetime issue interface.
 */
export interface DatetimeIssue<
  TInput extends string
> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "datetime";
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
 * Datetime action interface.
 */
export interface DatetimeAction<
  TInput extends string,
  TMessage extends ErrorMessage<DatetimeIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, DatetimeIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "datetime";
  /**
   * The action reference.
   */
  readonly reference: typeof datetime;
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
 * Checks whether a string is a valid atproto datetime.
 *
 * @param input The string to check.
 *
 * @returns Whether it is a datetime.
 */
function isDatetime(input: string): boolean {
  if (
    input.length > 64 ||
    input.endsWith("-00:00") ||
    !DATETIME_REGEX.test(input)
  ) {
    return false;
  }
  // Parsing catches what the regex cannot, such as February 30th.
  const year = new Date(input).getUTCFullYear();
  return year >= 0 && year <= 9999;
}

/**
 * Creates a [datetime](https://atproto.com/specs/lexicon#datetime) validation
 * action.
 *
 * atproto timestamps must satisfy both RFC 3339 and ISO 8601: a full date, an
 * uppercase `T`, a time with whole seconds, optional fractional seconds, and
 * a required timezone written as `Z` or `±hh:mm`. The preferred form is what
 * `Date.prototype.toISOString()` produces, such as
 * `2024-01-15T12:30:00.000Z`. This is the Lexicon `datetime` string format.
 *
 * Hint: Lowercase `z`, the `-00:00` offset, missing timezones and years
 * outside `0000` to `9999` are rejected. The value is also parsed to reject
 * impossible dates such as a 13th month.
 *
 * @returns A datetime action.
 */
export function datetime<TInput extends string>(): DatetimeAction<
  TInput,
  undefined
>;

/**
 * Creates a [datetime](https://atproto.com/specs/lexicon#datetime) validation
 * action.
 *
 * atproto timestamps must satisfy both RFC 3339 and ISO 8601: a full date, an
 * uppercase `T`, a time with whole seconds, optional fractional seconds, and
 * a required timezone written as `Z` or `±hh:mm`. The preferred form is what
 * `Date.prototype.toISOString()` produces, such as
 * `2024-01-15T12:30:00.000Z`. This is the Lexicon `datetime` string format.
 *
 * Hint: Lowercase `z`, the `-00:00` offset, missing timezones and years
 * outside `0000` to `9999` are rejected. The value is also parsed to reject
 * impossible dates such as a 13th month.
 *
 * @param message The error message.
 *
 * @returns A datetime action.
 */
export function datetime<
  TInput extends string,
  const TMessage extends ErrorMessage<DatetimeIssue<TInput>> | undefined
>(message: TMessage): DatetimeAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function datetime(
  message?: ErrorMessage<DatetimeIssue<string>>
): DatetimeAction<string, ErrorMessage<DatetimeIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "datetime",
    reference: datetime,
    async: false,
    expects: null,
    requirement: isDatetime,
    message,
    "~run"(dataset, config) {
      if (dataset.typed && !this.requirement(dataset.value)) {
        _addIssue(this, "datetime", dataset, config);
      }
      return dataset;
    }
  };
}
