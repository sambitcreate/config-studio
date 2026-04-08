import { useAppStore } from "@/lib/state/store";
import { cn } from "@/lib/utils";
import {
  Settings,
  Users,
  Server,
  Puzzle,
  FolderOpen,
  Sliders,
  Eye,
} from "lucide-react";

const sections = [
  { id: "overview", label: "Overview", icon: Eye, tone: "peach" },
  { id: "general", label: "General", icon: Settings, tone: "mint" },
  { id: "profiles", label: "Profiles", icon: Users, tone: "blue" },
  { id: "providers", label: "Providers", icon: Server, tone: "peach" },
  { id: "plugins", label: "Plugins", icon: Puzzle, tone: "mint" },
  { id: "paths", label: "Paths", icon: FolderOpen, tone: "blue" },
  { id: "advanced", label: "Advanced", icon: Sliders, tone: "peach" },
];

export function Sidebar() {
  const { currentFile, activeSection, setActiveSection } = useAppStore();

  return (
    <aside className="sidebar-shell">
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          Sections
        </h2>
        <p className="sidebar-subtitle">Navigate the config surface</p>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-list">
          {sections.map(({ id, label, icon: Icon, tone }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "sidebar-item",
                `sidebar-item-${tone}`,
                activeSection === id
                  ? "sidebar-item-active"
                  : "sidebar-item-idle"
              )}
              disabled={!currentFile}
            >
              <span className="sidebar-item-leading">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </span>
              <span className="sidebar-item-circle" />
            </button>
          ))}
        </div>
      </nav>
      {currentFile && (
        <div className="sidebar-footer">
          <p className="sidebar-footer-label">Current file</p>
          <p className="sidebar-footer-path" title={currentFile.path}>{currentFile.path}</p>
        </div>
      )}
    </aside>
  );
}
