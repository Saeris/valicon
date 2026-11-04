import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { didPlc } from "../didPlc.js";
import { didWeb } from "../didWeb.js";

describe("didPlc", () => {
  const schema = v.pipe(v.string(), didPlc());

  it("should return action object", () => {
    expect(didPlc("message")).toMatchObject({
      kind: "validation",
      type: "did_plc",
      reference: didPlc,
      expects: null,
      async: false,
      message: "message"
    });
  });

  it("should accept real did:plc identifiers", () => {
    expect(
      v.safeParse(schema, "did:plc:ewvi7nxzyoun6zhxrhs64oiz").success
    ).toBe(true);
    expect(
      v.safeParse(schema, "did:plc:7iza6de2dwap2sbkpav7c6c6").success
    ).toBe(true);
  });

  it.each([
    "did:web:example.com",
    "did:plc:EWVI7NXZYOUN6ZHXRHS64OIZ",
    "did:plc:ewvi7nxzyoun6zhxrhs64oi",
    "did:plc:ewvi7nxzyoun6zhxrhs64oiz1"
  ])("should reject other methods and malformed identifiers: %s", (value) => {
    expect(v.safeParse(schema, value).success).toBe(false);
  });
});

describe("didWeb", () => {
  const schema = v.pipe(v.string(), didWeb());

  it("should return action object", () => {
    expect(didWeb("message")).toMatchObject({
      kind: "validation",
      type: "did_web",
      reference: didWeb,
      expects: null,
      async: false,
      message: "message"
    });
  });

  it.each([
    "did:web:example.com",
    "did:web:sub.example.com",
    "did:web:localhost",
    "did:web:localhost%3A1234"
  ])("should accept hostname identifiers: %s", (value) => {
    expect(v.safeParse(schema, value).success).toBe(true);
  });

  it.each([
    "did:plc:ewvi7nxzyoun6zhxrhs64oiz",
    // Paths are not supported by atproto.
    "did:web:example.com:user:alice",
    // Ports are only allowed for localhost.
    "did:web:example.com%3A8080",
    "did:web:"
  ])("should reject unsupported forms: %s", (value) => {
    expect(v.safeParse(schema, value).success).toBe(false);
  });
});
