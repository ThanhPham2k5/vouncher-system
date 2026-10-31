import { Ticket } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppHeaderProps {
  brand: string;
  subtitle: string;
  logoutEndpoint: string;
  loginPath: string;
  userLabel?: string;
}

export function AppHeader({ brand, subtitle, logoutEndpoint, loginPath, userLabel }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Ticket className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">{brand}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userLabel && <span className="hidden text-sm text-muted-foreground sm:inline">{userLabel}</span>}
          <ThemeToggle />
          <LogoutButton endpoint={logoutEndpoint} redirectTo={loginPath} />
        </div>
      </div>
    </header>
  );
}
