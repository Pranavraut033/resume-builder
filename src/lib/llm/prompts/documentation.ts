/**
 * Schema Documentation Generator
 * Auto-generates API documentation from Zod schemas
 */

import type { ZodType } from "zod";

/**
 * Schema field documentation
 */
export interface FieldDoc {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  enum?: string[];
  properties?: FieldDoc[];
}

/**
 * Generated documentation
 */
export interface SchemaDoc {
  title: string;
  description?: string;
  fields: FieldDoc[];
  example?: Record<string, unknown>;
  markdown?: string;
}

/**
 * Extract type name from Zod schema
 */
function getTypeName(schema: ZodType): string {
  const schemaRecord = schema as unknown as Record<string, unknown>;
  const typeName = (schemaRecord._def as Record<string, unknown> | undefined)?.typeName as
    | string
    | undefined;
  const fallbackName = schema.constructor.name;
  const type = typeName || fallbackName;

  switch (type) {
    case "ZodString":
      return "string";
    case "ZodNumber":
      return "number";
    case "ZodBoolean":
      return "boolean";
    case "ZodArray": {
      const def = schemaRecord._def as Record<string, unknown> | undefined;
      const element = def?.type as ZodType | undefined;
      const elementType = element ? getTypeName(element) : "unknown";
      return `${elementType}[]`;
    }
    case "ZodObject":
      return "object";
    case "ZodUnion":
      return "union";
    case "ZodOptional": {
      const def = schemaRecord._def as Record<string, unknown> | undefined;
      const wrapped = def?.schema as ZodType | undefined;
      const wrappedType = wrapped ? getTypeName(wrapped) : "unknown";
      return `${wrappedType}?`;
    }
    case "ZodNullable": {
      const def = schemaRecord._def as Record<string, unknown> | undefined;
      const nullWrapped = def?.schema as ZodType | undefined;
      const nullWrappedType = nullWrapped ? getTypeName(nullWrapped) : "unknown";
      return `${nullWrappedType} | null`;
    }
    default:
      return type;
  }
}

/**
 * Extract description from Zod schema
 */
function getDescription(schema: ZodType): string | undefined {
  return (schema as unknown as Record<string, unknown>)._def?.description as string | undefined;
}

/**
 * Extract enum values from Zod schema
 */
function getEnumValues(schema: ZodType): string[] | undefined {
  const values = (schema as unknown as Record<string, unknown>)._def?.values as unknown[] | undefined;
  if (Array.isArray(values)) {
    return values.map((v) => String(v));
  }
  return undefined;
}

/**
 * Check if schema is required
 */
function isRequired(schema: ZodType): boolean {
  const typeName = (schema as unknown as Record<string, unknown>)._def?.typeName as string | undefined;
  return typeName !== "ZodOptional" && typeName !== "ZodNullable";
}

/**
 * Extract fields from Zod object schema
 */
function extractFields(schema: ZodType): FieldDoc[] {
  const typeName = (schema as unknown as Record<string, unknown>)._def?.typeName as string | undefined;

  if (typeName !== "ZodObject") {
    return [];
  }

  const shapeFunc = (schema as unknown as Record<string, unknown>)._def?.shape as
    | (() => Record<string, ZodType>)
    | undefined;
  const shape = shapeFunc?.();
  if (!shape) {
    return [];
  }

  return Object.entries(shape).map(([name, fieldSchema]) => {
    const fs = fieldSchema as ZodType;
    return {
      name,
      type: getTypeName(fs),
      required: isRequired(fs),
      description: getDescription(fs),
      enum: getEnumValues(fs),
    };
  });
}

/**
 * Generate documentation from Zod schema
 */
export function generateSchemaDoc(
  schema: ZodType,
  title: string,
  description?: string
): SchemaDoc {
  const fields = extractFields(schema);

  // Generate example data
  const example: Record<string, unknown> = {};
  fields.forEach((field) => {
    if (field.type === "string") {
      example[field.name] = "example_value";
    } else if (field.type === "number") {
      example[field.name] = 42;
    } else if (field.type === "boolean") {
      example[field.name] = true;
    } else if (field.type.includes("[]")) {
      example[field.name] = [];
    } else if (field.type === "object") {
      example[field.name] = {};
    }
  });

  const doc: SchemaDoc = {
    title,
    description,
    fields,
    example,
  };

  // Generate markdown
  doc.markdown = generateMarkdown(doc);

  return doc;
}

/**
 * Generate markdown documentation
 */
export function generateMarkdown(doc: SchemaDoc): string {
  let md = `# ${doc.title}\n\n`;

  if (doc.description) {
    md += `${doc.description}\n\n`;
  }

  // Fields table
  md += `## Fields\n\n`;
  md += `| Field | Type | Required | Description |\n`;
  md += `|-------|------|----------|-------------|\n`;

  doc.fields.forEach((field) => {
    const req = field.required ? "Yes" : "No";
    const desc = field.description || "";
    const enumStr = field.enum ? ` (values: ${field.enum.join(", ")})` : "";
    md += `| \`${field.name}\` | \`${field.type}\` | ${req} | ${desc}${enumStr} |\n`;
  });

  md += `\n`;

  // Example
  if (doc.example) {
    md += `## Example\n\n`;
    md += `\`\`\`json\n`;
    md += `${JSON.stringify(doc.example, null, 2)}\n`;
    md += `\`\`\`\n`;
  }

  return md;
}

/**
 * Generate TypeScript type definition from schema doc
 */
export function generateTypeDefinition(doc: SchemaDoc): string {
  let ts = `/**\n * ${doc.title}\n`;
  if (doc.description) {
    ts += ` * ${doc.description}\n`;
  }
  ts += ` */\n`;
  ts += `export interface ${toPascalCase(doc.title)} {\n`;

  doc.fields.forEach((field) => {
    const optional = field.required ? "" : "?";
    ts += `  /** ${field.description || "Field"} */\n`;
    ts += `  ${field.name}${optional}: ${field.type};\n`;
  });

  ts += `}\n`;

  return ts;
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Get comprehensive schema documentation with all formats
 */
export function getFullSchemaDocumentation(
  schema: ZodType,
  title: string,
  description?: string
): {
  doc: SchemaDoc;
  markdown: string;
  typescript: string;
  json: Record<string, unknown>;
} {
  const doc = generateSchemaDoc(schema, title, description);
  const markdown = doc.markdown || generateMarkdown(doc);
  const typescript = generateTypeDefinition(doc);

  return {
    doc,
    markdown,
    typescript,
    json: doc.example || {},
  };
}
