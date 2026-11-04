// Conversion workload for deoptkit: compiles the published Lexicons to
// schemas, converts them back, and generates source code, repeatedly.
import { readdirSync, readFileSync } from "node:fs";
import { observed } from "deoptkit/harness";
import * as v from "valibot";
import { compileLexicons, fromLexicon, toLexicon } from "../dist/index.mjs";

const directory = new URL(
  "../src/__tests__/fixtures/lexicons/",
  import.meta.url
);
const docs = readdirSync(directory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(new URL(file, directory), "utf8")));

const placeholder = (nsid, name) =>
  v.looseObject({
    $type: v.optional(v.literal(name === "main" ? nsid : `${nsid}#${name}`))
  });
const compiled = compileLexicons(docs, { resolve: placeholder });
const ids = Object.keys(compiled);

observed(
  "compile lexicons",
  () => compileLexicons(docs, { resolve: placeholder }),
  { iterations: 300 }
);
observed(
  "to lexicon",
  (i) => toLexicon(compiled[ids[i % ids.length]], { id: ids[i % ids.length] }),
  { iterations: 3_000 }
);
observed("from lexicon", (i) => fromLexicon(docs[i % docs.length]), {
  iterations: 3_000
});
