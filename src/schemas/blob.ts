import {
  type GenericSchema,
  integer,
  literal,
  type LiteralSchema,
  maxValue,
  metadata,
  type MetadataAction,
  minValue,
  nonEmpty,
  number,
  object,
  type ObjectSchema,
  pipe,
  type SchemaWithPipe,
  string
} from "valibot";
import { accept } from "../actions/index.js";
import type { BlobLexiconMetadata } from "../types/index.js";
import { cidLink, type CidLinkSchema } from "./cidLink.js";

/**
 * Blob options interface.
 */
export interface BlobOptions {
  /**
   * The accepted MIME types. Entries may be exact types such as `image/png`
   * or globs such as `image/*`.
   */
  readonly accept?: readonly string[];
  /**
   * The maximum blob size in bytes.
   */
  readonly maxSize?: number;
}

/**
 * Blob schema type.
 */
export type BlobSchema = SchemaWithPipe<
  readonly [
    ObjectSchema<
      {
        readonly $type: LiteralSchema<"blob", undefined>;
        readonly ref: CidLinkSchema;
        readonly mimeType: GenericSchema<string>;
        readonly size: GenericSchema<number>;
      },
      undefined
    >,
    MetadataAction<
      {
        $type: "blob";
        ref: { $link: string };
        mimeType: string;
        size: number;
      },
      { readonly lexicon: BlobLexiconMetadata }
    >
  ]
>;

/**
 * Creates a [blob](https://atproto.com/specs/data-model#blob-type) schema.
 *
 * Records never contain files directly. Instead a file is uploaded to the
 * PDS with `com.atproto.repo.uploadBlob`, which returns a *blob reference*
 * that the record then embeds. A blob reference is an object with `$type`
 * fixed to `"blob"`, a `ref` CID link to the file content, its `mimeType`,
 * and its `size` in bytes. This is the Lexicon `blob` type, used for profile
 * avatars, post images, videos and so on.
 *
 * Hint: `accept` and `maxSize` mirror the Lexicon fields of the same name
 * and are enforced on `mimeType` and `size`. The deprecated legacy blob
 * format (`{ cid, mimeType }` without `$type`) is not accepted.
 *
 * @param options The blob options.
 *
 * @returns A blob schema.
 */
// @__NO_SIDE_EFFECTS__
export function blob(options?: BlobOptions): BlobSchema {
  // The pipelines are kept flat so that tools which only read the outermost
  // pipeline, such as Valimock, see every constraint.
  const mimeType: GenericSchema<string> = options?.accept
    ? pipe(string(), nonEmpty(), accept(options.accept))
    : pipe(string(), nonEmpty());
  const size: GenericSchema<number> =
    typeof options?.maxSize === "number"
      ? pipe(number(), integer(), minValue(0), maxValue(options.maxSize))
      : pipe(number(), integer(), minValue(0));
  return pipe(
    object({ $type: literal("blob"), ref: cidLink(), mimeType, size }),
    metadata({ lexicon: { type: "blob", ...options } })
  );
}
