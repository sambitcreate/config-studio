import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/lib/state/store";
import { openRecentFileIntoStore, reopenMostRecentFileIntoStore } from "./fileSession";

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
      path: "/tmp/current.json",
      content: '{"name":"current"}',
      format: "json",
      fileName: "current.json",
    },
    originalContent: '{"name":"current"}',
    rawContent: '{"name":"edited"}',
    configData: { name: "edited" },
    configRootKind: "object",
    dirty: false,
    editorMode: "form",
    validationErrors: [],
    recentFiles: ["/tmp/current.json", "/tmp/recent.json"],
    backups: [],
    isLoadingBackups: false,
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    ...overrides,
  });
}

describe("fileSession recent files helpers", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockConfirm.mockReset();
    resetStore();
  });

  it("reopens the newest recent file that is not already open", async () => {
    mockInvoke.mockResolvedValue({
      path: "/tmp/recent.json",
      content: '{"name":"recent"}',
      format: "json",
    });

    const reopened = await reopenMostRecentFileIntoStore();

    expect(reopened).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith("open_file", { path: "/tmp/recent.json" });
    expect(useAppStore.getState().currentFile?.path).toBe("/tmp/recent.json");
  });

  it("confirms before opening a recent file when there are unsaved changes", async () => {
    mockConfirm.mockResolvedValue(false);
    resetStore({ dirty: true });

    const reopened = await openRecentFileIntoStore("/tmp/recent.json");

    expect(reopened).toBe(false);
    expect(mockConfirm).toHaveBeenCalledWith(
      "You have unsaved changes. Discard them and open another file?",
      expect.objectContaining({
        title: "Unsaved changes",
        kind: "warning",
      })
    );
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
