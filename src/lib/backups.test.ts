import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/lib/state/store";
import {
  deleteBackupFromStore,
  formatBackupRelativeTime,
  loadBackupsIntoStore,
  refreshBackupsForCurrentFile,
  restoreBackupIntoStore,
} from "./backups";

const { mockInvoke, mockConfirm } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockConfirm: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  confirm: mockConfirm,
  open: vi.fn(),
}));

function resetStore(overrides: Partial<ReturnType<typeof useAppStore.getState>> = {}) {
  useAppStore.setState({
    currentFile: {
      path: "/tmp/config.json",
      content: '{"name":"current"}',
      format: "json",
      fileName: "config.json",
    },
    originalContent: '{"name":"current"}',
    rawContent: '{"name":"current"}',
    configData: { name: "current" },
    configRootKind: "object",
    dirty: false,
    editorMode: "form",
    validationErrors: [],
    recentFiles: [],
    backups: [],
    isLoadingBackups: false,
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    ...overrides,
  });
}

describe("backups helpers", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockConfirm.mockReset();
    resetStore();
  });

  it("formats recent backups in relative time", () => {
    const now = new Date(2026, 3, 8, 10, 0, 0).getTime();

    expect(formatBackupRelativeTime("20260408_095800", now)).toBe("2 minutes ago");
  });

  it("loads file-scoped backups into the store", async () => {
    mockInvoke.mockResolvedValue([
      {
        path: "/tmp/backups/config.json_20260408_095800.bak",
        timestamp: "20260408_095800",
        original_path: "/tmp/config.json",
      },
    ]);

    const backups = await loadBackupsIntoStore("/tmp/config.json");

    expect(mockInvoke).toHaveBeenCalledWith("list_backups", {
      targetPath: "/tmp/config.json",
    });
    expect(backups).toHaveLength(1);
    expect(useAppStore.getState().backups[0]?.timestamp).toBe("20260408_095800");
  });

  it("restores a backup and reloads the current file", async () => {
    mockConfirm.mockResolvedValue(true);
    mockInvoke
      .mockResolvedValueOnce({ success: true, backup_path: null, error: null })
      .mockResolvedValueOnce({
        path: "/tmp/config.json",
        content: '{"name":"restored"}',
        format: "json",
      })
      .mockResolvedValueOnce([]);

    const restored = await restoreBackupIntoStore(
      "/tmp/backups/config.json_20260408_095800.bak",
      "/tmp/config.json"
    );

    expect(restored).toBe(true);
    expect(mockConfirm).toHaveBeenCalledWith(
      "Restore this backup and overwrite the current file?",
      expect.objectContaining({
        title: "Restore backup",
        kind: "warning",
      })
    );
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "restore_backup", {
      backupPath: "/tmp/backups/config.json_20260408_095800.bak",
      targetPath: "/tmp/config.json",
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "open_file", { path: "/tmp/config.json" });
    expect(mockInvoke).toHaveBeenNthCalledWith(3, "list_backups", {
      targetPath: "/tmp/config.json",
    });
  });

  it("deletes a backup and refreshes the list when confirmed", async () => {
    mockConfirm.mockResolvedValue(true);
    mockInvoke.mockResolvedValueOnce(true).mockResolvedValueOnce([]);

    const deleted = await deleteBackupFromStore(
      "/tmp/backups/config.json_20260408_095800.bak",
      "/tmp/config.json"
    );

    expect(deleted).toBe(true);
    expect(mockConfirm).toHaveBeenCalledWith(
      "Delete this backup permanently?",
      expect.objectContaining({
        title: "Delete backup",
        kind: "warning",
      })
    );
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "delete_backup", {
      backupPath: "/tmp/backups/config.json_20260408_095800.bak",
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "list_backups", {
      targetPath: "/tmp/config.json",
    });
  });

  it("formatBackupRelativeTime returns 'just now' for recent timestamps", () => {
    const now = Date.now();
    const ts = new Date(now - 30000);
    const formatted = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(ts.getDate()).padStart(2, "0")}_${String(ts.getHours()).padStart(2, "0")}${String(ts.getMinutes()).padStart(2, "0")}${String(ts.getSeconds()).padStart(2, "0")}`;
    expect(formatBackupRelativeTime(formatted, now)).toBe("just now");
  });

  it("formatBackupRelativeTime returns 'unknown' for invalid timestamps", () => {
    expect(formatBackupRelativeTime("invalid", Date.now())).toBe("unknown");
  });

  it("loadBackupsIntoStore sets empty on error", async () => {
    mockInvoke.mockRejectedValue(new Error("network error"));

    const result = await loadBackupsIntoStore("/tmp/config.json");

    expect(result).toEqual([]);
    expect(useAppStore.getState().backups).toEqual([]);
    expect(useAppStore.getState().isLoadingBackups).toBe(false);
  });

  it("restoreBackupIntoStore returns false when cancelled", async () => {
    mockConfirm.mockResolvedValue(false);

    const result = await restoreBackupIntoStore("/tmp/backup.bak", "/tmp/config.json");

    expect(result).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("deleteBackupFromStore returns false when cancelled", async () => {
    mockConfirm.mockResolvedValue(false);

    const result = await deleteBackupFromStore("/tmp/backup.bak", "/tmp/config.json");

    expect(result).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("refreshBackupsForCurrentFile clears backups when no file open", async () => {
    useAppStore.setState({ currentFile: null, backups: [{ path: "/b", timestamp: "20260101_000000", original_path: "/t" }] });

    const { refreshBackupsForCurrentFile } = await import("./backups");
    const result = await refreshBackupsForCurrentFile();

    expect(result).toEqual([]);
    expect(useAppStore.getState().backups).toEqual([]);
  });
});
