import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/state/store";
import { openFileIntoStore, openRecentFileIntoStore } from "@/lib/fileSession";
import { ChevronDown, FolderOpen, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFileName } from "@/lib/parse";
import { startAppViewTransition } from "@/lib/motion/viewTransition";

export function FileOpener() {
  const { dirty, currentFile, recentFiles } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const togglePopover = useCallback((next: boolean) => {
    startAppViewTransition(
      () => setIsOpen(next),
      next ? "overlay-enter" : "overlay-exit"
    );
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) {
        togglePopover(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        togglePopover(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, togglePopover]);

  return (
    <div className="toolbar-cluster toolbar-cluster-start">
      <div className="toolbar-menu-shell" ref={shellRef}>
        <div className="file-opener-actions">
          <button
            id="open-file-btn"
            onClick={openFileIntoStore}
            className="toolbar-button toolbar-button-primary"
            title="Open file (Cmd+O)"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Open File</span>
          </button>
          <button
            type="button"
            onClick={() => togglePopover(!isOpen)}
            className="toolbar-button toolbar-button-secondary toolbar-menu-toggle"
            disabled={recentFiles.length === 0}
            aria-label="Recent files"
            aria-expanded={isOpen}
            aria-haspopup="menu"
            title="Recent files (Cmd+Shift+O)"
          >
            <History className="w-4 h-4" />
            <ChevronDown
              className={cn("w-4 h-4 toolbar-menu-chevron", isOpen && "toolbar-menu-chevron-open")}
            />
          </button>
        </div>

        {isOpen && recentFiles.length > 0 && (
          <div className="toolbar-popover recent-files-popover" role="menu" aria-label="Recent files">
            <div className="toolbar-popover-header">
              <div className="toolbar-popover-title">Recent files</div>
              <div className="toolbar-popover-subtitle">
                Quick re-open: Cmd+Shift+O
              </div>
            </div>
            <div className="toolbar-popover-body">
              <div className="recent-file-list">
                {recentFiles.map((path) => {
                  const isCurrent = currentFile?.path === path;
                  return (
                    <button
                      type="button"
                      key={path}
                      className="recent-file-item"
                      disabled={isCurrent}
                      onClick={async () => {
                        const opened = await openRecentFileIntoStore(path);
                        if (opened) {
                          togglePopover(false);
                        }
                      }}
                    >
                      <span className="recent-file-name">{getFileName(path)}</span>
                      <span className="recent-file-path">{path}</span>
                      {isCurrent && <span className="recent-file-badge">Current</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
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
