import Ajv, { type ValidateFunction, type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "fs";
import { resolve, basename } from "path";

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

  loadSchemas(schemasDir: string): void {
    const files = readdirSync(schemasDir).filter((f) =>
      f.endsWith(".schema.json")
    );
    for (const file of files) {
      const schema = JSON.parse(
        readFileSync(resolve(schemasDir, file), "utf-8")
      );
      const name = basename(file, ".schema.json");
      try {
        const validate = this.ajv.compile(schema);
        this.validators.set(name, validate);
      } catch {
        // Skip schemas that can't compile standalone (cross-refs)
      }
    }
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
