import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { DID_REGEX } from "../regex.js";

/**
 * DID issue interface.
 */
export interface DidIssue<TInput extends string> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "did";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The DID regex.
   */
  readonly requirement: RegExp;
}

/**
 * DID action interface.
 */
export interface DidAction<
  TInput extends string,
  TMessage extends ErrorMessage<DidIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, DidIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "did";
  /**
   * The action reference.
   */
  readonly reference: typeof did;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The DID regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates a [DID](https://atproto.com/specs/did) validation action.
 *
 * A DID (Decentralized Identifier) is the permanent, globally unique
 * identifier of an atproto account, such as `did:plc:ewvi7nxzyoun6zhxrhs64oiz`
 * or `did:web:example.com`. Handles can change, DIDs never do. This is the
 * Lexicon `did` string format.
 *
 * Hint: This action accepts any syntactically valid W3C DID of at most 2048
 * characters, as the Lexicon spec requires. atproto itself only supports the
 * `did:plc` and `did:web` methods. Use `didPlc()` or `didWeb()` to restrict
 * the method.
 *
 * @returns A DID action.
 */
export function did<TInput extends string>(): DidAction<TInput, undefined>;

/**
 * Creates a [DID](https://atproto.com/specs/did) validation action.
 *
 * A DID (Decentralized Identifier) is the permanent, globally unique
 * identifier of an atproto account, such as `did:plc:ewvi7nxzyoun6zhxrhs64oiz`
 * or `did:web:example.com`. Handles can change, DIDs never do. This is the
 * Lexicon `did` string format.
 *
 * Hint: This action accepts any syntactically valid W3C DID of at most 2048
 * characters, as the Lexicon spec requires. atproto itself only supports the
 * `did:plc` and `did:web` methods. Use `didPlc()` or `didWeb()` to restrict
 * the method.
 *
 * @param message The error message.
 *
 * @returns A DID action.
 */
export function did<
  TInput extends string,
  const TMessage extends ErrorMessage<DidIssue<TInput>> | undefined
>(message: TMessage): DidAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function did(
  message?: ErrorMessage<DidIssue<string>>
): DidAction<string, ErrorMessage<DidIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "did",
    reference: did,
    async: false,
    expects: null,
    requirement: DID_REGEX,
    message,
    "~run"(dataset, config) {
      if (
        dataset.typed &&
        !(dataset.value.length <= 2048 && this.requirement.test(dataset.value))
      ) {
        _addIssue(this, "DID", dataset, config);
      }
      return dataset;
    }
  };
}
