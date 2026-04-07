import { invoke } from "@tauri-apps/api/core";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import type { OpenFile } from "@/types";
import { useAppStore } from "@/lib/state/store";
import { detectFormat, getFileName, parseContent } from "@/lib/parse";
import { FolderOpen } from "lucide-react";

export function FileOpener() {
  const {
    setCurrentFile,
    setOriginalContent,
    setConfigData,
    setDirty,
    setEditorMode,
    setValidationErrors,
    dirty,
    currentFile,
  } = useAppStore();

  async function handleOpenFile() {
    const selected = await dialogOpen({
      multiple: false,
      filters: [
        {
          name: "Config Files",
          extensions: ["json", "jsonc", "yaml", "yml", "toml"],
        },
      ],
    });

    if (!selected) return;

    const filePath = selected as string;

    try {
      const result = await invoke<OpenFile>("open_file", { path: filePath });
      const format = detectFormat(filePath);
      const parsed = parseContent(result.content, format);

      if (parsed.error) {
        setValidationErrors([
          { path: "/", message: parsed.error, severity: "error" },
        ]);
        setConfigData(null);
      } else {
        setConfigData(parsed.data);
        setValidationErrors([]);
      }

      setCurrentFile({
        path: filePath,
        content: result.content,
        format,
        fileName: getFileName(filePath),
      });
      setOriginalContent(result.content);
      setDirty(false);
      setEditorMode(parsed.data ? "form" : "raw");
    } catch (e) {
      setValidationErrors([
        { path: "/", message: String(e), severity: "error" },
      ]);
    }
  }

  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={handleOpenFile}
        className="neu-raised flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground cursor-pointer"
        title="Open file (Cmd+O)"
      >
        <FolderOpen className="w-4 h-4 text-primary" />
        Open
      </button>
      {currentFile && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground font-medium max-w-[200px] truncate" title={currentFile.path}>
            {currentFile.fileName}
          </span>
          {dirty && (
            <span className="w-2 h-2 rounded-full bg-warning" title="Unsaved changes" />
          )}
        </div>
      )}
    </div>
  );
}
