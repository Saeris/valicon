import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { isAtIdentifier } from "../utils/index.js";

/**
 * AT identifier issue interface.
 */
export interface AtIdentifierIssue<
  TInput extends string
> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "at_identifier";
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
 * AT identifier action interface.
 */
export interface AtIdentifierAction<
  TInput extends string,
  TMessage extends ErrorMessage<AtIdentifierIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, AtIdentifierIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "at_identifier";
  /**
   * The action reference.
   */
  readonly reference: typeof atIdentifier;
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
 * Creates an [AT identifier](https://atproto.com/specs/lexicon#at-identifier)
 * validation action.
 *
 * An AT identifier is either a DID or a handle. API endpoints that accept an
 * account reference, such as the `repo` parameter of
 * `com.atproto.repo.getRecord`, use this format so callers can pass whichever
 * they have. This is the Lexicon `at-identifier` string format.
 *
 * Hint: Anything starting with `did:` is validated as a DID, everything else
 * as a handle.
 *
 * @returns An AT identifier action.
 */
export function atIdentifier<TInput extends string>(): AtIdentifierAction<
  TInput,
  undefined
>;

/**
 * Creates an [AT identifier](https://atproto.com/specs/lexicon#at-identifier)
 * validation action.
 *
 * An AT identifier is either a DID or a handle. API endpoints that accept an
 * account reference, such as the `repo` parameter of
 * `com.atproto.repo.getRecord`, use this format so callers can pass whichever
 * they have. This is the Lexicon `at-identifier` string format.
 *
 * Hint: Anything starting with `did:` is validated as a DID, everything else
 * as a handle.
 *
 * @param message The error message.
 *
 * @returns An AT identifier action.
 */
export function atIdentifier<
  TInput extends string,
  const TMessage extends ErrorMessage<AtIdentifierIssue<TInput>> | undefined
>(message: TMessage): AtIdentifierAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function atIdentifier(
  message?: ErrorMessage<AtIdentifierIssue<string>>
): AtIdentifierAction<
  string,
  ErrorMessage<AtIdentifierIssue<string>> | undefined
> {
  return {
    kind: "validation",
    type: "at_identifier",
    reference: atIdentifier,
    async: false,
    expects: null,
    requirement: isAtIdentifier,
    message,
    "~run"(dataset, config) {
      if (dataset.typed && !this.requirement(dataset.value)) {
        _addIssue(this, "AT identifier", dataset, config);
      }
      return dataset;
    }
  };
}
