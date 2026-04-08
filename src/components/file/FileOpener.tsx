import { useAppStore } from "@/lib/state/store";
import { openFileIntoStore } from "@/lib/fileSession";
import { FolderOpen } from "lucide-react";

export function FileOpener() {
  const { dirty, currentFile } = useAppStore();

  return (
    <div className="toolbar-cluster toolbar-cluster-start">
      <button
        id="open-file-btn"
        onClick={openFileIntoStore}
        className="toolbar-button toolbar-button-primary"
        title="Open file (Cmd+O)"
      >
        <FolderOpen className="w-4 h-4" />
        <span>Open File</span>
      </button>
      {currentFile && (
        <div className="file-chip" title={currentFile.path}>
          <span className="file-chip-name">
            {currentFile.fileName}
          </span>
          {dirty && (
            <span className="file-chip-dot" title="Unsaved changes" />
          )}
        </div>
      )}
    </div>
  );
}
