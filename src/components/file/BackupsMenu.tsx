import { useCallback, useEffect, useRef, useState } from "react";
import { ArchiveRestore, ChevronDown, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/state/store";
import { cn } from "@/lib/utils";
import { startAppViewTransition } from "@/lib/motion/viewTransition";
import {
  deleteBackupFromStore,
  formatBackupRelativeTime,
  formatBackupTimestamp,
  restoreBackupIntoStore,
} from "@/lib/backups";

export function BackupsMenu() {
  const currentFile = useAppStore((state) => state.currentFile);
  const backups = useAppStore((state) => state.backups);
  const isLoadingBackups = useAppStore((state) => state.isLoadingBackups);
  const [isOpen, setIsOpen] = useState(false);
  const [activeBackupPath, setActiveBackupPath] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"restore" | "delete" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const shellRef = useRef<HTMLDivElement | null>(null);

  const latestBackup = backups[0];

  const togglePopover = useCallback((next: boolean) => {
    startAppViewTransition(
      () => setIsOpen(next),
      next ? "overlay-enter" : "overlay-exit"
    );
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => window.clearInterval(intervalId);
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

  useEffect(() => {
    setActionError(null);
  }, [currentFile?.path, isOpen]);

  if (!currentFile) {
    return null;
  }

  const currentFilePath = currentFile.path;
  const currentFileName = currentFile.fileName;

  async function handleRestore(backupPath: string) {
    setActionError(null);
    setActiveBackupPath(backupPath);
    setActiveAction("restore");

    try {
      const restored = await restoreBackupIntoStore(backupPath, currentFilePath);
      if (restored) {
        togglePopover(false);
      }
    } catch (error) {
      setActionError(String(error));
    } finally {
      setActiveBackupPath(null);
      setActiveAction(null);
    }
  }

  async function handleDelete(backupPath: string) {
    setActionError(null);
    setActiveBackupPath(backupPath);
    setActiveAction("delete");

    try {
      await deleteBackupFromStore(backupPath, currentFilePath);
    } catch (error) {
      setActionError(String(error));
    } finally {
      setActiveBackupPath(null);
      setActiveAction(null);
    }
  }

  return (
    <div className="toolbar-cluster backup-cluster" ref={shellRef}>
      <div
        className="status-pill backup-status-pill"
        title={latestBackup ? formatBackupTimestamp(latestBackup.timestamp) : "No backups yet"}
      >
        <ArchiveRestore className="w-4 h-4" />
        <span>
          Last backup:{" "}
          {latestBackup ? formatBackupRelativeTime(latestBackup.timestamp, now) : "none"}
        </span>
      </div>

      <div className="toolbar-menu-shell">
        <button
          type="button"
          className="toolbar-button toolbar-button-secondary toolbar-menu-button"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          onClick={() => togglePopover(!isOpen)}
          title="Show backups"
        >
          <ArchiveRestore className="w-4 h-4" />
          <span>Backups</span>
          <ChevronDown className={cn("w-4 h-4 toolbar-menu-chevron", isOpen && "toolbar-menu-chevron-open")} />
        </button>

        {isOpen && (
          <div className="toolbar-popover backups-popover" role="menu" aria-label="Backups">
            <div className="toolbar-popover-header">
              <div className="toolbar-popover-title">Backups for {currentFileName}</div>
              <div className="toolbar-popover-subtitle">
                Restore a saved snapshot or clear backups you no longer need.
              </div>
            </div>

            <div className="toolbar-popover-body">
              {isLoadingBackups ? (
                <div className="toolbar-popover-empty">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Loading backups…</span>
                </div>
              ) : backups.length === 0 ? (
                <div className="toolbar-popover-empty">No backups yet for this file.</div>
              ) : (
                <div className="backup-list">
                  {backups.map((backup) => {
                    const isPending = activeBackupPath === backup.path;
                    return (
                      <div className="backup-list-item" key={backup.path}>
                        <div className="backup-list-copy">
                          <div className="backup-list-title">
                            {formatBackupTimestamp(backup.timestamp)}
                          </div>
                          <div className="backup-list-meta">
                            {formatBackupRelativeTime(backup.timestamp, now)}
                          </div>
                        </div>
                        <div className="backup-list-actions">
                          <button
                            type="button"
                            className="backup-action-button"
                            disabled={isPending}
                            onClick={() => handleRestore(backup.path)}
                          >
                            <RotateCcw className="w-4 h-4" />
                            {isPending && activeAction === "restore" ? "Restoring…" : "Restore"}
                          </button>
                          <button
                            type="button"
                            className="backup-action-button backup-action-button-danger"
                            disabled={isPending}
                            onClick={() => handleDelete(backup.path)}
                          >
                            <Trash2 className="w-4 h-4" />
                            {isPending && activeAction === "delete" ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {actionError && <div className="toolbar-popover-error">{actionError}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
