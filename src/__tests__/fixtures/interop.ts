import { readFileSync } from "node:fs";

/**
 * The interop fixture files, copied from the `interop-test-files/syntax`
 * directory of the atproto repository. Each file lists one value per line.
 * Lines starting with `#` are comments.
 */
export type InteropFixture =
  | "atidentifier_syntax_invalid"
  | "atidentifier_syntax_valid"
  | "aturi_syntax_invalid"
  | "aturi_syntax_valid"
  | "datetime_parse_invalid"
  | "datetime_syntax_invalid"
  | "datetime_syntax_valid"
  | "did_syntax_invalid"
  | "did_syntax_valid"
  | "handle_syntax_invalid"
  | "handle_syntax_valid"
  | "language_parse_invalid"
  | "language_syntax_invalid"
  | "language_syntax_valid"
  | "nsid_syntax_invalid"
  | "nsid_syntax_valid"
  | "recordkey_syntax_invalid"
  | "recordkey_syntax_valid"
  | "tid_syntax_invalid"
  | "tid_syntax_valid";

/**
 * Reads the values of an interop fixture file.
 *
 * Hint: Lines are kept verbatim, including trailing whitespace, because
 * some fixtures deliberately test leading or trailing spaces.
 */
export function readInteropFixture(name: InteropFixture): string[] {
  return readFileSync(new URL(`./interop/${name}.txt`, import.meta.url), "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}
