import type { ValidationError } from "@/types";

type MarkerRange = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

type JsonFormsError = {
  instancePath?: string;
  message?: string;
};

function decodeJsonPointer(path: string): string[] {
  if (!path || path === "/") {
    return [];
  }

  return path
    .split("/")
    .slice(1)
    .map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function escapeForJsonString(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function isNumericSegment(segment: string): boolean {
  return /^\d+$/.test(segment);
}

function getOffsetFromLineColumn(content: string, line: number, column: number): number {
  const lines = content.split(/\r?\n/);
  let offset = 0;

  for (let index = 0; index < line - 1; index++) {
    offset += (lines[index]?.length ?? 0) + 1;
  }

  return offset + Math.max(column - 1, 0);
}

export function formatValidationPath(path: string): string {
  const segments = decodeJsonPointer(path).filter((segment) => segment !== "_root");

  if (segments.length === 0) {
    return "Root";
  }

  return segments.reduce((formatted, segment) => {
    if (isNumericSegment(segment)) {
      return `${formatted}[${segment}]`;
    }

    return formatted ? `${formatted}.${segment}` : segment;
  }, "");
}

export function getTopLevelValidationSection(path: string): string | null {
  const [firstSegment] = decodeJsonPointer(path).filter((segment) => segment !== "_root");
  return firstSegment && !isNumericSegment(firstSegment) ? firstSegment : null;
}

export function toJsonFormsPath(path: string): string | null {
  const segments = decodeJsonPointer(path);
  return segments.length > 0 ? segments.join(".") : null;
}

export function createValidationError(
  path: string,
  message: string,
  severity: ValidationError["severity"],
  content?: string
): ValidationError {
  const explicitLocation = extractLocationFromMessage(message, content);

  return {
    path,
    message,
    severity,
    line: explicitLocation?.line,
    column: explicitLocation?.column,
  };
}

export function mapJsonFormsErrors(errors: JsonFormsError[] | undefined): ValidationError[] {
  if (!errors?.length) {
    return [];
  }

  return errors.map((error) => ({
    path: error.instancePath || "/",
    message: error.message || "Validation error",
    severity: "error" as const,
  }));
}

export function getValidationMarkerRange(content: string, error: ValidationError): MarkerRange {
  const explicitLine = error.line;
  const explicitColumn = error.column;

  if (explicitLine && explicitColumn) {
    return rangeFromOffset(content, getOffsetFromLineColumn(content, explicitLine, explicitColumn), 1);
  }

  const locationFromMessage = extractLocationFromMessage(error.message, content);
  if (locationFromMessage?.offset !== undefined) {
    return rangeFromOffset(content, locationFromMessage.offset, 1);
  }

  const pathMatch = findPathOffset(content, error.path);
  if (pathMatch) {
    return rangeFromOffset(content, pathMatch.offset, pathMatch.length);
  }

  return rangeFromOffset(content, 0, 1);
}

function extractLocationFromMessage(contentMessage: string, content?: string) {
  const lineColumnMatch = contentMessage.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColumnMatch) {
    const line = Number(lineColumnMatch[1]);
    const column = Number(lineColumnMatch[2]);
    return {
      line,
      column,
      offset: content ? getOffsetFromLineColumn(content, line, column) : undefined,
    };
  }

  const positionMatch = contentMessage.match(/at position (\d+)/i);
  if (positionMatch) {
    const offset = Number(positionMatch[1]);
    const range = content ? rangeFromOffset(content, offset, 1) : null;
    return {
      line: range?.startLineNumber,
      column: range?.startColumn,
      offset,
    };
  }

  return null;
}

function findPathOffset(content: string, path: string) {
  const segments = decodeJsonPointer(path).filter((segment) => segment !== "_root");
  let searchStart = 0;
  let bestMatch: { offset: number; length: number } | null = null;

  for (const segment of segments) {
    if (isNumericSegment(segment)) {
      continue;
    }

    const needle = `"${escapeForJsonString(segment)}"`;
    const matchOffset = content.indexOf(needle, searchStart);
    if (matchOffset === -1) {
      break;
    }

    bestMatch = { offset: matchOffset, length: needle.length };
    searchStart = matchOffset + needle.length;
  }

  return bestMatch;
}

function rangeFromOffset(content: string, offset: number, length: number): MarkerRange {
  const clampedOffset = Math.max(0, Math.min(offset, content.length));
  const before = content.slice(0, clampedOffset);
  const lineParts = before.split(/\r?\n/);
  const startLineNumber = Math.max(lineParts.length, 1);
  const lastLinePart = lineParts[lineParts.length - 1] ?? "";
  const startColumn = lastLinePart.length + 1;
  const after = content.slice(clampedOffset);
  const lineLength = after.split(/\r?\n/, 1)[0]?.length ?? 0;
  const safeLength = Math.max(1, Math.min(length, Math.max(lineLength, 1)));

  return {
    startLineNumber,
    startColumn,
    endLineNumber: startLineNumber,
    endColumn: startColumn + safeLength,
  };
}
