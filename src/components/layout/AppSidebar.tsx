import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FilePlus, 
  FileSearch, 
  Settings, 
  History, 
  CheckSquare,
  Users,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quotation/new", label: "New Quotation", icon: FilePlus },
  { href: "/quotations", label: "All Quotations", icon: FileSearch },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/audit-log", label: "Audit Log", icon: History },
];

const adminItems = [
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/insurance", label: "Insurance Companies", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile } = useAuth();

  // Check if user has admin access (either admin role or is_admin flag)
  const isAdmin = profile?.role === "admin" || profile?.is_admin === true;

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground min-h-[calc(100vh-4rem)] p-4">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 pt-4 border-t border-sidebar-border">
        <p className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-2">
          Administration
        </p>
        <nav className="space-y-1">
          {adminItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href);
            
            // Only show admin-specific items to admins
            if ((item.href === "/admin/users" || item.href === "/admin/insurance") && !isAdmin) {
              return null;
            }
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
