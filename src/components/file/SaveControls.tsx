import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/lib/state/store";
import { parseContent, serializeJson, supportsStructuredEditing } from "@/lib/parse";
import { validateBasicJson } from "@/lib/validation";
import type { SaveResult } from "@/types";
import { Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SaveControls() {
  const {
    currentFile,
    configData,
    originalContent,
    rawContent,
    dirty,
    isSaving,
    editorMode,
    setIsSaving,
    setLastSaveResult,
    setDirty,
    setOriginalContent,
    setRawContent,
    setConfigData,
    setValidationErrors,
  } = useAppStore();

  async function handleSave() {
    if (!currentFile) return;

    const contentToSave = editorMode === "raw" || !configData
      ? rawContent
      : serializeJson(configData);

    if (currentFile.format === "json") {
      const validation = validateBasicJson(contentToSave);

      if (!validation.valid) {
        setValidationErrors(
          validation.errors.map((e) => ({
            path: e.path,
            message: e.message,
            severity: "error" as const,
          }))
        );
        return;
      }
    }

    if (currentFile.format === "jsonc") {
      const parsed = parseContent(contentToSave, currentFile.format);
      if (parsed.error) {
        setValidationErrors([
          { path: "/", message: parsed.error, severity: "error" },
        ]);
        return;
      }
    }

    setIsSaving(true);
    try {
      const result = await invoke<SaveResult>("save_file", {
        path: currentFile.path,
        content: contentToSave,
      });

      setLastSaveResult(result);
      if (result.success) {
        const parsed = supportsStructuredEditing(currentFile.format)
          ? parseContent(contentToSave, currentFile.format)
          : { data: null, error: null };

        setOriginalContent(contentToSave);
        setRawContent(contentToSave);
        setConfigData(parsed.data);
        setDirty(false);
        if (parsed.error) {
          setValidationErrors([
            { path: "/", message: parsed.error, severity: "error" },
          ]);
        } else {
          setValidationErrors([]);
        }
      }
    } catch (e) {
      setLastSaveResult({
        success: false,
        backup_path: null,
        error: String(e),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleRevert() {
    if (!currentFile) return;

    const parsed = parseContent(originalContent, currentFile.format);

    setRawContent(originalContent);
    setConfigData(parsed.data);
    if (parsed.error) {
      setValidationErrors([
        {
          path: "/",
          message: parsed.error,
          severity: supportsStructuredEditing(currentFile.format) ? "error" : "warning",
        },
      ]);
    } else {
      setValidationErrors([]);
    }
    setDirty(false);
  }

  if (!currentFile) return null;

  return (
    <div className="toolbar-cluster toolbar-cluster-end">
      <button
        onClick={handleRevert}
        disabled={!dirty}
        className={cn(
          "toolbar-button toolbar-button-secondary",
          dirty
            ? ""
            : "toolbar-button-disabled"
        )}
        title="Revert changes"
      >
        <RotateCcw className="w-4 h-4" />
        Revert
      </button>
      <button
        id="save-btn"
        onClick={handleSave}
        disabled={!dirty || isSaving}
        className={cn(
          "toolbar-button toolbar-button-primary",
          dirty && !isSaving
            ? ""
            : "toolbar-button-disabled"
        )}
        title="Save (Cmd+S)"
      >
        <Save className="w-4 h-4" />
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
