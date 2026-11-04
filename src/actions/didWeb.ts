import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { DID_WEB_REGEX } from "../regex.js";

/**
 * DID web issue interface.
 */
export interface DidWebIssue<TInput extends string> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "did_web";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The `did:web` regex.
   */
  readonly requirement: RegExp;
}

/**
 * DID web action interface.
 */
export interface DidWebAction<
  TInput extends string,
  TMessage extends ErrorMessage<DidWebIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, DidWebIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "did_web";
  /**
   * The action reference.
   */
  readonly reference: typeof didWeb;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The `did:web` regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates a [`did:web`](https://atproto.com/specs/did#blessed-did-methods)
 * validation action.
 *
 * `did:web` identities are resolved over HTTPS from a domain name, such as
 * `did:web:example.com`. atproto only supports the hostname form: no paths,
 * and a port (encoded as `%3A`) only for `localhost` during development.
 *
 * Hint: Lexicon `did` fields accept any DID method. Only use this action when
 * your application specifically requires a `did:web` identity.
 *
 * @returns A DID web action.
 */
export function didWeb<TInput extends string>(): DidWebAction<
  TInput,
  undefined
>;

/**
 * Creates a [`did:web`](https://atproto.com/specs/did#blessed-did-methods)
 * validation action.
 *
 * `did:web` identities are resolved over HTTPS from a domain name, such as
 * `did:web:example.com`. atproto only supports the hostname form: no paths,
 * and a port (encoded as `%3A`) only for `localhost` during development.
 *
 * Hint: Lexicon `did` fields accept any DID method. Only use this action when
 * your application specifically requires a `did:web` identity.
 *
 * @param message The error message.
 *
 * @returns A DID web action.
 */
export function didWeb<
  TInput extends string,
  const TMessage extends ErrorMessage<DidWebIssue<TInput>> | undefined
>(message: TMessage): DidWebAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function didWeb(
  message?: ErrorMessage<DidWebIssue<string>>
): DidWebAction<string, ErrorMessage<DidWebIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "did_web",
    reference: didWeb,
    async: false,
    expects: null,
    requirement: DID_WEB_REGEX,
    message,
    "~run"(dataset, config) {
      if (
        dataset.typed &&
        !(dataset.value.length <= 2048 && this.requirement.test(dataset.value))
      ) {
        _addIssue(this, "did:web", dataset, config);
      }
      return dataset;
    }
  };
}
