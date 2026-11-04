import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";
import { CID_REGEX } from "../regex.js";

/**
 * CID issue interface.
 */
export interface CidIssue<TInput extends string> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "cid";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The CID regex.
   */
  readonly requirement: RegExp;
}

/**
 * CID action interface.
 */
export interface CidAction<
  TInput extends string,
  TMessage extends ErrorMessage<CidIssue<TInput>> | undefined
> extends BaseValidation<TInput, TInput, CidIssue<TInput>> {
  /**
   * The action type.
   */
  readonly type: "cid";
  /**
   * The action reference.
   */
  readonly reference: typeof cid;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The CID regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates a [CID](https://atproto.com/specs/data-model#link-and-cid-formats)
 * validation action.
 *
 * A CID (Content Identifier) is the hash of a piece of content. atproto uses
 * them to pin a record to an exact version (`cid` fields next to `uri`
 * fields), to identify repository commits, and to reference blobs. This is
 * the Lexicon `cid` string format.
 *
 * Hint: Only the CID profile allowed by the atproto data model is accepted:
 * CIDv1, `dag-cbor` or `raw` codec, `sha-256` digest, base32 encoded with the
 * `b` prefix. Such CIDs are always 59 characters and start with `bafyrei`
 * (records, commits) or `bafkrei` (blobs).
 *
 * @returns A CID action.
 */
export function cid<TInput extends string>(): CidAction<TInput, undefined>;

/**
 * Creates a [CID](https://atproto.com/specs/data-model#link-and-cid-formats)
 * validation action.
 *
 * A CID (Content Identifier) is the hash of a piece of content. atproto uses
 * them to pin a record to an exact version (`cid` fields next to `uri`
 * fields), to identify repository commits, and to reference blobs. This is
 * the Lexicon `cid` string format.
 *
 * Hint: Only the CID profile allowed by the atproto data model is accepted:
 * CIDv1, `dag-cbor` or `raw` codec, `sha-256` digest, base32 encoded with the
 * `b` prefix. Such CIDs are always 59 characters and start with `bafyrei`
 * (records, commits) or `bafkrei` (blobs).
 *
 * @param message The error message.
 *
 * @returns A CID action.
 */
export function cid<
  TInput extends string,
  const TMessage extends ErrorMessage<CidIssue<TInput>> | undefined
>(message: TMessage): CidAction<TInput, TMessage>;

// @__NO_SIDE_EFFECTS__
export function cid(
  message?: ErrorMessage<CidIssue<string>>
): CidAction<string, ErrorMessage<CidIssue<string>> | undefined> {
  return {
    kind: "validation",
    type: "cid",
    reference: cid,
    async: false,
    expects: null,
    requirement: CID_REGEX,
    message,
    "~run"(dataset, config) {
      if (dataset.typed && !this.requirement.test(dataset.value)) {
        _addIssue(this, "CID", dataset, config);
      }
      return dataset;
    }
  };
}
