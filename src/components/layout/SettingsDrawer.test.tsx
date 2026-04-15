import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultPreferences } from "@/lib/preferences";
import { useAppStore } from "@/lib/state/store";
import { SettingsDrawer } from "./SettingsDrawer";

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
    recentFiles: [],
    isSaving: false,
    lastSaveResult: null,
    activeSection: "",
    preferences: createDefaultPreferences(),
  });
}

describe("SettingsDrawer", () => {
  beforeEach(() => {
    resetStore();
  });

  it("updates theme, editor, and backup preferences from the drawer controls", async () => {
    render(<SettingsDrawer open onClose={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Dark" }));
    fireEvent.change(screen.getByLabelText("Font size"), {
      target: { value: "16", valueAsNumber: 16 },
    });
    await user.click(screen.getByRole("button", { name: "Age" }));
    fireEvent.change(screen.getByLabelText("Delete backups older than this many days"), {
      target: { value: "14", valueAsNumber: 14 },
    });

    expect(useAppStore.getState().preferences).toMatchObject({
      themePreference: "dark",
      editor: {
        fontSize: 16,
      },
      backupRetention: {
        mode: "age",
        value: 14,
      },
    });
  });

  it("renders nothing when open is false", () => {
    const { container } = render(<SettingsDrawer open={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(<SettingsDrawer open onClose={onClose} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Close settings" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<SettingsDrawer open onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
