import { describe, expect, it } from "vitest";
import { readLexiconFixtures } from "../../__tests__/fixtures/lexicons.js";
import { resolvePlaceholder } from "../../__tests__/fixtures/samples.js";
import { syntheticLexicons } from "../../__tests__/fixtures/synthetic.js";
import type { LexiconDoc } from "../../types/index.js";
import { compileLexicons } from "../compileLexicon.js";
import { toLexicon } from "../toLexicon.js";

/**
 * Normalizes spellings that differ between published Lexicons and toLexicon
 * without changing their meaning: empty `required` lists are dropped, and
 * self references written in full (`com.example.doc#name`) become `#name`.
 */
function normalize(value: unknown, docId: string): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalize(entry, docId));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key, entry]) =>
            !(key === "required" && Array.isArray(entry) && entry.length === 0)
        )
        .map(([key, entry]) => [
          key,
          key === "ref" && typeof entry === "string"
            ? entry.replace(`${docId}#`, "#")
            : key === "refs" && Array.isArray(entry)
              ? entry.map((ref: unknown) =>
                  typeof ref === "string" ? ref.replace(`${docId}#`, "#") : ref
                )
              : normalize(entry, docId)
        ])
    );
  }
  return value;
}

describe("lexicon round trip", () => {
  // Compiling a published Lexicon into schemas and converting those schemas
  // back must reproduce the original document. This is the strongest
  // guarantee that compileLexicon, fromLexicon and toLexicon agree on the
  // meaning of every Lexicon feature used in the wild.
  const docs = readLexiconFixtures();
  const compiled = compileLexicons(docs, { resolve: resolvePlaceholder });

  it.each(docs.map((doc): [string, LexiconDoc] => [doc.id, doc]))(
    "%s",
    (nsid, doc) => {
      const defs = compiled[nsid]!;
      expect(
        toLexicon(defs, {
          id: nsid,
          ...(doc.description ? { description: doc.description } : {})
        })
      ).toEqual(normalize(doc, nsid));
    }
  );

  // The synthetic documents cover the Lexicon features the published
  // fixtures happen not to use, so the guarantee extends to the whole spec.
  const synthetic = compileLexicons(syntheticLexicons);

  it.each(syntheticLexicons.map((doc): [string, LexiconDoc] => [doc.id, doc]))(
    "%s",
    (nsid, doc) => {
      expect(
        toLexicon(synthetic[nsid]!, {
          id: nsid,
          ...(doc.description ? { description: doc.description } : {})
        })
      ).toEqual(normalize(doc, nsid));
    }
  );
});
