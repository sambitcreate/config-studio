import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultPreferences } from "@/lib/preferences";
import { useAppStore } from "./store";

function resetStore() {
  useAppStore.setState({
    currentFile: null,
    originalContent: "",
    rawContent: "",
    configData: null,
    configRootKind: null,
    dirty: false,
    editorMode: "form",
    validationErrors: [],
    validationPanelOpen: false,
    validationFocusRequest: null,
    recentFiles: [],
    backups: [],
    isLoadingBackups: false,
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    preferences: createDefaultPreferences(),
    shortcutOverlayOpen: false,
    settingsOpen: false,
    editorActions: {},
    jsoncCommentWarningAcceptedFor: null,
  });
}

describe("useAppStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("deduplicates and promotes recently opened files", () => {
    const store = useAppStore.getState();

    store.setCurrentFile({
      path: "/tmp/first.json",
      content: "{}",
      format: "json",
      fileName: "first.json",
    });

    store.setCurrentFile({
      path: "/tmp/second.json",
      content: "{}",
      format: "json",
      fileName: "second.json",
    });

    store.setCurrentFile({
      path: "/tmp/first.json",
      content: "{}",
      format: "json",
      fileName: "first.json",
    });

    expect(useAppStore.getState().recentFiles).toEqual([
      "/tmp/first.json",
      "/tmp/second.json",
    ]);
  });

  it("caps recent files at ten entries", () => {
    const store = useAppStore.getState();

    for (let index = 0; index < 12; index++) {
      store.addRecentFile(`/tmp/file-${index}.json`);
    }

    expect(useAppStore.getState().recentFiles).toHaveLength(10);
    expect(useAppStore.getState().recentFiles[0]).toBe("/tmp/file-11.json");
    expect(useAppStore.getState().recentFiles[9]).toBe("/tmp/file-2.json");
  });

  it("resets file-specific state without clearing recents", () => {
    useAppStore.setState({
      currentFile: {
        path: "/tmp/config.json",
        content: "{}",
        format: "json",
        fileName: "config.json",
      },
      originalContent: "{}",
      rawContent: '{"name":"edited"}',
      configData: { name: "edited" },
      configRootKind: "object",
      dirty: true,
      validationErrors: [{ path: "/", message: "bad", severity: "error" }],
      validationPanelOpen: true,
      validationFocusRequest: {
        error: { path: "/", message: "bad", severity: "error" },
        sequence: 1,
      },
      recentFiles: ["/tmp/config.json"],
      backups: [{ path: "/tmp/backup", timestamp: "20260101_000000", original_path: "/tmp/config.json" }],
      lastSaveResult: { success: true, backup_path: "/tmp/backup", error: null },
      preferences: createDefaultPreferences(),
    });

    useAppStore.getState().resetFile();

    expect(useAppStore.getState()).toMatchObject({
      currentFile: null,
      originalContent: "",
      rawContent: "",
      configData: null,
      configRootKind: null,
      dirty: false,
      validationErrors: [],
      backups: [],
      validationPanelOpen: false,
      validationFocusRequest: null,
      lastSaveResult: null,
      recentFiles: ["/tmp/config.json"],
    });
  });

  it("updates preferences without disturbing file state", () => {
    const store = useAppStore.getState();

    store.updateEditorPreferences({ fontSize: 16, tabSize: 4 });
    store.setThemePreference("dark");
    store.setDefaultOpenMode("diff");

    expect(useAppStore.getState()).toMatchObject({
      currentFile: null,
      preferences: {
        themePreference: "dark",
        defaultOpenMode: "diff",
        editor: {
          fontSize: 16,
          tabSize: 4,
        },
      },
    });
  });

  it("setRawContent clears jsoncCommentWarningAcceptedFor when content changes", () => {
    useAppStore.setState({ jsoncCommentWarningAcceptedFor: "old content" });
    useAppStore.getState().setRawContent("new content");
    expect(useAppStore.getState().jsoncCommentWarningAcceptedFor).toBeNull();
  });

  it("setRawContent preserves jsoncCommentWarningAcceptedFor when content matches", () => {
    useAppStore.setState({ jsoncCommentWarningAcceptedFor: "same content" });
    useAppStore.getState().setRawContent("same content");
    expect(useAppStore.getState().jsoncCommentWarningAcceptedFor).toBe("same content");
  });

  it("setValidationErrors auto-closes panel when errors are empty", () => {
    useAppStore.setState({ validationPanelOpen: true });
    useAppStore.getState().setValidationErrors([]);
    expect(useAppStore.getState().validationPanelOpen).toBe(false);
  });

  it("setValidationErrors keeps panel open when errors are non-empty", () => {
    useAppStore.setState({ validationPanelOpen: true });
    useAppStore.getState().setValidationErrors([{ path: "/", message: "bad", severity: "error" }]);
    expect(useAppStore.getState().validationPanelOpen).toBe(true);
  });

  it("requestValidationFocus increments sequence", () => {
    const error = { path: "/name", message: "required", severity: "error" as const };
    useAppStore.getState().requestValidationFocus(error);
    expect(useAppStore.getState().validationFocusRequest?.sequence).toBe(1);
    useAppStore.getState().requestValidationFocus(error);
    expect(useAppStore.getState().validationFocusRequest?.sequence).toBe(2);
  });

  it("setBackupRetention normalizes through preferences helper", () => {
    useAppStore.getState().setBackupRetention({ mode: "count", value: 5 });
    expect(useAppStore.getState().preferences.backupRetention).toEqual({ mode: "count", value: 5 });
  });

  it("updateFormatDefaults normalizes json format preferences", () => {
    useAppStore.getState().updateFormatDefaults("json", { indentSize: 4, sortKeys: true });
    expect(useAppStore.getState().preferences.formatDefaults.json).toEqual({ indentSize: 4, sortKeys: true });
  });

  it("resetFile preserves preferences and recentFiles", () => {
    useAppStore.setState({
      recentFiles: ["/tmp/a.json", "/tmp/b.json"],
      preferences: createDefaultPreferences(),
    });
    useAppStore.getState().setThemePreference("dark");
    const prefs = useAppStore.getState().preferences;
    useAppStore.getState().resetFile();
    expect(useAppStore.getState().recentFiles).toEqual(["/tmp/a.json", "/tmp/b.json"]);
    expect(useAppStore.getState().preferences).toEqual(prefs);
  });
});
