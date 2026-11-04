import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { readInteropFixture } from "../../__tests__/fixtures/interop.js";
import { did, type DidAction, type DidIssue } from "../did.js";

describe("did", () => {
  describe("should return action object", () => {
    const baseAction: Omit<DidAction<string, never>, "message"> = {
      kind: "validation",
      type: "did",
      reference: did,
      expects: null,
      requirement: expect.any(RegExp),
      async: false,
      "~run": expect.any(Function)
    };

    it("with undefined message", () => {
      const action: DidAction<string, undefined> = {
        ...baseAction,
        message: undefined
      };
      expect(did()).toStrictEqual(action);
      expect(did(undefined)).toStrictEqual(action);
    });

    it("with string message", () => {
      expect(did("message")).toStrictEqual({
        ...baseAction,
        message: "message"
      } satisfies DidAction<string, string>);
    });
  });

  describe("should return dataset without issues", () => {
    // The atproto interop suite is the source of truth for DID syntax, so a
    // regression here means Valicon would reject real identities.
    it.each(readInteropFixture("did_syntax_valid"))("%s", (value) => {
      expect(v.safeParse(v.pipe(v.string(), did()), value).success).toBe(true);
    });
  });

  describe("should return dataset with issues", () => {
    it.each(readInteropFixture("did_syntax_invalid"))("%s", (value) => {
      expect(v.safeParse(v.pipe(v.string(), did()), value).success).toBe(false);
    });

    it("for DIDs longer than 2048 characters", () => {
      expect(
        v.safeParse(v.pipe(v.string(), did()), `did:plc:${"a".repeat(2041)}`)
          .success
      ).toBe(false);
    });

    it("with a descriptive issue", () => {
      const result = v.safeParse(v.pipe(v.string(), did()), "DID:plc:abc");
      expect(result.issues?.[0]).toMatchObject({
        kind: "validation",
        type: "did",
        expected: null,
        received: '"DID:plc:abc"',
        message: 'Invalid DID: Received "DID:plc:abc"'
      } satisfies Partial<DidIssue<string>>);
    });
  });
});
