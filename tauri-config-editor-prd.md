# PRD: macOS Tauri Config Studio

**Status:** Draft v1  
**Owner:** Sambit Biswas  
**Target platform:** macOS desktop app  
**Document type:** Product Requirements Document  
**Last updated:** 2026-04-07

---

## 1. Product Summary

Build a **macOS-native Tauri app** for visually editing local configuration files without forcing users to work directly in raw JSON. The app should feel like a polished settings studio: structured forms for common settings, a tree/table JSON inspector for advanced users, and a raw editor for full control.

The initial product is inspired by the UX goal of **OpenCode Studio**: make local config management approachable, safe, and fast. OpenCode Studio explicitly positions itself as a local GUI for managing OpenCode configurations with “no json editing required,” which is the right product direction for this app even if the implementation and branding differ.

### Working name
- **Config Studio**
- **Config Forge**
- **Local Config Studio**

---

## 2. Problem Statement

Most local developer tools and AI toolchains still rely on hand-editing config files. That creates several problems:

- Raw JSON, YAML, or TOML editing is error-prone.
- Secrets, paths, arrays, nested objects, and enums are awkward to manage by hand.
- Small syntax mistakes can break apps or toolchains.
- Users often want guardrails, validation, and previews before saving.
- Existing editors are usually either too generic or too technical.

There is a gap for a **native-feeling macOS config editor** that combines:

- human-friendly forms,
- advanced structured JSON views,
- raw source access,
- safe file operations,
- backup and restore workflows.

---

## 3. Goal

Create a macOS app that lets users:

1. Open a local config file.
2. Edit it visually through a schema-driven UI.
3. Switch to tree/table or raw mode when needed.
4. Validate changes before saving.
5. Save safely with backup and recovery protections.

---

## 4. Non-Goals

These are out of scope for v1 unless they fall out cheaply:

- Real-time multi-user collaboration.
- Cloud sync.
- Full Git integration.
- Plugin marketplace.
- Cross-platform support beyond macOS.
- Editing every arbitrary file format under the sun.
- In-app secret vaulting beyond basic masked fields and secure local handling.

---

## 5. Target Users

### Primary users
- Developers managing local app or tool configs.
- AI/power users managing model, provider, plugin, and profile settings.
- Technical creatives who want guardrails instead of raw text editing.

### Secondary users
- Teams distributing internal tools with editable local config.
- Non-engineer operators who need safe access to limited settings.

---

## 6. Core Use Cases

1. **Open and edit a JSON config file** through a friendly form UI.
2. **Switch to raw editor** for unsupported or advanced keys.
3. **Inspect nested config data** in a tree/table view.
4. **Validate before save** and show field-level errors.
5. **Create a backup automatically** before overwriting.
6. **Compare changed vs original content** before saving.
7. **Restore a previous version** if the new config breaks something.
8. **Manage recent files** for quick reopen.

---

## 7. Product Principles

1. **Safer than a text editor**  
   Saving should reduce the chance of broken config.

2. **Fast for experts**  
   Advanced users should never feel trapped in forms.

3. **Friendly for non-experts**  
   Common settings should feel like editing app preferences, not source code.

4. **Local-first**  
   The app should work entirely on-device with no required backend service.

5. **Transparent**  
   Users should always know which file is open, what changed, and what will be written.

---

## 8. Proposed Solution

A **Tauri v2 macOS desktop app** with three editing modes:

### A. Form Mode
Schema-driven settings UI for the most common and supported config fields.

Examples:
- text fields
- select menus
- toggle switches
- number inputs
- repeatable lists
- masked secret inputs
- path pickers
- segmented or tabbed nested sections

### B. Structured Mode
A JSON tree/table inspector for nested data, batch edits, and structural browsing.

### C. Raw Mode
A Monaco-powered raw editor for power users who want direct source control.

### Save pipeline
- validate current data
- show warnings/errors
- optionally preview diff
- create backup
- write temp file
- atomically replace target file
- surface success or failure state clearly

---

## 9. Recommended Stack

### App shell
- **Tauri v2**
- **Rust** for native commands and safe file operations
- **React + TypeScript + Vite** for UI

### UI layer
- **shadcn/ui + Radix UI** for desktop-quality controls
- **Tailwind CSS** for layout and styling

