import {
  metadata,
  type MetadataAction,
  object,
  type ObjectSchema,
  pipe,
  type SchemaWithPipe,
  string,
  type StringSchema
} from "valibot";
import { cid, type CidAction } from "../actions/index.js";
import type { CidLinkLexiconMetadata } from "../types/index.js";

/**
 * CID link schema type.
 */
export type CidLinkSchema = SchemaWithPipe<
  readonly [
    ObjectSchema<
      {
        readonly $link: SchemaWithPipe<
          readonly [StringSchema<undefined>, CidAction<string, undefined>]
        >;
      },
      undefined
    >,
    MetadataAction<
      { $link: string },
      { readonly lexicon: CidLinkLexiconMetadata }
    >
  ]
>;

/**
 * Creates a [CID link](https://atproto.com/specs/data-model#link-and-cid-formats)
 * schema.
 *
 * A CID link is a pointer to another piece of content-addressed data. In the
 * JSON representation of atproto data it is an object with a single `$link`
 * key holding the CID string: `{ "$link": "bafyrei..." }`. In the binary
 * (CBOR) representation it becomes a native CID. This is the Lexicon
 * `cid-link` type, used for example by `blob.ref` and firehose commit
 * messages.
 *
 * Hint: Most record fields use the `cid` *string* format instead of a link.
 * Use `v.pipe(v.string(), cid())` for those.
 *
 * @returns A CID link schema.
 */
// @__NO_SIDE_EFFECTS__
export function cidLink(): CidLinkSchema {
  return pipe(
    object({ $link: pipe(string(), cid()) }),
    metadata({ lexicon: { type: "cid-link" } })
  );
}
