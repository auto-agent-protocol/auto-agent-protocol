import Ajv, { type ValidateFunction, type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync, statSync } from "fs";
import { dirname, resolve, basename, join, sep } from "path";

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null;
}

export class AAPValidator {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(this.ajv);
  }

  /**
   * Load the schemas bundled with @autoagentprotocol/schemas. Works in Node
   * runtimes that can resolve the peer package; throws if it cannot. Browsers
   * and edge runtimes should use `loadSchemas(dir)` with their own path.
   */
  loadDefaults(): void {
    // Resolve the schemas package's main entry (dist/index.js) and walk down to
    // its latest version directory. The version is read from the package's own
    // `LATEST` export (single source of truth) rather than hardcoded, so this
    // tracks the current spec as new versions ship.
    const mainEntry = require.resolve("@autoagentprotocol/schemas");
    const pkg = require("@autoagentprotocol/schemas") as { LATEST?: string };
    const latest = typeof pkg.LATEST === "string" ? pkg.LATEST : "v1.0";
    const dir = resolve(dirname(mainEntry), latest);
    this.loadSchemas(dir);
  }

  loadSchemas(schemasDir: string): void {
    const schemaFiles = this.findSchemaFiles(schemasDir);

    // Pre-register all schemas so cross-file $refs resolve at compile time.
    const loaded: Array<{ file: string; name: string; schema: any }> = [];
    for (const file of schemaFiles) {
      const schema = JSON.parse(readFileSync(file, "utf-8"));
      const name = basename(file, ".schema.json");
      try {
        this.ajv.addSchema(schema);
      } catch {
        // Duplicate $id — fine; first wins.
      }
      loaded.push({ file, name, schema });
    }

    // Compile each top-level schema. Skip primitives (under _primitives/) since
    // they're only referenced, not validated directly.
    const primitiveSegment = `${sep}_primitives${sep}`;
    for (const { file, name, schema } of loaded) {
      if (file.includes(primitiveSegment)) continue;
      const validate = this.ajv.compile(schema);
      this.validators.set(name, validate);
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
