import { describe, expect, it } from "vitest";
import { readLexiconFixture } from "../../__tests__/fixtures/lexicons.js";
import {
  count,
  kitchenSink,
  syntheticLexicons
} from "../../__tests__/fixtures/synthetic.js";
import type { LexiconDoc } from "../../types/index.js";
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

  it.each(syntheticLexicons.map((doc): [string, LexiconDoc] => [doc.id, doc]))(
    "should generate a module for %s",
    (_nsid, doc) => {
      expect(fromLexicon(doc)).toContain("export const main");
    }
  );

  it("should quote property names that are not identifiers", () => {
    expect(fromLexicon(kitchenSink)).toContain('"content-type": ');
  });

  it("should use strict objects for anonymous objects when asked", () => {
    // Params and body objects have no `$type`, so they are plain Valibot
    // objects whose flavor follows the object mode.
    expect(fromLexicon(count, { objectMode: "strict" })).toContain(
      "v.strictObject("
    );
    expect(fromLexicon(count, { objectMode: "strip" })).toContain("v.object(");
    expect(fromLexicon(count)).toContain("v.looseObject(");
  });

  it("should reject documents Valicon cannot express", () => {
    const doc = (main: unknown): LexiconDoc =>
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      ({ lexicon: 1, id: "com.example.bad", defs: { main } }) as LexiconDoc;
    const withProperty = (property: unknown): LexiconDoc =>
      doc({ type: "object", properties: { x: property } });
    expect(() =>
      fromLexicon(withProperty({ type: "ref", ref: "#nope" }))
    ).toThrow('Unknown reference "#nope"');
    expect(() =>
      fromLexicon(withProperty({ type: "string", format: "ipv4" }))
    ).toThrow('Unknown string format "ipv4"');
    expect(() => fromLexicon(withProperty({ type: "float" }))).toThrow(
      'Unsupported Lexicon type "float"'
    );
    expect(() => fromLexicon(doc({ type: "float" }))).toThrow(
      'Unsupported Lexicon definition type "float"'
    );
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