### Editing layer
- **JSON Forms** for schema-driven forms
- **vanilla-jsoneditor** for structured JSON tree/table editing
- **@monaco-editor/react** for raw source editing

### Validation / parsing
- **AJV** for JSON Schema validation
- **Zod** for app-side validation where needed
- Optional format adapters for:
  - JSON
  - JSONC
  - YAML
  - TOML

### Persistence
- Tauri file access for opening files
- Rust command layer for backup + atomic save
- Optional persisted app state for:
  - recent files
  - last selected mode
  - UI preferences

---

## 10. Why This Stack

### Why Tauri
Tauri v2 is a strong fit because it supports modern frontend stacks while giving the app a native desktop shell and a Rust backend. The official Tauri project creation flow supports multiple frontend templates, including React, and the docs call out that Tauri can work with virtually any frontend framework.

### Why React + TypeScript
This is the easiest way to combine schema-based forms, Monaco, desktop-style component libraries, and flexible state management.

### Why JSON Forms
JSON Forms is the best fit for the primary UX goal: turning known config schemas into real settings UIs rather than forcing users to read nested objects. It also exposes validation results on each data change, which is critical for a config editor.

### Why vanilla-jsoneditor
This gives a second mode between forms and raw text: a structured editor that is still visual but more flexible than a fixed form.

### Why Monaco
Raw editing is still necessary. Monaco provides a familiar source-editing experience and also exposes a diff editor if the product wants save previews later.

### Why Rust save commands instead of frontend-only writes
The last mile of file saving should be handled in Rust so the app can implement:
- backups,
- atomic writes,
- better error messages,
- path safety checks,
- tighter control over permissions.

---

## 11. Functional Requirements

### 11.1 File Open
The app must allow the user to:
- open a file through a macOS file picker,
- drag and drop a file onto the app,
- reopen recent files.

Supported initial file types:
- `.json`
- `.jsonc`
- `.yaml` / `.yml`
- `.toml`

### 11.2 File Detection
The app must:
- detect file type by extension,
- parse into a normalized in-memory representation,
- show a readable error if parsing fails.

### 11.3 Form Editing
The app must support schema-based form editing for supported config shapes.

The app should support:
- nested objects,
- arrays,
- enums,
- booleans,
- required vs optional fields,
- descriptions / help text,
- default values,
- field-level validation.

### 11.4 Structured Editing
The app should provide a tree/table JSON editing experience for advanced inspection and non-schema-first editing.

### 11.5 Raw Editing
The app must provide a raw code editor with:
- syntax highlighting,
- formatting support where possible,
- dirty state tracking,
- read-only error state when parse/serialize fails.

### 11.6 Save Behavior
When the user saves, the app must:
1. validate current data,
2. serialize back to the source format,
3. create a backup of the original file,
4. write to a temp file,
5. replace the original file atomically,
6. show success/failure feedback.

### 11.7 Validation
The app must:
- show validation errors inline in form mode,
- show a summary panel of blocking errors and warnings,
- prevent unsafe save when validation fails,
- allow warning-only save for non-blocking issues if configured.

### 11.8 Diff Preview
The app should provide a pre-save or review diff showing original vs modified content.

### 11.9 Backup / Restore
The app must:
- store at least one prior version before save,
- allow restoring the last backup,
- show backup timestamp and target file path.

### 11.10 Recent Files
The app should maintain a local list of recently opened files.

### 11.11 macOS UX
The app should feel native on macOS:
- standard title bar or tasteful custom chrome,
- drag-and-drop support,
- keyboard shortcuts (`Cmd+O`, `Cmd+S`, `Cmd+Shift+S`, `Cmd+,` if settings exist),
- quick look style file/path clarity,
- undo/redo support where feasible.

---

## 12. Non-Functional Requirements

### Performance
- Open typical config files instantly.
- Keep mode switching responsive.
- Avoid locking the UI during save.

### Reliability
- Never silently corrupt a config file.
- Never overwrite without clear save intent.
- Recover gracefully from parse/validation/save failures.

### Security
- Local-first, no required remote server.
- Restrict file access to user-selected files and approved scopes.
- Avoid broad file system permissions when possible.
- Treat secrets carefully in UI and logs.

