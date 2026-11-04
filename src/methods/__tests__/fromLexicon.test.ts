import { describe, expect, it } from "vitest";
import { readLexiconFixture } from "../../__tests__/fixtures/lexicons.js";
import { fromLexicon, toIdentifier, toImportAlias } from "../fromLexicon.js";

describe("fromLexicon", () => {
  it("should generate a record module", () => {
    expect(
      fromLexicon(readLexiconFixture("app.bsky.feed.post"))
    ).toMatchSnapshot();
  });

  it("should generate a query module", () => {
    expect(
      fromLexicon(readLexiconFixture("app.bsky.feed.getPosts"))
    ).toMatchSnapshot();
  });

  it("should generate a subscription module with nullable fields", () => {
    expect(
      fromLexicon(readLexiconFixture("com.atproto.sync.subscribeRepos"))
    ).toMatchSnapshot();
  });

  it("should generate a definitions module with tokens and known values", () => {
    expect(
      fromLexicon(readLexiconFixture("com.atproto.label.defs"))
    ).toMatchSnapshot();
  });

  it("should break reference cycles with v.lazy", () => {
    const code = fromLexicon(readLexiconFixture("app.bsky.feed.defs"));
    // threadViewPost lists itself as a reply variant.
    expect(code).toContain("v.lazy(() => threadViewPost)");
    // Every external document is imported once and referenced lazily, so
    // the generated modules can import each other without TDZ errors.
    expect(code).toContain(
      'import * as AppBskyActorDefs from "./app.bsky.actor.defs.js";'
    );
    expect(code).toContain("v.lazy(() => AppBskyActorDefs.profileViewBasic)");
    expect(code.match(/^import \* as AppBskyActorDefs/gmu)).toHaveLength(1);
  });

  it("should support import resolution and object mode options", () => {
    const code = fromLexicon(readLexiconFixture("app.bsky.graph.follow"), {
      objectMode: "strict",
      resolveImport: (nsid) => `@lexicons/${nsid.replaceAll(".", "/")}`,
      valiconImport: "../valicon.js"
    });
    expect(code).toContain('import * as lex from "../valicon.js";');
    expect(code).toContain(
      'import * as ComAtprotoRepoStrongRef from "@lexicons/com/atproto/repo/strongRef";'
    );
    expect(code).toContain('{ key: "tid", mode: "strict" }');
  });

  it("should produce safe identifiers", () => {
    expect(toIdentifier("main")).toBe("main");
    expect(toIdentifier("default")).toBe("_default");
    expect(toIdentifier("1st")).toBe("_1st");
    expect(toImportAlias("com.atproto.repo.strongRef")).toBe(
      "ComAtprotoRepoStrongRef"
    );
  });
});
