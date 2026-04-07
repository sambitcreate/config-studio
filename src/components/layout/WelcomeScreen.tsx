import { useAppStore } from "@/lib/state/store";
import { FileUp, FolderOpen } from "lucide-react";

export function WelcomeScreen() {
  useAppStore();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="neu-card p-8 flex flex-col items-center gap-5 max-w-sm w-full">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <FolderOpen className="w-7 h-7 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-1.5">
            Config Studio
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A visual editor for local configuration files. Open a JSON, JSONC,
            YAML, or TOML config file to get started.
          </p>
        </div>

        <div className="w-full space-y-2.5">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "o", metaKey: true }))}
            className="neu-raised w-full py-2.5 px-4 text-sm font-medium text-foreground flex items-center justify-center gap-2 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-primary" />
            Open Config File
          </button>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <kbd className="px-1.5 py-0.5 text-[11px] bg-background rounded border border-border font-mono">
            Cmd+O
          </kbd>
          <span className="text-[11px]">keyboard shortcut</span>
        </div>
      </div>

      <div className="flex gap-3 text-sm text-muted-foreground">
        <div className="neu-card px-4 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
            <FileUp className="w-3.5 h-3.5 text-foreground" />
          </div>
          <span className="text-xs">Drag & drop</span>
        </div>
        <div className="neu-card px-4 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
            <FolderOpen className="w-3.5 h-3.5 text-foreground" />
          </div>
          <span className="text-xs">File picker</span>
        </div>
      </div>
    </div>
  );
}
