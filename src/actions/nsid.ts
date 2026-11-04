import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { NSID_REGEX } from "../regex.js";

/**
 * NSID issue interface.
 */
export interface NsidIssue<TInput extends string> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "nsid";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The NSID regex.
   */
  readonly requirement: RegExp;
}

/**
 * NSID action interface.
 */
export interface NsidAction<
  TInput extends string,
  TMessage extends ErrorMessage<NsidIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, NsidIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "nsid";
  /**
   * The action reference.
   */
  readonly reference: typeof nsid;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The NSID regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates an [NSID](https://atproto.com/specs/nsid) validation action.
 *
 * An NSID (Namespaced Identifier) names a Lexicon schema, and therefore a
 * record collection or API endpoint, using a reversed domain name followed by
 * a name segment: `app.bsky.feed.post`. The domain part is owned by whoever
 * controls the DNS name, which is how schemas are kept globally unique. This
 * is the Lexicon `nsid` string format.
 *
 * Hint: The name segment is case sensitive and usually camelCase. NSIDs may
 * be at most 317 characters long.
 *
 * @returns An NSID action.
 */
export function nsid<TInput extends string>(): NsidAction<TInput, undefined>;

/**
 * Creates an [NSID](https://atproto.com/specs/nsid) validation action.
 *
 * An NSID (Namespaced Identifier) names a Lexicon schema, and therefore a
 * record collection or API endpoint, using a reversed domain name followed by
 * a name segment: `app.bsky.feed.post`. The domain part is owned by whoever
 * controls the DNS name, which is how schemas are kept globally unique. This
 * is the Lexicon `nsid` string format.
 *
 * Hint: The name segment is case sensitive and usually camelCase. NSIDs may
 * be at most 317 characters long.
 *
 * @param message The error message.
 *
 * @returns An NSID action.
 */
export function nsid<
  TInput extends string,
  const TMessage extends ErrorMessage<NsidIssue<TInput>> | undefined
>(message: TMessage): NsidAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function nsid(
  message?: ErrorMessage<NsidIssue<string>>
): NsidAction<string, ErrorMessage<NsidIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "nsid",
    reference: nsid,
    async: false,
    expects: null,
    requirement: NSID_REGEX,
    message,
    "~run"(dataset, config) {
      if (
        dataset.typed &&
        !(dataset.value.length <= 317 && this.requirement.test(dataset.value))
      ) {
        _addIssue(this, "NSID", dataset, config);
      }
      return dataset;
    }
  };
}
