import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/lib/state/store";
import { createDefaultPreferences } from "@/lib/preferences";
import { StructureEditor } from "./StructureEditor";

const { mockEditorInstance } = vi.hoisted(() => {
  const instance = { destroy: vi.fn(), set: vi.fn() };
  return { mockEditorInstance: instance };
});

vi.mock("vanilla-jsoneditor", () => ({
  JSONEditor: class {
    constructor({ props }: any) {
      (window as any).__jsonEditorProps = props;
      return mockEditorInstance;
    }
  },
}));

function resetStore(overrides: Record<string, unknown> = {}) {
  useAppStore.setState({
    currentFile: { path: "/tmp/config.json", content: '{"name":"test"}', format: "json", fileName: "config.json" },
    originalContent: '{"name":"test"}',
    rawContent: '{"name":"test"}',
    configData: { name: "test" },
    configRootKind: "object",
    dirty: false,
    editorMode: "structure",
    validationErrors: [],
    recentFiles: [],
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    preferences: createDefaultPreferences(),
    ...overrides,
  });
}

describe("StructureEditor", () => {
  beforeEach(() => {
    resetStore();
    delete (window as any).__jsonEditorProps;
    mockEditorInstance.destroy.mockClear();
  });

  it("shows open file prompt when no currentFile", () => {
    resetStore({ currentFile: null });
    render(<StructureEditor />);
    expect(screen.getByText("Open a file to view structure")).toBeInTheDocument();
  });

  it("shows no data prompt when no configData", () => {
    resetStore({ configData: null });
    render(<StructureEditor />);
    expect(screen.getByText("No data to display")).toBeInTheDocument();
  });

  it("initializes the editor when file and data exist", async () => {
    render(<StructureEditor />);
    await waitFor(() => {
      expect((window as any).__jsonEditorProps).toBeDefined();
    });
    expect((window as any).__jsonEditorProps.content.json).toEqual({ name: "test" });
  });

  it("destroys editor on unmount", async () => {
    const { unmount } = render(<StructureEditor />);
    await waitFor(() => {
      expect((window as any).__jsonEditorProps).toBeDefined();
    });
    mockEditorInstance.destroy.mockClear();
    unmount();
    expect(mockEditorInstance.destroy).toHaveBeenCalled();
  });

  it("passes configData._root to editor for array root", async () => {
    resetStore({
      configData: { _root: [1, 2, 3] },
      configRootKind: "array",
    });
    render(<StructureEditor />);
    await waitFor(() => {
      expect((window as any).__jsonEditorProps).toBeDefined();
    });
    expect((window as any).__jsonEditorProps.content.json).toEqual([1, 2, 3]);
  });

  it("handleChange unwraps array root and sets store state", async () => {
    resetStore({
      configData: { _root: [1, 2, 3] },
      configRootKind: "array",
    });
    render(<StructureEditor />);
    await waitFor(() => {
      expect((window as any).__jsonEditorProps).toBeDefined();
    });
    const onChange = (window as any).__jsonEditorProps.onChange;
    onChange({ json: [4, 5, 6] });
    expect(useAppStore.getState().configData).toEqual({ _root: [4, 5, 6] });
    expect(useAppStore.getState().configRootKind).toBe("array");
  });
});
