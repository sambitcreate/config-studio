import Ajv from "ajv";
import { createValidationError } from "./utils";

const ajv = new Ajv({ allErrors: true, strict: false });

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    line?: number;
    column?: number;
  }>;
}

export function validateAgainstSchema(
  data: Record<string, unknown>,
  schema: Record<string, unknown>
): ValidationResult {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors:
      validate.errors?.map((err) => ({
        path: err.instancePath || "/",
        message: err.message || "Validation error",
      })) || [],
  };
}

export function validateBasicJson(content: string): ValidationResult {
  try {
    JSON.parse(content);
    return { valid: true, errors: [] };
  } catch (e) {
    const error = createValidationError("/", (e as Error).message, "error", content);
    return {
      valid: false,
      errors: [error],
    };
  }
}
