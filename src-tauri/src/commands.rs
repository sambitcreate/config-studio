use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tauri::command;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMetadata {
    pub last_modified: Option<String>,
    pub readonly: bool,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileInfo {
    pub path: String,
    pub content: String,
    pub format: String,
    pub last_modified: Option<String>,
    pub readonly: bool,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileStatus {
    pub path: String,
    pub format: String,
    pub exists: bool,
    pub changed: bool,
    pub last_modified: Option<String>,
    pub readonly: bool,
    pub size: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaveResult {
    pub success: bool,
    pub backup_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupInfo {
    pub path: String,
    pub timestamp: String,
    pub original_path: String,
}

fn detect_format(path: &str) -> String {
    let lower = path.to_lowercase();
    if lower.ends_with(".jsonc") {
        "jsonc".to_string()
    } else if lower.ends_with(".json") {
        "json".to_string()
    } else if lower.ends_with(".yaml") || lower.ends_with(".yml") {
        "yaml".to_string()
    } else if lower.ends_with(".toml") {
        "toml".to_string()
    } else {
        "json".to_string()
    }
}

fn get_backup_dir(app_data_dir: &Path) -> PathBuf {
    let backup_dir = app_data_dir.join("backups");
    let _ = fs::create_dir_all(&backup_dir);
    backup_dir
}

fn format_system_time(time: SystemTime) -> String {
    chrono::DateTime::<chrono::Utc>::from(time).to_rfc3339()
}

fn read_file_metadata(path: &Path) -> Result<FileMetadata, String> {
    let metadata =
        fs::metadata(path).map_err(|e| format!("Failed to read file metadata: {}", e))?;
    Ok(FileMetadata {
        last_modified: metadata.modified().ok().map(format_system_time),
        readonly: metadata.permissions().readonly(),
        size: metadata.len(),
    })
}

fn file_exists(path: &Path) -> bool {
    path.exists()
}

fn prepare_target_dir(target_path: &Path) -> Result<(), String> {
    if let Some(parent) = target_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create target directory: {}", e))?;
        }
    }
    Ok(())
}

fn backup_existing_file(
    app_data_dir: &Path,
    original_path: &Path,
) -> Result<Option<String>, String> {
    if !original_path.exists() {
        return Ok(None);
    }

    let backup_dir = get_backup_dir(app_data_dir);
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();

    let file_name = original_path
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy()
        .to_string();

    let backup_file_name = format!("{}_{}.bak", file_name, timestamp);
    let backup_path = backup_dir.join(&backup_file_name);

    let original_content = fs::read_to_string(original_path)
        .map_err(|e| format!("Failed to read original file: {}", e))?;

    fs::write(&backup_path, &original_content)
        .map_err(|e| format!("Failed to create backup: {}", e))?;

    Ok(Some(backup_path.to_string_lossy().to_string()))
}

fn save_file_with_backup(
    app_data_dir: &Path,
    target_path: &Path,
    content: &str,
) -> Result<SaveResult, String> {
    if !target_path.exists() {
        prepare_target_dir(target_path)?;
        fs::write(target_path, content).map_err(|e| format!("Failed to write file: {}", e))?;
        return Ok(SaveResult {
            success: true,
            backup_path: None,
            error: None,
        });
    }

    let backup_path = backup_existing_file(app_data_dir, target_path)?;
    let temp_path = target_path.with_extension("tmp");
    fs::write(&temp_path, content).map_err(|e| format!("Failed to write temp file: {}", e))?;

    if target_path.exists() {
        fs::remove_file(target_path)
            .map_err(|e| format!("Failed to remove original file: {}", e))?;
    }

    fs::rename(&temp_path, target_path)
        .map_err(|e| format!("Failed to replace original file: {}", e))?;

    Ok(SaveResult {
        success: true,
        backup_path,
        error: None,
    })
}

fn read_status_for_path(
    path: &Path,
    baseline_last_modified: Option<&str>,
    baseline_size: Option<u64>,
) -> Result<FileStatus, String> {
    let exists = file_exists(path);
    let format = detect_format(&path.to_string_lossy());

    if !exists {
        return Ok(FileStatus {
            path: path.to_string_lossy().to_string(),
            format,
            exists: false,
            changed: baseline_last_modified.is_some() || baseline_size.is_some(),
            last_modified: None,
            readonly: false,
            size: None,
        });
    }

    let metadata = read_file_metadata(path)?;
    let last_modified_changed = baseline_last_modified
        .map(|snapshot| metadata.last_modified.as_deref() != Some(snapshot))
        .unwrap_or(false);
    let size_changed = baseline_size
        .map(|snapshot| snapshot != metadata.size)
        .unwrap_or(false);
    let changed = last_modified_changed || size_changed;

    Ok(FileStatus {
        path: path.to_string_lossy().to_string(),
        format,
        exists: true,
        changed,
        last_modified: metadata.last_modified,
        readonly: metadata.readonly,
        size: Some(metadata.size),
    })
}

fn list_backups_in_dir(backup_dir: &Path) -> Result<Vec<BackupInfo>, String> {
    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let mut backups: Vec<BackupInfo> = Vec::new();
    let entries =
        fs::read_dir(backup_dir).map_err(|e| format!("Failed to read backup dir: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.ends_with(".bak") {
                let stem = name.trim_end_matches(".bak");
                let parts: Vec<_> = stem.split('_').collect();
                let timestamp = if parts.len() >= 2 {
                    format!("{}_{}", parts[parts.len() - 2], parts[parts.len() - 1])
                } else {
                    stem.to_string()
                };

                backups.push(BackupInfo {
                    path: path.to_string_lossy().to_string(),
                    timestamp,
                    original_path: String::new(),
                });
            }
        }
    }

    backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(backups)
}

#[command]
pub fn open_file(path: String) -> Result<FileInfo, String> {
    let file_path = Path::new(&path);
    let content =
        fs::read_to_string(file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    let format = detect_format(&path);
    let metadata = read_file_metadata(file_path)?;
    Ok(FileInfo {
        path,
        content,
        format,
        last_modified: metadata.last_modified,
        readonly: metadata.readonly,
        size: metadata.size,
    })
}

#[command]
pub fn save_file(
    app: tauri::AppHandle,
    path: String,
    content: String,
) -> Result<SaveResult, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    save_file_with_backup(&app_data_dir, Path::new(&path), &content)
}

#[command]
pub fn save_file_as(
    app: tauri::AppHandle,
    _source_path: String,
    target_path: String,
    content: String,
) -> Result<SaveResult, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    save_file_with_backup(&app_data_dir, Path::new(&target_path), &content)
}

