import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/lib/state/store";
import { StatusBar } from "./StatusBar";

function resetStore(overrides: Partial<ReturnType<typeof useAppStore.getState>> = {}) {
  useAppStore.setState({
    currentFile: {
      path: "/tmp/config.json",
      content: "{}",
      format: "json",
      fileName: "config.json",
    },
    originalContent: "{}",
    rawContent: ['{', '  "provider": {', '    "name": "demo"', "  }", "}"].join("\n"),
    configData: {
      provider: {
        name: "demo",
      },
      featureFlags: {},
    },
    configRootKind: "object",
    dirty: false,
    editorMode: "form",
    validationErrors: [],
    validationPanelOpen: false,
    validationFocusRequest: null,
    recentFiles: [],
    isSaving: false,
    lastSaveResult: null,
    activeSection: "featureFlags",
    ...overrides,
  });
}

describe("StatusBar", () => {
  beforeEach(() => {
    resetStore();
  });

  it("expands the validation panel and routes focus requests to the active form section", async () => {
    resetStore({
      validationErrors: [
        {
          path: "/provider/name",
          message: "must be number",
          severity: "error",
        },
      ],
    });

    render(<StatusBar />);

    const toggle = screen.getByRole("button", { name: /1 error/i });
    await userEvent.setup().click(toggle);

    expect(screen.getByRole("region", { name: "Validation issues" })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: /provider\.name/i }));

    expect(useAppStore.getState().validationPanelOpen).toBe(true);
    expect(useAppStore.getState().activeSection).toBe("provider");
    expect(useAppStore.getState().validationFocusRequest?.error.path).toBe("/provider/name");
  });

  it("renders the format pill showing the uppercase format", () => {
    render(<StatusBar />);
    expect(screen.getByText("JSON")).toBeInTheDocument();
  });

  it("renders empty state when no file is open", () => {
    resetStore({ currentFile: null });
    render(<StatusBar />);
    expect(screen.getByText(/No file open/)).toBeInTheDocument();
    expect(screen.getByText("Cmd+O")).toBeInTheDocument();
  });

  it("collapses validation panel when toggle clicked twice", async () => {
    resetStore({
      validationErrors: [
        { path: "/name", message: "required", severity: "error" },
      ],
    });
    render(<StatusBar />);
    const toggle = screen.getByRole("button", { name: /1 error/i });
    await userEvent.setup().click(toggle);
    expect(screen.getByRole("region", { name: "Validation issues" })).toBeInTheDocument();
    await userEvent.setup().click(toggle);
    expect(screen.queryByRole("region", { name: "Validation issues" })).not.toBeInTheDocument();
  });
});
