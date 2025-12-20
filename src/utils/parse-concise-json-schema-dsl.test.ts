import { describe, it, expect } from "vitest";
import { parseConciseJsonSchemaDsl } from "./parse-concise-json-schema-dsl";

describe("parseConciseJsonSchemaDsl", () => {
  describe("basic parsing", () => {
    it("should return undefined for empty string", () => {
      expect(parseConciseJsonSchemaDsl("")).toBeUndefined();
    });

    it("should return undefined for whitespace-only string", () => {
      expect(parseConciseJsonSchemaDsl("   ")).toBeUndefined();
    });

    it("should parse a single field with default type (string)", () => {
      expect(parseConciseJsonSchemaDsl("name")).toEqual({
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      });
    });

    it("should parse a field with explicit string type", () => {
      expect(parseConciseJsonSchemaDsl("name str")).toEqual({
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      });
    });
  });

  describe("type mapping", () => {
    it("should map 'str' to string type", () => {
      const result = parseConciseJsonSchemaDsl("field str");
      expect(result?.properties.field).toEqual({ type: "string" });
    });

    it("should map 'string' to string type", () => {
      const result = parseConciseJsonSchemaDsl("field string");
      expect(result?.properties.field).toEqual({ type: "string" });
    });

    it("should map 'int' to integer type", () => {
      const result = parseConciseJsonSchemaDsl("field int");
      expect(result?.properties.field).toEqual({ type: "integer" });
    });

    it("should map 'integer' to integer type", () => {
      const result = parseConciseJsonSchemaDsl("field integer");
      expect(result?.properties.field).toEqual({ type: "integer" });
    });

    it("should map 'num' to number type", () => {
      const result = parseConciseJsonSchemaDsl("field num");
      expect(result?.properties.field).toEqual({ type: "number" });
    });

    it("should map 'number' to number type", () => {
      const result = parseConciseJsonSchemaDsl("field number");
      expect(result?.properties.field).toEqual({ type: "number" });
    });

    it("should map 'bool' to boolean type", () => {
      const result = parseConciseJsonSchemaDsl("field bool");
      expect(result?.properties.field).toEqual({ type: "boolean" });
    });

    it("should map 'boolean' to boolean type", () => {
      const result = parseConciseJsonSchemaDsl("field boolean");
      expect(result?.properties.field).toEqual({ type: "boolean" });
    });

    it("should be case-insensitive for type names", () => {
      const result = parseConciseJsonSchemaDsl("field INT");
      expect(result?.properties.field).toEqual({ type: "integer" });
    });

    it("should default to string for unknown types", () => {
      const result = parseConciseJsonSchemaDsl("field unknowntype");
      expect(result?.properties.field).toEqual({ type: "string" });
    });
  });

  describe("optional fields", () => {
    it("should mark field as optional with ? suffix", () => {
      const result = parseConciseJsonSchemaDsl("field?");
      expect(result?.required).toEqual([]);
      expect(result?.properties.field).toEqual({ type: "string" });
    });

    it("should handle optional field with type", () => {
      const result = parseConciseJsonSchemaDsl("count? int");
      expect(result?.required).toEqual([]);
      expect(result?.properties.count).toEqual({ type: "integer" });
    });

    it("should distinguish required and optional fields", () => {
      const result = parseConciseJsonSchemaDsl("name str, age? int");
      expect(result?.required).toEqual(["name"]);
      expect(result?.properties.name).toEqual({ type: "string" });
      expect(result?.properties.age).toEqual({ type: "integer" });
    });
  });

  describe("descriptions", () => {
    it("should parse description after colon", () => {
      const result = parseConciseJsonSchemaDsl("name str: The user name");
      expect(result?.properties.name).toEqual({
        type: "string",
        description: "The user name",
      });
    });

    it("should handle description with leading/trailing whitespace", () => {
      const result = parseConciseJsonSchemaDsl("name str:   spaced description   ");
      expect(result?.properties.name?.description).toBe("spaced description");
    });

    it("should handle empty description", () => {
      const result = parseConciseJsonSchemaDsl("name str:");
      expect(result?.properties.name?.description).toBeUndefined();
    });
  });

  describe("comma-separated fields", () => {
    it("should parse multiple fields separated by commas", () => {
      const result = parseConciseJsonSchemaDsl("name str, age int, active bool");
      expect(result).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
          active: { type: "boolean" },
        },
        required: ["name", "age", "active"],
      });
    });

    it("should handle spaces around commas", () => {
      const result = parseConciseJsonSchemaDsl("a str ,  b int");
      expect(Object.keys(result?.properties ?? {})).toEqual(["a", "b"]);
    });
  });

  describe("newline-separated fields", () => {
    it("should split by newline when present (allows commas in descriptions)", () => {
      const result = parseConciseJsonSchemaDsl(
        "name str: First, last name\nage int: Years old",
      );
      expect(result?.properties.name).toEqual({
        type: "string",
        description: "First, last name",
      });
      expect(result?.properties.age).toEqual({
        type: "integer",
        description: "Years old",
      });
    });

    it("should handle mixed empty lines", () => {
      const result = parseConciseJsonSchemaDsl("a str\n\nb int\n");
      expect(Object.keys(result?.properties ?? {})).toEqual(["a", "b"]);
    });
  });

  describe("complex schemas", () => {
    it("should handle a realistic person schema", () => {
      const result = parseConciseJsonSchemaDsl(
        "name str, age int, email? str, active bool",
      );
      expect(result).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
          email: { type: "string" },
          active: { type: "boolean" },
        },
        required: ["name", "age", "active"],
      });
    });
  });
});
