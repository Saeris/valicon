import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { LANGUAGE_REGEX } from "../regex.js";

/**
 * Language issue interface.
 */
export interface LanguageIssue<
  TInput extends string
> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "language";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The BCP 47 regex.
   */
  readonly requirement: RegExp;
}

/**
 * Language action interface.
 */
export interface LanguageAction<
  TInput extends string,
  TMessage extends ErrorMessage<LanguageIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, LanguageIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "language";
  /**
   * The action reference.
   */
  readonly reference: typeof language;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The BCP 47 regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates a [language](https://atproto.com/specs/lexicon#language) validation
 * action.
 *
 * Language fields hold a [BCP 47](https://www.rfc-editor.org/rfc/rfc5646)
 * language tag such as `en`, `pt-BR` or `zh-Hant`. Posts use them in the
 * `langs` array so clients can offer translation and filtering. This is the
 * Lexicon `language` string format.
 *
 * Hint: Only well-formed syntax is checked. Tags that are well-formed but
 * not registered, such as `xx-YY`, still pass and should be ignored by
 * clients rather than rejected.
 *
 * @returns A language action.
 */
export function language<TInput extends string>(): LanguageAction<
  TInput,
  undefined
>;

/**
 * Creates a [language](https://atproto.com/specs/lexicon#language) validation
 * action.
 *
 * Language fields hold a [BCP 47](https://www.rfc-editor.org/rfc/rfc5646)
 * language tag such as `en`, `pt-BR` or `zh-Hant`. Posts use them in the
 * `langs` array so clients can offer translation and filtering. This is the
 * Lexicon `language` string format.
 *
 * Hint: Only well-formed syntax is checked. Tags that are well-formed but
 * not registered, such as `xx-YY`, still pass and should be ignored by
 * clients rather than rejected.
 *
 * @param message The error message.
 *
 * @returns A language action.
 */
export function language<
  TInput extends string,
  const TMessage extends ErrorMessage<LanguageIssue<TInput>> | undefined
>(message: TMessage): LanguageAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function language(
  message?: ErrorMessage<LanguageIssue<string>>
): LanguageAction<string, ErrorMessage<LanguageIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "language",
    reference: language,
    async: false,
    expects: null,
    requirement: LANGUAGE_REGEX,
    message,
    "~run"(dataset, config) {
      if (dataset.typed && !this.requirement.test(dataset.value)) {
        _addIssue(this, "language", dataset, config);
      }
      return dataset;
    }
  };
}
