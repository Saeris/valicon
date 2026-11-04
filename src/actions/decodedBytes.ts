import {
  _addIssue,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";

/**
 * Returns the number of bytes a base64 string decodes to.
 *
 * Hint: The input is assumed to be valid base64 with optional padding.
 *
 * @param input The base64 string.
 *
 * @returns The decoded byte length.
 */
export function getDecodedByteLength(input: string): number {
  let length = input.length;
  while (length > 0 && input[length - 1] === "=") {
    length--;
  }
  return Math.floor((length * 3) / 4);
}

/**
 * Min decoded bytes issue interface.
 */
export interface MinDecodedBytesIssue<
  TInput extends string,
  TRequirement extends number
> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "min_decoded_bytes";
  /**
   * The expected property.
   */
  readonly expected: `>=${TRequirement}`;
  /**
   * The received property.
   */
  readonly received: `${number}`;
  /**
   * The minimum decoded byte length.
   */
  readonly requirement: TRequirement;
}

/**
 * Min decoded bytes action interface.
 */
export interface MinDecodedBytesAction<
  TInput extends string,
  TRequirement extends number,
  TMessage extends
    | ErrorMessage<MinDecodedBytesIssue<TInput, TRequirement>>
    | undefined
> extends BaseValidation<
  TInput,
  TInput,
  MinDecodedBytesIssue<TInput, TRequirement>
> {
  /**
   * The action type.
   */
  readonly type: "min_decoded_bytes";
  /**
   * The action reference.
   */
  readonly reference: typeof minDecodedBytes;
  /**
   * The expected property.
   */
  readonly expects: `>=${TRequirement}`;
  /**
   * The minimum decoded byte length.
   */
  readonly requirement: TRequirement;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates a min decoded bytes validation action.
 *
 * Lexicon `bytes` fields are encoded in JSON as `{ "$bytes": "<base64>" }`,
 * and their `minLength` limit counts the raw bytes after decoding, not the
 * characters of the base64 string. This action enforces that limit on the
 * base64 string. The `bytes()` schema adds it for you.
 *
 * @param requirement The minimum decoded byte length.
 *
 * @returns A min decoded bytes action.
 */
export function minDecodedBytes<
  TInput extends string,
  const TRequirement extends number
>(
  requirement: TRequirement
): MinDecodedBytesAction<TInput, TRequirement, undefined>;

/**
 * Creates a min decoded bytes validation action.
 *
 * Lexicon `bytes` fields are encoded in JSON as `{ "$bytes": "<base64>" }`,
 * and their `minLength` limit counts the raw bytes after decoding, not the
 * characters of the base64 string. This action enforces that limit on the
 * base64 string. The `bytes()` schema adds it for you.
 *
 * @param requirement The minimum decoded byte length.
 * @param message The error message.
 *
 * @returns A min decoded bytes action.
 */
export function minDecodedBytes<
  TInput extends string,
  const TRequirement extends number,
  const TMessage extends
    | ErrorMessage<MinDecodedBytesIssue<TInput, TRequirement>>
    | undefined
>(
  requirement: TRequirement,
  message: TMessage
): MinDecodedBytesAction<TInput, TRequirement, TMessage>;

// @__NO_SIDE_EFFECTS__
export function minDecodedBytes(
  requirement: number,
  message?: ErrorMessage<MinDecodedBytesIssue<string, number>>
): MinDecodedBytesAction<
  string,
  number,
  ErrorMessage<MinDecodedBytesIssue<string, number>> | undefined
> {
  return {
    kind: "validation",
    type: "min_decoded_bytes",
    reference: minDecodedBytes,
    async: false,
    expects: `>=${requirement}`,
    requirement,
    message,
    "~run"(dataset, config) {
      if (dataset.typed) {
        const length = getDecodedByteLength(dataset.value);
        if (length < this.requirement) {
          _addIssue(this, "bytes", dataset, config, {
            received: `${length}`
          });
        }
      }
      return dataset;
    }
  };
}

/**
 * Max decoded bytes issue interface.
 */
export interface MaxDecodedBytesIssue<
  TInput extends string,
  TRequirement extends number
> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "max_decoded_bytes";
  /**
   * The expected property.
   */
  readonly expected: `<=${TRequirement}`;
  /**
   * The received property.
   */
  readonly received: `${number}`;
  /**
   * The maximum decoded byte length.
   */
  readonly requirement: TRequirement;
}

/**
 * Max decoded bytes action interface.
 */
export interface MaxDecodedBytesAction<
  TInput extends string,
  TRequirement extends number,
  TMessage extends
    | ErrorMessage<MaxDecodedBytesIssue<TInput, TRequirement>>
    | undefined
> extends BaseValidation<
  TInput,
  TInput,
  MaxDecodedBytesIssue<TInput, TRequirement>
> {
  /**
   * The action type.
   */
  readonly type: "max_decoded_bytes";
  /**
   * The action reference.
   */
  readonly reference: typeof maxDecodedBytes;
  /**
   * The expected property.
   */
  readonly expects: `<=${TRequirement}`;
  /**
   * The maximum decoded byte length.
   */
  readonly requirement: TRequirement;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Creates a max decoded bytes validation action.
 *
 * Lexicon `bytes` fields are encoded in JSON as `{ "$bytes": "<base64>" }`,
 * and their `maxLength` limit counts the raw bytes after decoding, not the
 * characters of the base64 string. This action enforces that limit on the
 * base64 string. The `bytes()` schema adds it for you.
 *
 * @param requirement The maximum decoded byte length.
 *
 * @returns A max decoded bytes action.
 */
export function maxDecodedBytes<
  TInput extends string,
  const TRequirement extends number
>(
  requirement: TRequirement
): MaxDecodedBytesAction<TInput, TRequirement, undefined>;

/**
 * Creates a max decoded bytes validation action.
 *
 * Lexicon `bytes` fields are encoded in JSON as `{ "$bytes": "<base64>" }`,
 * and their `maxLength` limit counts the raw bytes after decoding, not the
 * characters of the base64 string. This action enforces that limit on the
 * base64 string. The `bytes()` schema adds it for you.
 *
 * @param requirement The maximum decoded byte length.
 * @param message The error message.
 *
 * @returns A max decoded bytes action.
 */
export function maxDecodedBytes<
  TInput extends string,
  const TRequirement extends number,
  const TMessage extends
    | ErrorMessage<MaxDecodedBytesIssue<TInput, TRequirement>>
    | undefined
>(
  requirement: TRequirement,
  message: TMessage
): MaxDecodedBytesAction<TInput, TRequirement, TMessage>;

// @__NO_SIDE_EFFECTS__
export function maxDecodedBytes(
  requirement: number,
  message?: ErrorMessage<MaxDecodedBytesIssue<string, number>>
): MaxDecodedBytesAction<
  string,
  number,
  ErrorMessage<MaxDecodedBytesIssue<string, number>> | undefined
> {
  return {
    kind: "validation",
    type: "max_decoded_bytes",
    reference: maxDecodedBytes,
    async: false,
    expects: `<=${requirement}`,
    requirement,
    message,
    "~run"(dataset, config) {
      if (dataset.typed) {
        const length = getDecodedByteLength(dataset.value);
        if (length > this.requirement) {
          _addIssue(this, "bytes", dataset, config, {
            received: `${length}`
          });
        }
      }
      return dataset;
    }
  };
}
