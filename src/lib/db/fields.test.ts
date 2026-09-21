import { describe, expect, it } from "vitest";
import { encodeStringList, decodeStringList, parseTagsInput } from "./fields";

describe("encodeStringList / decodeStringList", () => {
  it("round-trips a list of strings", () => {
    const encoded = encodeStringList(["a", "b", "c"]);
    expect(decodeStringList(encoded)).toEqual(["a", "b", "c"]);
  });

  it("drops empty/whitespace-only entries on encode", () => {
    expect(decodeStringList(encodeStringList(["a", "  ", "", "b"]))).toEqual(["a", "b"]);
  });

  it("decodes null/undefined/malformed input as an empty list instead of throwing", () => {
    expect(decodeStringList(null)).toEqual([]);
    expect(decodeStringList(undefined)).toEqual([]);
    expect(decodeStringList("not json")).toEqual([]);
    expect(decodeStringList("42")).toEqual([]);
  });
});

describe("parseTagsInput", () => {
  it("splits on commas and trims whitespace", () => {
    expect(parseTagsInput("event, partners ,  q4")).toEqual(["event", "partners", "q4"]);
  });

  it("drops empty segments", () => {
    expect(parseTagsInput("a,,b,")).toEqual(["a", "b"]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseTagsInput("")).toEqual([]);
  });
});
