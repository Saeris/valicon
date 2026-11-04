import {
  type GenericSchema,
  metadata,
  type MetadataAction,
  object,
  type ObjectSchema,
  pipe,
  regex,
  type SchemaWithPipe,
  string
} from "valibot";
import { maxDecodedBytes, minDecodedBytes } from "../actions/index.js";
import { BYTES_REGEX } from "../regex.js";
import type { BytesLexiconMetadata } from "../types/index.js";

/**
 * Bytes options interface.
 */
export interface BytesOptions {
  /**
   * The minimum number of raw (decoded) bytes.
   */
  readonly minLength?: number;
  /**
   * The maximum number of raw (decoded) bytes.
   */
  readonly maxLength?: number;
}

/**
 * Bytes schema type.
 */
export type BytesSchema = SchemaWithPipe<
  readonly [
    ObjectSchema<{ readonly $bytes: GenericSchema<string> }, undefined>,
    MetadataAction<
      { $bytes: string },
      { readonly lexicon: BytesLexiconMetadata }
    >
  ]
>;

/**
 * Creates a [bytes](https://atproto.com/specs/data-model#bytes) schema.
 *
 * Raw binary data is rare in atproto records, but it does appear, for example
 * as the cryptographic signature on a label. In JSON it is represented as an
 * object with a single `$bytes` key holding standard base64 (padding
 * optional): `{ "$bytes": "AAECAw" }`. This is the Lexicon `bytes` type.
 *
 * Hint: `minLength` and `maxLength` count the decoded bytes, matching the
 * Lexicon definition, not the length of the base64 string.
 *
 * @param options The bytes options.
 *
 * @returns A bytes schema.
 */
// @__NO_SIDE_EFFECTS__
export function bytes(options?: BytesOptions): BytesSchema {
  // The pipeline is kept flat so that tools which only read the outermost
  // pipeline, such as Valimock, see every constraint.
  const base64: GenericSchema<string> = pipe(
    string(),
    regex(BYTES_REGEX, "Invalid base64: Received invalid $bytes encoding"),
    ...(typeof options?.minLength === "number"
      ? [minDecodedBytes<string, number>(options.minLength)]
      : []),
    ...(typeof options?.maxLength === "number"
      ? [maxDecodedBytes<string, number>(options.maxLength)]
      : [])
  );
  return pipe(
    object({ $bytes: base64 }),
    metadata({ lexicon: { type: "bytes", ...options } })
  );
}
