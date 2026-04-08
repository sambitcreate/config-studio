import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import { loadFileIntoStore } from "@/lib/fileSession";
import { useAppStore } from "@/lib/state/store";
import type { BackupInfo } from "@/types";

const timestampPattern = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/;
const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function parseBackupTimestamp(timestamp: string) {
  const match = timestamp.match(timestampPattern);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

export function formatBackupTimestamp(timestamp: string) {
  const date = parseBackupTimestamp(timestamp);
  if (!date) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatBackupRelativeTime(timestamp: string, now = Date.now()) {
  const backupDate = parseBackupTimestamp(timestamp);
  if (!backupDate) {
    return "unknown";
  }

  const diffMs = backupDate.getTime() - now;
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 45) {
    return "just now";
  }

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["minute", 60],
    ["hour", 60 * 60],
    ["day", 60 * 60 * 24],
  ];

  for (const [unit, secondsPerUnit] of units) {
    if (absSeconds < secondsPerUnit * (unit === "minute" ? 60 : 24)) {
      return relativeTimeFormat.format(
        Math.round(diffSeconds / secondsPerUnit),
        unit
      );
    }
  }

  return formatBackupTimestamp(timestamp);
}

export async function loadBackupsIntoStore(filePath: string) {
  const store = useAppStore.getState();
  store.setIsLoadingBackups(true);

  try {
    const backups = await invoke<BackupInfo[]>("list_backups", {
      targetPath: filePath,
    });
    const normalizedBackups = Array.isArray(backups) ? backups : [];
    store.setBackups(normalizedBackups);
    return normalizedBackups;
  } catch {
    store.setBackups([]);
    return [];
  } finally {
    store.setIsLoadingBackups(false);
  }
}

export async function refreshBackupsForCurrentFile() {
  const { currentFile, setBackups, setIsLoadingBackups } = useAppStore.getState();

  if (!currentFile) {
    setBackups([]);
    setIsLoadingBackups(false);
    return [];
  }

  return loadBackupsIntoStore(currentFile.path);
}

export async function restoreBackupIntoStore(backupPath: string, targetPath: string) {
  const { dirty } = useAppStore.getState();

  const shouldRestore = await confirm(
    dirty
      ? "Restore this backup and discard your unsaved changes?"
      : "Restore this backup and overwrite the current file?",
    {
      title: "Restore backup",
      kind: "warning",
      okLabel: "Restore backup",
      cancelLabel: dirty ? "Keep editing" : "Cancel",
    }
  );

  if (!shouldRestore) {
    return false;
  }

  await invoke("restore_backup", {
    backupPath,
    targetPath,
  });
  await loadFileIntoStore(targetPath);
  await loadBackupsIntoStore(targetPath);
  return true;
}

export async function deleteBackupFromStore(backupPath: string, filePath: string) {
  const shouldDelete = await confirm(
    "Delete this backup permanently?",
    {
      title: "Delete backup",
      kind: "warning",
      okLabel: "Delete backup",
      cancelLabel: "Keep backup",
    }
  );

  if (!shouldDelete) {
    return false;
  }

  await invoke("delete_backup", { backupPath });
  await loadBackupsIntoStore(filePath);
  return true;
}
