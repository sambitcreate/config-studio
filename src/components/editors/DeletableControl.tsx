import {
  isBooleanControl,
  isIntegerControl,
  isNumberControl,
  isStringControl,
  or,
  rankWith,
  type ControlProps,
  type JsonSchema,
} from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { Unwrapped } from "@jsonforms/material-renderers";
import { IconButton, Tooltip } from "@mui/material";
import { Trash2 } from "lucide-react";
import { useCallback } from "react";
import { useAppStore } from "@/lib/state/store";

const {
  MaterialTextControl,
  MaterialBooleanControl,
  MaterialIntegerControl,
  MaterialNumberControl,
} = Unwrapped;

type SchemaType = JsonSchema["type"];

function pickMaterialControl(type: SchemaType) {
  if (type === "boolean") return MaterialBooleanControl;
  if (type === "integer") return MaterialIntegerControl;
  if (type === "number") return MaterialNumberControl;
  return MaterialTextControl;
}

/**
 * Remove the key at `path` from `root` and return a new root object.
 * `path` is a JSON-Forms dot-joined data path (e.g. "provider.google.models.context").
 * Returns null if the path can't be resolved.
 */
function removeAtPath(
  root: Record<string, unknown>,
  path: string
): Record<string, unknown> | null {
  const segments = path.split(".");
  if (segments.length === 0) return null;
  const key = segments.pop() as string;

  const next = structuredClone(root);
  let cursor: unknown = next;
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== "object") return null;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  if (cursor === null || typeof cursor !== "object" || Array.isArray(cursor)) {
    return null;
  }
  const parent = cursor as Record<string, unknown>;
  if (!(key in parent)) return null;
  delete parent[key];
  return next;
}

function DeletableControlInner(props: ControlProps) {
  const { path, schema, visible } = props;
  const configData = useAppStore((state) => state.configData);
  const setConfigData = useAppStore((state) => state.setConfigData);
  const setRawContent = useAppStore((state) => state.setRawContent);
  const setDirty = useAppStore((state) => state.setDirty);
  const originalContent = useAppStore((state) => state.originalContent);

  const handleDelete = useCallback(() => {
    if (!configData || !path) return;
    const next = removeAtPath(configData, path);
    if (!next) return;
    setConfigData(next);
    const serialized = JSON.stringify(next, null, 2);
    setRawContent(serialized);
    setDirty(serialized !== originalContent);
  }, [configData, originalContent, path, setConfigData, setDirty, setRawContent]);

  if (visible === false) return null;

  const InnerControl = pickMaterialControl(schema?.type);
  const lastSegment = path?.split(".").pop() ?? "field";

  return (
    <div className="deletable-field-row" data-form-path={path || undefined}>
      <div className="deletable-field-main">
        <InnerControl {...props} />
      </div>
      <Tooltip title={`Remove "${lastSegment}"`} placement="left">
        <IconButton
          aria-label={`Remove ${lastSegment}`}
          size="small"
          onClick={handleDelete}
          className="deletable-field-remove"
        >
          <Trash2 size={16} />
        </IconButton>
      </Tooltip>
    </div>
  );
}

export const DeletableControl = withJsonFormsControlProps(DeletableControlInner);

export const deletableControlTester = rankWith(
  10,
  or(isStringControl, isNumberControl, isIntegerControl, isBooleanControl)
);

export const deletableControlRenderer = {
  tester: deletableControlTester,
  renderer: DeletableControl,
};
