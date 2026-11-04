import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { getLexiconMetadata } from "../../utils/index.js";
import { id } from "../id.js";
import { knownValues } from "../knownValues.js";

describe("knownValues", () => {
  it("should not restrict the accepted values", () => {
    // Unlike enum, known values are suggestions: unknown strings still pass
    // so that Lexicons can introduce new values without breaking clients.
    const schema = v.pipe(v.string(), knownValues(["inform", "alert"]));
    expect(v.safeParse(schema, "alert").success).toBe(true);
    expect(v.safeParse(schema, "something-new").success).toBe(true);
  });

  it("should be readable as Lexicon metadata together with an id", () => {
    const schema = v.pipe(
      v.string(),
      knownValues(["!hide", "!warn"]),
      id("com.atproto.label.defs#labelValue")
    );
    expect(getLexiconMetadata(schema)).toStrictEqual({
      type: "string",
      knownValues: ["!hide", "!warn"],
      id: "com.atproto.label.defs#labelValue"
    });
  });
});
