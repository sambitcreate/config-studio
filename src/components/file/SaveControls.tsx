import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/lib/state/store";
import { serializeJson } from "@/lib/parse";
import { validateBasicJson } from "@/lib/validation";
import type { SaveResult } from "@/types";
import { Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SaveControls() {
  const {
    currentFile,
    configData,
    originalContent,
    dirty,
    isSaving,
    setIsSaving,
    setLastSaveResult,
    setDirty,
    setOriginalContent,
    setValidationErrors,
  } = useAppStore();

  async function handleSave() {
    if (!currentFile || !configData) return;

    const serialized = serializeJson(configData);
    const validation = validateBasicJson(serialized);

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

    setIsSaving(true);
    try {
      const result = await invoke<SaveResult>("save_file", {
        path: currentFile.path,
        content: serialized,
      });

      setLastSaveResult(result);
      if (result.success) {
        setOriginalContent(serialized);
        setDirty(false);
        setValidationErrors([]);
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
    if (!originalContent) return;
    const parsed = JSON.parse(originalContent);
    useAppStore.getState().setConfigData(parsed);
    setDirty(false);
  }

  if (!currentFile) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleRevert}
        disabled={!dirty}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
          dirty
            ? "hover:bg-accent text-foreground cursor-pointer"
            : "text-muted-foreground/50 cursor-not-allowed"
        )}
        title="Revert changes"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Revert
      </button>
      <button
        onClick={handleSave}
        disabled={!dirty || isSaving}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
          dirty && !isSaving
            ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            : "bg-muted text-muted-foreground/50 cursor-not-allowed"
        )}
        title="Save (Cmd+S)"
      >
        <Save className="w-3.5 h-3.5" />
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
