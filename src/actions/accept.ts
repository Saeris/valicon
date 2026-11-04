import {
  _addIssue,
  _joinExpects,
  type BaseIssue,
  type BaseValidation,
  type ErrorMessage
} from "valibot";

/**
 * Accept issue interface.
 */
export interface AcceptIssue<
  TInput extends string,
  TRequirement extends readonly string[]
> extends BaseIssue<TInput> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "accept";
  /**
   * The expected property.
   */
  readonly expected: string;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The accepted MIME type patterns.
   */
  readonly requirement: TRequirement;
}

/**
 * Accept action interface.
 */
export interface AcceptAction<
  TInput extends string,
  TRequirement extends readonly string[],
  TMessage extends ErrorMessage<AcceptIssue<TInput, TRequirement>> | undefined
> extends BaseValidation<TInput, TInput, AcceptIssue<TInput, TRequirement>> {
  /**
   * The action type.
   */
  readonly type: "accept";
  /**
   * The action reference.
   */
  readonly reference: typeof accept;
  /**
   * The expected property.
   */
  readonly expects: string;
  /**
   * The accepted MIME type patterns.
   */
  readonly requirement: TRequirement;
  /**
   * The error message.
   */
  readonly message: TMessage;
}

/**
 * Checks whether a MIME type matches one of the accepted patterns.
 *
 * @param patterns The accepted patterns.
 * @param mimeType The MIME type to check.
 *
 * @returns Whether it matches.
 */
export function matchesAccept(
  patterns: readonly string[],
  mimeType: string
): boolean {
  return patterns.some(
    (pattern) =>
      pattern === "*/*" ||
      (pattern.endsWith("/*")
        ? mimeType.startsWith(pattern.slice(0, -1))
        : pattern === mimeType)
  );
}

/**
 * Creates an accept validation action.
 *
 * Matches a MIME type string against the `accept` list of a Lexicon `blob`
 * field. Entries are either exact MIME types such as `image/png`, or globs of
 * the form `image/*` and `*\/*`. This is the same matching rule a PDS applies
 * when a record references an uploaded blob.
 *
 * @param requirement The accepted MIME type patterns.
 *
 * @returns An accept action.
 */
export function accept<
  TInput extends string,
  const TRequirement extends readonly string[]
>(requirement: TRequirement): AcceptAction<TInput, TRequirement, undefined>;

/**
 * Creates an accept validation action.
 *
 * Matches a MIME type string against the `accept` list of a Lexicon `blob`
 * field. Entries are either exact MIME types such as `image/png`, or globs of
 * the form `image/*` and `*\/*`. This is the same matching rule a PDS applies
 * when a record references an uploaded blob.
 *
 * @param requirement The accepted MIME type patterns.
 * @param message The error message.
 *
 * @returns An accept action.
 */
export function accept<
  TInput extends string,
  const TRequirement extends readonly string[],
  const TMessage extends
    | ErrorMessage<AcceptIssue<TInput, TRequirement>>
    | undefined
>(
  requirement: TRequirement,
  message: TMessage
): AcceptAction<TInput, TRequirement, TMessage>;

// @__NO_SIDE_EFFECTS__
export function accept(
  requirement: readonly string[],
  message?: ErrorMessage<AcceptIssue<string, readonly string[]>>
): AcceptAction<
  string,
  readonly string[],
  ErrorMessage<AcceptIssue<string, readonly string[]>> | undefined
> {
  return {
    kind: "validation",
    type: "accept",
    reference: accept,
    async: false,
    expects: _joinExpects(
      requirement.map((pattern) => `"${pattern}"`),
      "|"
    ),
    requirement,
    message,
    "~run"(dataset, config) {
      if (dataset.typed && !matchesAccept(this.requirement, dataset.value)) {
        _addIssue(this, "MIME type", dataset, config);
      }
      return dataset;
    }
  };
}
