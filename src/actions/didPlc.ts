import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { DID_PLC_REGEX } from "../regex.js";

/**
 * DID PLC issue interface.
 */
export interface DidPlcIssue<TInput extends string> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "did_plc";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The `did:plc` regex.
   */
  readonly requirement: RegExp;
}

/**
 * DID PLC action interface.
 */
export interface DidPlcAction<
  TInput extends string,
  TMessage extends ErrorMessage<DidPlcIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, DidPlcIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "did_plc";
  /**
   * The action reference.
   */
  readonly reference: typeof didPlc;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The `did:plc` regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates a [`did:plc`](https://github.com/did-method-plc/did-method-plc)
 * validation action.
 *
 * `did:plc` is the DID method created for atproto and used by the vast
 * majority of accounts. The identifier is a 24 character base32 hash of the
 * initial signing operation, such as `did:plc:ewvi7nxzyoun6zhxrhs64oiz`.
 *
 * Hint: Lexicon `did` fields accept any DID method. Only use this action when
 * your application specifically requires a `did:plc` identity.
 *
 * @returns A DID PLC action.
 */
export function didPlc<TInput extends string>(): DidPlcAction<
  TInput,
  undefined
>;

/**
 * Creates a [`did:plc`](https://github.com/did-method-plc/did-method-plc)
 * validation action.
 *
 * `did:plc` is the DID method created for atproto and used by the vast
 * majority of accounts. The identifier is a 24 character base32 hash of the
 * initial signing operation, such as `did:plc:ewvi7nxzyoun6zhxrhs64oiz`.
 *
 * Hint: Lexicon `did` fields accept any DID method. Only use this action when
 * your application specifically requires a `did:plc` identity.
 *
 * @param message The error message.
 *
 * @returns A DID PLC action.
 */
export function didPlc<
  TInput extends string,
  const TMessage extends ErrorMessage<DidPlcIssue<TInput>> | undefined
>(message: TMessage): DidPlcAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function didPlc(
  message?: ErrorMessage<DidPlcIssue<string>>
): DidPlcAction<string, ErrorMessage<DidPlcIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "did_plc",
    reference: didPlc,
    async: false,
    expects: null,
    requirement: DID_PLC_REGEX,
    message,
    "~run"(dataset, config) {
      if (dataset.typed && !this.requirement.test(dataset.value)) {
        _addIssue(this, "did:plc", dataset, config);
      }
      return dataset;
    }
  };
}