### Accessibility
- Keyboard navigable core flows.
- Accessible form labels and descriptions.
- Sufficient contrast in light/dark themes.

---

## 13. Information Architecture

### Sidebar
- Overview
- General
- Profiles
- Providers
- Plugins
- Paths
- Advanced

### Main workspace tabs
- **Form**
- **Structure**
- **Raw**
- **Diff**

### Footer / status area
- file path
- format
- schema status
- validation status
- unsaved changes indicator

---

## 14. UX Requirements

### Primary flow
1. Launch app.
2. Open config file.
3. App parses and detects schema support.
4. User lands in Form mode if schema exists; otherwise Structure or Raw.
5. User edits values.
6. Validation updates live.
7. User reviews diff if desired.
8. User saves.
9. App backs up and writes safely.

### Important interaction details
- If schema is partial, unsupported fields must still be preserved.
- If the file contains comments or ordering semantics, v1 should clearly document any formatting limitations.
- Secret fields should be masked by default with reveal controls.
- Path fields should offer a file/folder picker instead of raw typing only.

---

## 15. Technical Architecture

### Frontend responsibilities
- UI state
- mode switching
- schema rendering
- in-memory config editing
- validation display
- diff preview
- recent file display

### Rust responsibilities
- open/save commands where necessary
- backup creation
- atomic write
- permission-aware file handling
- filesystem/path safety checks
- native macOS integrations if expanded later

### Recommended save strategy
1. receive serialized content and destination path,
2. verify path is allowed,
3. copy original to backup location,
4. write modified content to temp file,
5. fsync if needed,
6. rename temp file over original,
7. return detailed result to frontend.

---

## 16. Tauri-Specific Requirements

### Project setup
Use Tauri v2 with React + TypeScript.

### Capabilities / permissions
The app should use Tauri’s capability system conservatively. Permissions should be limited to the main app window and only the required dialog/file access features.

### File access strategy
Use the file picker and scoped access patterns rather than broad unrestricted file permissions.

### Packaging
Build as a macOS app bundle with a DMG distribution target.

### Signing / notarization
Plan for proper Apple signing and notarization for public distribution.

---

## 17. Risks and Mitigations

### Risk: format loss or comment stripping
**Problem:** YAML/TOML/JSONC round-tripping may lose comments or formatting.

**Mitigation:**
- clearly mark preservation limitations in v1,
- prioritize JSON first if necessary,
- evaluate round-trip-safe parsers later.

### Risk: partial schema support
**Problem:** Some configs may have unsupported or dynamic keys.

**Mitigation:**
- preserve unknown fields,
- provide Raw mode fallback,
- provide Structure mode for unsupported areas.

### Risk: unsafe file permissions
**Problem:** Overly broad file access weakens the trust model.

**Mitigation:**
- rely on user-selected files,
- keep permissions tight,
- prefer Rust-controlled save flows.

### Risk: broken save flow
**Problem:** App crashes or interruptions can corrupt the config.

**Mitigation:**
- backup before write,
- temp file + rename strategy,
- restore UX.

### Risk: public macOS install friction
**Problem:** Unsigned or unnotarized builds are painful for users to open.

**Mitigation:**
- sign and notarize release builds,
- use ad-hoc only for internal testing.

---

## 18. Success Metrics

### Product metrics
- User can open and safely save a supported config in under 2 minutes.
- Fewer syntax-related config breakages compared with raw editing.
- High completion rate for first-run edit flow.

### Technical metrics
- Zero silent file corruption incidents.
- Save success rate > 99% on valid inputs.
- Crash-free session rate > 99.5%.

---

## 19. MVP Scope

### Include in MVP
- macOS app via Tauri
- JSON support first
- open file picker
- schema-driven form mode
- structured JSON mode
- raw editor mode
- validation errors
- backup + atomic save
- recent files
- light and dark theme

### Nice to have in MVP if time allows
- diff preview
- drag and drop file open
- JSONC support
- per-field help text

### Defer
- YAML/TOML full support if round-tripping is messy
- plugin system
- cloud sync
- git history
- templates marketplace

---

## 20. Milestones

### Milestone 1: Technical foundation
- Create Tauri + React + TypeScript app
- Wire dialog-based file open
- Add Rust command plumbing
- Add base layout and state model

