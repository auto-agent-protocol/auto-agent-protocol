import Ajv, { type ValidateFunction, type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync, statSync } from "fs";
import { basename, join, sep } from "path";
import { allSchemas } from "@autoagentprotocol/schemas";

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null;
}

interface SchemaEntry {
  schema: Record<string, unknown>;
  name: string;
  isPrimitive: boolean;
}

export class AAPValidator {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(this.ajv);
  }

  /**
   * Load the schemas bundled with @autoagentprotocol/schemas (the latest spec
   * version). Pure data — imported directly, with no filesystem access.
   */
  loadDefaults(): void {
    this.registerSchemas(
      allSchemas.map((schema) => {
        const id = typeof schema.$id === "string" ? schema.$id : "";
        return {
          schema,
          name: basename(id, ".schema.json"),
          isPrimitive: id.includes("/_primitives/"),
        };
      })
    );
  }

  /** Load schemas from a directory of `*.schema.json` files (e.g. a `spec/<version>/schemas` dir). */
  loadSchemas(schemasDir: string): void {
    const primitiveSegment = `${sep}_primitives${sep}`;
    this.registerSchemas(
      this.findSchemaFiles(schemasDir).map((file) => ({
        schema: JSON.parse(readFileSync(file, "utf-8")) as Record<string, unknown>,
        name: basename(file, ".schema.json"),
        isPrimitive: file.includes(primitiveSegment),
      }))
    );
  }

  private registerSchemas(entries: SchemaEntry[]): void {
    // Pre-register every schema so cross-file $refs resolve at compile time.
    for (const { schema } of entries) {
      try {
        this.ajv.addSchema(schema);
      } catch {
        // Duplicate $id — fine; first wins.
      }
    }
    // Compile each top-level schema (primitives are only referenced, not
    // validated directly) and key it by name for validate().
    for (const { schema, name, isPrimitive } of entries) {
      if (isPrimitive) continue;
      this.validators.set(name, this.ajv.compile(schema));
    }
  }

  private findSchemaFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        out.push(...this.findSchemaFiles(full));
      } else if (entry.endsWith(".schema.json")) {
        out.push(full);
      }
    }
    return out;
  }

  validate(schemaName: string, data: unknown): ValidationResult {
    const validate = this.validators.get(schemaName);
    if (!validate) {
      throw new Error(`Schema "${schemaName}" not loaded`);
    }
    const valid = validate(data);
    return { valid: !!valid, errors: validate.errors || null };
  }

  getSchemaNames(): string[] {
    return Array.from(this.validators.keys());
  }
}
