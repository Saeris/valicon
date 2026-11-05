import { describe, expect, it } from "vitest";
import { parseAtUri } from "../parseAtUri.js";

describe("parseAtUri", () => {
  it("should split a record URI into its parts", () => {
    expect(
      parseAtUri(
        "at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3jzfcijpj2z2a"
      )
    ).toStrictEqual({
      authority: "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
      collection: "app.bsky.feed.post",
      rkey: "3jzfcijpj2z2a"
    });
    expect(parseAtUri("at://alice.bsky.social")).toStrictEqual({
      authority: "alice.bsky.social"
    });
  });

  it("should decode fragments and reject malformed escapes", () => {
    const base = "at://alice.bsky.social/app.bsky.feed.post/3jzfcijpj2z2a";
    expect(parseAtUri(`${base}#/a%20b`)?.fragment).toBe("/a b");
    // "%E0" starts a multi-byte sequence that never completes, which the
    // spec's JSON pointer rules do not allow.
    expect(parseAtUri(`${base}#/%E0`)).toBeNull();
  });
});
