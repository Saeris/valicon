import { readdirSync, readFileSync } from "node:fs";
import type { LexiconDoc } from "../../types/index.js";

/**
 * Reads every real-world Lexicon document in the fixtures directory. These
 * are verbatim copies of the `app.bsky` and `com.atproto` Lexicons published
 * by Bluesky, chosen to cover every Lexicon type and format.
 */
export function readLexiconFixtures(): LexiconDoc[] {
  const directory = new URL("./lexicons/", import.meta.url);
  return readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map(
      (file) =>
        JSON.parse(readFileSync(new URL(file, directory), "utf8")) as LexiconDoc
    );
}

/**
 * Reads a single Lexicon fixture by NSID.
 */
export function readLexiconFixture(nsid: string): LexiconDoc {
  return JSON.parse(
    readFileSync(new URL(`./lexicons/${nsid}.json`, import.meta.url), "utf8")
  ) as LexiconDoc;
}
