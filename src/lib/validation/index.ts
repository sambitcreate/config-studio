import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
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
    return {
      valid: false,
      errors: [
        {
          path: "/",
          message: (e as Error).message,
        },
      ],
    };
  }
}