#[command]
pub fn get_file_status(
    path: String,
    last_modified: Option<String>,
    size: Option<u64>,
) -> Result<FileStatus, String> {
    read_status_for_path(Path::new(&path), last_modified.as_deref(), size)
}

#[command]
pub fn list_backups(app: tauri::AppHandle) -> Result<Vec<BackupInfo>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let backup_dir = get_backup_dir(&app_data_dir);
    list_backups_in_dir(&backup_dir)
}

#[command]
pub fn restore_backup(backup_path: String, target_path: String) -> Result<SaveResult, String> {
    let backup = Path::new(&backup_path);
    let target = Path::new(&target_path);

    if !backup.exists() {
        return Err("Backup file does not exist".to_string());
    }

    let content =
        fs::read_to_string(backup).map_err(|e| format!("Failed to read backup: {}", e))?;

    fs::write(target, &content).map_err(|e| format!("Failed to restore backup: {}", e))?;

    Ok(SaveResult {
        success: true,
        backup_path: None,
        error: None,
    })
}

#[command]
pub fn validate_json(content: String) -> Result<bool, String> {
    serde_json::from_str::<serde_json::Value>(&content)
        .map(|_| true)
        .map_err(|e| format!("Invalid JSON: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_path(label: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("config-studio-tests-{}-{}", label, unique))
    }

    #[test]
    fn detect_format_matches_supported_extensions() {
        assert_eq!(detect_format("/tmp/file.JSON"), "json");
        assert_eq!(detect_format("/tmp/file.jsonc"), "jsonc");
        assert_eq!(detect_format("/tmp/file.yml"), "yaml");
        assert_eq!(detect_format("/tmp/file.toml"), "toml");
        assert_eq!(detect_format("/tmp/file.conf"), "json");
    }

    #[test]
    fn open_file_reads_content_and_detects_format() {
        let dir = temp_path("open-file");
        fs::create_dir_all(&dir).expect("create test dir");
        let file_path = dir.join("config.jsonc");
        fs::write(&file_path, "{\n  \"name\": \"OpenCode\"\n}").expect("write config file");

        let result = open_file(file_path.to_string_lossy().to_string()).expect("open file");

        assert_eq!(result.format, "jsonc");
        assert!(result.content.contains("OpenCode"));
        assert_eq!(result.readonly, false);
        assert!(result.size > 0);
        assert!(result.last_modified.is_some());

        fs::remove_dir_all(&dir).expect("remove test dir");
    }

    #[test]
    fn save_file_with_backup_replaces_original_and_keeps_backup() {
        let app_data_dir = temp_path("save-app-data");
        let working_dir = temp_path("save-workdir");
        fs::create_dir_all(&app_data_dir).expect("create app data dir");
        fs::create_dir_all(&working_dir).expect("create working dir");

        let file_path = working_dir.join("settings.json");
        fs::write(&file_path, "{\"name\":\"before\"}").expect("write original file");

        let path_string = file_path.to_string_lossy().to_string();
        let result = save_file_with_backup(
            &app_data_dir,
            Path::new(&path_string),
            "{\"name\":\"after\"}",
        )
        .expect("save file with backup");

        let backup_path = PathBuf::from(result.backup_path.expect("backup path present"));

        assert!(result.success);
        assert_eq!(
            fs::read_to_string(&file_path).expect("read updated file"),
            "{\"name\":\"after\"}"
        );
        assert_eq!(
            fs::read_to_string(&backup_path).expect("read backup"),
            "{\"name\":\"before\"}"
        );

        fs::remove_dir_all(&app_data_dir).expect("remove app data dir");
        fs::remove_dir_all(&working_dir).expect("remove working dir");
    }

    #[test]
    fn save_file_as_writes_target_and_preserves_existing_backup() {
        let app_data_dir = temp_path("save-as-app-data");
        let target_dir = temp_path("save-as-target");
        fs::create_dir_all(&app_data_dir).expect("create app data dir");
        fs::create_dir_all(&target_dir).expect("create target dir");

        let target_path = target_dir.join("export.json");
        fs::write(&target_path, "{\"name\":\"before\"}").expect("write original target");

        let result = save_file_with_backup(&app_data_dir, &target_path, "{\"name\":\"after\"}")
            .expect("save as target");

        let backup_path = PathBuf::from(result.backup_path.expect("backup path present"));

        assert!(result.success);
        assert_eq!(
            fs::read_to_string(&target_path).expect("read updated target"),
            "{\"name\":\"after\"}"
        );
        assert_eq!(
            fs::read_to_string(&backup_path).expect("read backup"),
            "{\"name\":\"before\"}"
        );

        fs::remove_dir_all(&app_data_dir).expect("remove app data dir");
        fs::remove_dir_all(&target_dir).expect("remove target dir");
    }

    #[test]
    fn get_file_status_reports_current_metadata_and_detects_change() {
        let dir = temp_path("file-status");
        fs::create_dir_all(&dir).expect("create test dir");
        let file_path = dir.join("config.json");
        fs::write(&file_path, "{\"name\":\"before\"}").expect("write config file");

        let initial = get_file_status(file_path.to_string_lossy().to_string(), None, None)
            .expect("get initial status");

        assert!(initial.exists);
        assert!(!initial.changed);
        assert_eq!(initial.format, "json");
        assert!(initial.last_modified.is_some());
        assert_eq!(initial.readonly, false);
        assert!(initial.size.is_some());

        fs::write(&file_path, "{\"name\":\"after\",\"enabled\":true}").expect("update config file");

        let changed = get_file_status(
            file_path.to_string_lossy().to_string(),
            initial.last_modified.clone(),
            initial.size,
        )
        .expect("get changed status");

        assert!(changed.exists);
        assert!(changed.changed);
        assert!(changed.size.is_some());

        fs::remove_dir_all(&dir).expect("remove test dir");
    }

    #[test]
    fn get_file_status_marks_missing_file_as_absent() {
        let dir = temp_path("missing-status");
        fs::create_dir_all(&dir).expect("create test dir");
        let file_path = dir.join("missing.json");

        let status = get_file_status(
            file_path.to_string_lossy().to_string(),
            Some("2024-01-01T00:00:00Z".to_string()),
            Some(12),
        )
        .expect("get missing status");

        assert!(!status.exists);
        assert!(status.changed);
        assert_eq!(status.size, None);

        fs::remove_dir_all(&dir).expect("remove test dir");
    }

    #[test]
    fn get_file_status_reports_readonly_files() {
        let dir = temp_path("readonly-status");
        fs::create_dir_all(&dir).expect("create test dir");
        let file_path = dir.join("config.json");
        fs::write(&file_path, "{\"name\":\"readonly\"}").expect("write config file");

        let mut permissions = fs::metadata(&file_path)
            .expect("read metadata")
            .permissions();
        permissions.set_readonly(true);
        fs::set_permissions(&file_path, permissions).expect("set readonly permissions");

        let status = get_file_status(file_path.to_string_lossy().to_string(), None, None)
            .expect("get readonly status");

        assert!(status.exists);
        assert!(status.readonly);

        fs::remove_dir_all(&dir).expect("remove test dir");
    }

    #[test]
    fn list_backups_in_dir_returns_newest_first() {
        let backup_dir = temp_path("list-backups");
        fs::create_dir_all(&backup_dir).expect("create backup dir");
        fs::write(backup_dir.join("settings.json_20240101_010101.bak"), "one")
            .expect("write old backup");
        fs::write(backup_dir.join("settings.json_20240201_010101.bak"), "two")
            .expect("write new backup");
        fs::write(backup_dir.join("ignore.txt"), "three").expect("write ignored file");

        let backups = list_backups_in_dir(&backup_dir).expect("list backups");

        assert_eq!(backups.len(), 2);
        assert_eq!(backups[0].timestamp, "20240201_010101");
        assert_eq!(backups[1].timestamp, "20240101_010101");

        fs::remove_dir_all(&backup_dir).expect("remove backup dir");
    }

    #[test]
    fn restore_backup_overwrites_target_file() {
        let dir = temp_path("restore-backup");
        fs::create_dir_all(&dir).expect("create restore dir");

        let backup_path = dir.join("settings.json_20240101_010101.bak");
        let target_path = dir.join("settings.json");
        fs::write(&backup_path, "{\"name\":\"from-backup\"}").expect("write backup file");
        fs::write(&target_path, "{\"name\":\"current\"}").expect("write target file");

        let result = restore_backup(
            backup_path.to_string_lossy().to_string(),
            target_path.to_string_lossy().to_string(),
        )
        .expect("restore backup");

        assert!(result.success);
        assert_eq!(
            fs::read_to_string(&target_path).expect("read restored target"),
            "{\"name\":\"from-backup\"}"
        );

        fs::remove_dir_all(&dir).expect("remove restore dir");
    }

    #[test]
    fn validate_json_accepts_valid_input_and_rejects_invalid_input() {
        assert!(validate_json("{\"name\":\"OpenCode\"}".to_string()).expect("valid json"));
        assert!(validate_json("{\"name\":".to_string()).is_err());
    }
}
