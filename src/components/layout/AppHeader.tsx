import { Bell, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import premiroLogo from "@/assets/premiro-logo.jpg";

const ROLE_LABELS: Record<string, string> = {
  sales: "Account Executive",
  tenaga_pialang: "Tenaga Pialang",
  tenaga_ahli: "Tenaga Ahli",
  admin: "Admin",
};

export function AppHeader() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] || profile.role : "";

  return (
    <header className="page-header h-16 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img 
          src={premiroLogo} 
          alt="Premiro Logo" 
          className="h-10 w-auto object-contain"
        />
        <div>
          <h1 className="text-lg font-heading font-semibold">SME EB Quotation System</h1>
          <p className="text-xs text-primary-foreground/70">Employee Benefits</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10">
          <Bell className="w-5 h-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm">{profile?.full_name || "User"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{profile?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>Help & Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