### Milestone 2: File lifecycle
- Parse JSON
- Dirty state tracking
- Backup + atomic save
- Error handling

### Milestone 3: Editing surfaces
- Schema-driven Form mode
- Structured JSON mode
- Raw Monaco mode

### Milestone 4: Validation and polish
- Inline validation
- Diff preview
- Recent files
- Keyboard shortcuts
- macOS UX refinement

### Milestone 5: Distribution
- Signing
- Notarization
- DMG build
- release checklist

---

## 21. Open Questions

1. Should v1 support **JSON only**, or JSON + JSONC from day one?
2. Is preserving comments/order a hard requirement?
3. Should this app target **one known config schema first** or be a more generic editor?
4. Do you want **plugin-specific custom panels** later, or keep everything schema-driven?
5. Should backups live beside the original file or in an app-managed backup directory?
6. Do you want a **single-document app** or multiple tabs/windows?
7. Should diff preview be required before every save or optional?

---

## 22. Suggested Initial Repo Setup

```text
config-studio/
  src/
    app/
    components/
      file/
      editors/
      forms/
      layout/
    lib/
      parse/
      schema/
      validation/
      diff/
      state/
    types/
  src-tauri/
    src/
      main.rs
      commands.rs
      fs_ops.rs
      backup.rs
    capabilities/
      default.json
    tauri.conf.json
  package.json
  README.md
```

---

## 23. Recommended v1 Build Order

1. **Open / parse / render JSON**
2. **Dirty state + safe save**
3. **Schema-driven form UI**
4. **Raw Monaco editor**
5. **Structured JSON editor**
6. **Diff + backup restore**
7. **signing + notarization**

This order keeps the app useful early while reducing the risk of spending too much time on polish before the save pipeline is trustworthy.

---

## 24. Decision Summary

### Final recommendation
Build **v1 as a Tauri v2 macOS app using React + TypeScript**, with:
- **JSON Forms** as the main editing experience,
- **vanilla-jsoneditor** as the structured advanced editor,
- **Monaco** as the raw fallback,
- **Rust-native save commands** for backup and atomic write safety.

This gives you the strongest balance of:
- native packaging,
- modern UI speed,
- lower risk during file operations,
- good UX for both casual and expert users.

---

## 25. References

### Primary inspiration
- OpenCode Studio repo: https://github.com/Microck/opencode-studio

### Tauri
- Tauri v2 create project: https://v2.tauri.app/start/create-project/
- Tauri prerequisites: https://v2.tauri.app/start/prerequisites/
- Tauri dialog plugin: https://v2.tauri.app/plugin/dialog/
- Tauri file system plugin: https://v2.tauri.app/plugin/file-system/
- Tauri capabilities: https://v2.tauri.app/security/capabilities/
- Tauri macOS signing: https://v2.tauri.app/distribute/sign/macos/

### UI / editor libraries
- JSON Forms React docs: https://jsonforms.io/docs/integrations/react
- vanilla-jsoneditor / svelte-jsoneditor repo: https://github.com/josdejong/svelte-jsoneditor
- Monaco React wrapper: https://github.com/suren-atoyan/monaco-react

---

## 26. Verified Notes from References

These notes are included so implementation decisions are tied to the current docs and repos:

- Tauri’s official project creation flow supports multiple frontend templates and explicitly supports React-based setups.
- Tauri’s capability system is configured via JSON or TOML files under `src-tauri/capabilities` and is the right place to constrain frontend access.
- Tauri’s file-system plugin includes granular permissions and scoped access controls; dangerous access is not something you should enable casually.
- Tauri’s macOS signing docs note that signing is required to avoid the “application is broken and can not be started” style friction for downloaded apps, and notarization uses either App Store Connect API credentials or Apple ID credentials.
- JSON Forms emits change events that include validation results on each data change, which makes it well-suited to a config editor UX.
- `vanilla-jsoneditor` is the package intended for usage inside React and other non-Svelte frameworks.
- `@monaco-editor/react` exposes both `Editor` and `DiffEditor`, making it a good raw-edit and future diff-preview choice.
- OpenCode Studio’s repo description confirms the product direction: local GUI config management with reduced need for manual JSON editing.

