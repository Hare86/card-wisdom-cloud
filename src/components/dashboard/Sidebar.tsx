import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  LayoutDashboard,
  Upload,
  BarChart3,
  Receipt,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Upload, label: "Upload", href: "/upload" },
  { icon: Receipt, label: "Transactions", href: "/transactions" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-xl">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg gradient-text">RewardIQ</h1>
            <p className="text-xs text-sidebar-foreground/60">Intelligence Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              location.pathname === item.href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div className="px-4 pb-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-5 h-5" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="w-5 h-5" />
              Dark Mode
            </>
          )}
        </Button>
      </div>

      {/* User */}
      {user && (
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <span className="text-sm font-medium text-primary">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
