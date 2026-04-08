import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/lib/state/store";
import {
  deleteBackupFromStore,
  formatBackupRelativeTime,
  loadBackupsIntoStore,
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
});
