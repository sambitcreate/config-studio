import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useAppStore } from "@/lib/state/store";
import { cn } from "@/lib/utils";

interface SaveFeedbackNotice {
  tone: "success" | "error";
  title: string;
  detail: string;
}

export function SaveFeedbackToast() {
  const currentFile = useAppStore((state) => state.currentFile);
  const lastSaveResult = useAppStore((state) => state.lastSaveResult);
  const [notice, setNotice] = useState<SaveFeedbackNotice | null>(null);

  useEffect(() => {
    if (!lastSaveResult) {
      setNotice(null);
      return;
    }

    if (lastSaveResult.success) {
      setNotice({
        tone: "success",
        title: currentFile ? `Saved ${currentFile.fileName}` : "Saved",
        detail: lastSaveResult.backup_path
          ? `Backup created at ${lastSaveResult.backup_path}`
          : "Changes were written to disk.",
      });
      return;
    }

    setNotice({
      tone: "error",
      title: currentFile ? `Couldn’t save ${currentFile.fileName}` : "Couldn’t save file",
      detail: lastSaveResult.error ?? "The file could not be saved.",
    });
  }, [lastSaveResult]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => setNotice(null),
      notice.tone === "error" ? 12000 : 7000
    );

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  if (!notice) {
    return null;
  }

  return (
    <div className="save-feedback-layer" aria-live="polite">
      <div
        className={cn(
          "save-feedback-toast",
          notice.tone === "error" ? "save-feedback-toast-error" : "save-feedback-toast-success"
        )}
        role={notice.tone === "error" ? "alert" : "status"}
      >
        <div className="save-feedback-icon-shell">
          {notice.tone === "error" ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </div>
        <div className="save-feedback-copy">
          <div className="save-feedback-title">{notice.title}</div>
          <div className="save-feedback-detail">{notice.detail}</div>
        </div>
        <button
          type="button"
          className="save-feedback-dismiss"
          aria-label="Dismiss save feedback"
          onClick={() => setNotice(null)}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
