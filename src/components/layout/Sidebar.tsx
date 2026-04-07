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
  { id: "overview", label: "Overview", icon: Eye },
  { id: "general", label: "General", icon: Settings },
  { id: "profiles", label: "Profiles", icon: Users },
  { id: "providers", label: "Providers", icon: Server },
  { id: "plugins", label: "Plugins", icon: Puzzle },
  { id: "paths", label: "Paths", icon: FolderOpen },
  { id: "advanced", label: "Advanced", icon: Sliders },
];

export function Sidebar() {
  const { currentFile, activeSection, setActiveSection } = useAppStore();

  return (
    <div className="w-52 bg-sidebar flex flex-col h-full border-r border-border">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Sections
        </h2>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="space-y-0.5">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] transition-colors text-left",
                activeSection === id
                  ? "bg-accent text-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
              disabled={!currentFile}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </nav>
      {currentFile && (
        <div className="px-4 py-2.5 border-t border-border">
          <p className="text-[11px] text-muted-foreground truncate" title={currentFile.path}>
            {currentFile.path}
          </p>
        </div>
      )}
    </div>
  );
}
