type JsonSchemaType = "string" | "integer" | "number" | "boolean";

interface JsonSchemaProperty {
  type: JsonSchemaType;
  description?: string;
}

interface JsonSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
}

const TYPE_MAP: Record<string, JsonSchemaType> = {
  str: "string",
  string: "string",
  int: "integer",
  integer: "integer",
  num: "number",
  number: "number",
  bool: "boolean",
  boolean: "boolean",
};

export function parseConciseJsonSchemaDsl(dsl: string): JsonSchema | undefined {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  // If input contains newlines, split by newline (allows commas in descriptions)
  // Otherwise split by comma
  const hasNewlines = dsl.includes("\n");
  const fields = dsl
    .split(hasNewlines ? /\n/ : /,/)
    .map((f) => f.trim())
    .filter(Boolean);

  for (const field of fields) {
    // Extract description if present (after colon)
    const colonIdx = field.indexOf(":");
    const beforeColon = colonIdx >= 0 ? field.slice(0, colonIdx) : field;
    const description =
      colonIdx >= 0 ? field.slice(colonIdx + 1).trim() : undefined;

    // Parse "fieldName? type" pattern
    const parts = beforeColon.trim().split(/\s+/);
    let fieldName = parts[0] ?? "";
    const typeHint = parts[1] ?? "";

    // Check for optional marker
    const optional = fieldName.endsWith("?");
    if (optional) {
      fieldName = fieldName.slice(0, -1);
    }

    if (!fieldName) {
      continue; // Skip invalid field definitions
    }

    // Resolve type
    const schemaType: JsonSchemaType =
      TYPE_MAP[typeHint?.toLowerCase()] ?? "string";

    properties[fieldName] = { type: schemaType };
    if (description) {
      properties[fieldName]!.description = description;
    }

    if (!optional) {
      required.push(fieldName);
    }
  }

  if (Object.keys(properties).length === 0) {
    return undefined;
  }

  return {
    type: "object",
    properties,
    required,
  };
}
