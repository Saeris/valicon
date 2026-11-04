import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { getLexiconMetadata } from "../../utils/index.js";
import { token } from "../token.js";

describe("token", () => {
  const requestLess = token("app.bsky.feed.defs#requestLess");

  it("should only accept its own fully qualified name", () => {
    expect(v.parse(requestLess, "app.bsky.feed.defs#requestLess")).toBe(
      "app.bsky.feed.defs#requestLess"
    );
    expect(v.safeParse(requestLess, "requestLess").success).toBe(false);
  });

  it("should carry Lexicon metadata for toLexicon", () => {
    expect(getLexiconMetadata(requestLess)).toStrictEqual({ type: "token" });
  });
});
