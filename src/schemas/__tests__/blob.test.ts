import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { sampleCid } from "../../__tests__/fixtures/samples.js";
import { getLexiconMetadata } from "../../utils/index.js";
import { blob } from "../blob.js";

describe("blob", () => {
  const avatar = {
    $type: "blob",
    ref: { $link: sampleCid("raw") },
    mimeType: "image/png",
    size: 1024
  };

  it("should accept a blob reference as returned by uploadBlob", () => {
    expect(v.parse(blob(), avatar)).toStrictEqual(avatar);
  });

  it("should enforce the accept list and size limit of the Lexicon", () => {
    const schema = blob({ accept: ["image/png", "image/jpeg"], maxSize: 1000 });
    expect(
      v.safeParse(schema, { ...avatar, mimeType: "image/jpeg", size: 1000 })
        .success
    ).toBe(true);
    expect(
      v.safeParse(schema, { ...avatar, mimeType: "image/gif" }).success
    ).toBe(false);
    expect(v.safeParse(schema, { ...avatar, size: 1001 }).success).toBe(false);
  });

  it("should reject the legacy blob format and malformed references", () => {
    // Legacy blobs predate `$type` and are never written by current software.
    expect(
      v.safeParse(blob(), { cid: sampleCid("raw"), mimeType: "image/png" })
        .success
    ).toBe(false);
    expect(v.safeParse(blob(), { ...avatar, $type: "image" }).success).toBe(
      false
    );
    expect(v.safeParse(blob(), { ...avatar, size: -1 }).success).toBe(false);
    expect(v.safeParse(blob(), { ...avatar, size: 1.5 }).success).toBe(false);
    expect(v.safeParse(blob(), { ...avatar, mimeType: "" }).success).toBe(
      false
    );
  });

  it("should carry the options as Lexicon metadata", () => {
    expect(
      getLexiconMetadata(blob({ accept: ["image/*"], maxSize: 2_000_000 }))
    ).toStrictEqual({ type: "blob", accept: ["image/*"], maxSize: 2_000_000 });
  });
});
