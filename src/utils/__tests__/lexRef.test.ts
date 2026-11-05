import { describe, expect, it } from "vitest";
import {
  joinLexRef,
  splitLexRef,
  toAbsoluteLexRef,
  toRelativeLexRef
} from "../lexRef.js";

describe("lexRef", () => {
  it("should split references the way the Lexicon spec reads them", () => {
    // A bare NSID means the main definition of that document.
    expect(splitLexRef("com.example.post")).toStrictEqual({
      nsid: "com.example.post",
      name: "main"
    });
    expect(splitLexRef("com.example.defs#view")).toStrictEqual({
      nsid: "com.example.defs",
      name: "view"
    });
    // A leading hash is a reference within the current document.
    expect(splitLexRef("#view")).toStrictEqual({ nsid: "", name: "view" });
  });

  it("should join references back to their shortest spelling", () => {
    expect(joinLexRef("com.example.post", "main")).toBe("com.example.post");
    expect(joinLexRef("com.example.defs", "view")).toBe(
      "com.example.defs#view"
    );
  });

  it("should convert between document-relative and global spellings", () => {
    const doc = "com.example.defs";
    expect(toRelativeLexRef("com.example.defs#view", doc)).toBe("#view");
    expect(toRelativeLexRef("#view", doc)).toBe("#view");
    expect(toRelativeLexRef("com.example.post", doc)).toBe("com.example.post");
    expect(toAbsoluteLexRef("#view", doc)).toBe("com.example.defs#view");
    expect(toAbsoluteLexRef("#main", doc)).toBe("com.example.defs");
    // References into other documents are already global.
    expect(toAbsoluteLexRef("com.example.post#reply", doc)).toBe(
      "com.example.post#reply"
    );
  });
});
