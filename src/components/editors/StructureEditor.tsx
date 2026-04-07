import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/state/store";

export function StructureEditor() {
  const { configData, setConfigData, setDirty, originalContent, currentFile } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<unknown>(null);

  const handleChange = useCallback(
    (updatedContent: { json?: unknown; text?: string }) => {
      if (updatedContent.json !== undefined && updatedContent.json !== null) {
        const data = updatedContent.json as Record<string, unknown>;
        setConfigData(data);
        const serialized = JSON.stringify(data, null, 2);
        setDirty(serialized !== originalContent);
      }
    },
    [setConfigData, setDirty, originalContent]
  );

  useEffect(() => {
    if (!containerRef.current || !configData || !currentFile) return;

    let mounted = true;

    import("vanilla-jsoneditor").then((mod) => {
      if (!mounted || !containerRef.current) return;

      if (editorRef.current) {
        (editorRef.current as { destroy: () => void }).destroy();
      }

      const JSONEditor = mod.JSONEditor as unknown as new (props: {
        target: HTMLElement;
        props: Record<string, unknown>;
      }) => { destroy: () => void; set: (props: Record<string, unknown>) => void };
      const editor = new JSONEditor({
        target: containerRef.current,
        props: {
          content: {
            json: configData,
          },
          onChange: handleChange,
        },
      });

      editorRef.current = editor;
    });

    return () => {
      mounted = false;
      if (editorRef.current) {
        (editorRef.current as { destroy: () => void }).destroy();
        editorRef.current = null;
      }
    };
  }, [currentFile]);

  useEffect(() => {
    if (editorRef.current && configData) {
      const editor = editorRef.current as { set: (props: { content: { json: unknown } }) => void };
      try {
        editor.set({
          content: { json: configData },
        });
      } catch {
        // editor may not be ready
      }
    }
  }, [configData]);

  if (!currentFile) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="neu-card p-6 text-center text-muted-foreground text-sm">
          Open a file to view structure
        </div>
      </div>
    );
  }

  if (!configData) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="neu-card p-6 text-center text-muted-foreground text-sm">
          No data to display
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-3">
      <div
        ref={containerRef}
        className="h-full w-full neu-card overflow-hidden jse-theme-dark"
      />
    </div>
  );
}
