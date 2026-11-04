import * as v from "valibot";
import { joinLexRef, encodeBase32 } from "../../utils/index.js";

/**
 * Builds a syntactically valid CID of the atproto profile with a
 * deterministic digest, for use in sample records.
 */
export function sampleCid(codec: "dag-cbor" | "raw", seed = 7): string {
  const bytes = new Uint8Array(36);
  bytes.set([1, codec === "dag-cbor" ? 0x71 : 0x55, 0x12, 0x20]);
  for (let index = 4; index < 36; index++) {
    bytes[index] = (index * 31 + seed * 17) % 256;
  }
  return `b${encodeBase32(bytes)}`;
}

/**
 * A realistic `app.bsky.feed.post` record, as a client would write it.
 */
export const samplePost = {
  $type: "app.bsky.feed.post",
  text: "Hello from Valicon! https://example.com",
  createdAt: "2024-01-15T12:30:00.000Z",
  langs: ["en"],
  facets: [
    {
      index: { byteStart: 20, byteEnd: 39 },
      features: [
        { $type: "app.bsky.richtext.facet#link", uri: "https://example.com" }
      ]
    }
  ],
  reply: {
    root: {
      uri: "at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3jzfcijpj2z2a",
      cid: sampleCid("dag-cbor", 1)
    },
    parent: {
      uri: "at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3jzfcijpj2z2b",
      cid: sampleCid("dag-cbor", 2)
    }
  },
  embed: {
    $type: "app.bsky.embed.images",
    images: [
      {
        image: {
          $type: "blob",
          ref: { $link: sampleCid("raw", 3) },
          mimeType: "image/png",
          size: 12345
        },
        alt: "A picture",
        aspectRatio: { width: 4, height: 3 }
      }
    ]
  },
  labels: {
    $type: "com.atproto.label.defs#selfLabels",
    values: [{ val: "nudity" }]
  }
};

/**
 * Resolves references to documents outside the fixture set with a permissive
 * placeholder, so that the fixture set can be compiled on its own.
 */
export function resolvePlaceholder(
  nsid: string,
  name: string
): v.GenericSchema {
  return v.looseObject({
    $type: v.optional(v.literal(joinLexRef(nsid, name)))
  });
}
