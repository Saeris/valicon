import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { uri } from "../uri.js";

describe("uri", () => {
  const schema = v.pipe(v.string(), uri());

  it("should return action object", () => {
    expect(uri("message")).toMatchObject({
      kind: "validation",
      type: "uri",
      reference: uri,
      expects: null,
      async: false,
      message: "message"
    });
  });

  it.each([
    "https://example.com/path?query=1#frag",
    "at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3jzfcijpj2z2a",
    "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
    "mailto:alice@example.com",
    "wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos"
  ])("should accept any scheme: %s", (value) => {
    expect(v.safeParse(schema, value).success).toBe(true);
  });

  it.each(["", "example.com", "https://", "http://exa mple.com", "/path"])(
    "should reject values without a scheme or with whitespace: %s",
    (value) => {
      expect(v.safeParse(schema, value).success).toBe(false);
    }
  );

  it("should enforce the 8 kilobyte limit", () => {
    expect(v.safeParse(schema, `https://x/${"a".repeat(8182)}`).success).toBe(
      true
    );
    expect(v.safeParse(schema, `https://x/${"a".repeat(8183)}`).success).toBe(
      false
    );
  });
});
