import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, LineChart, Bell, Settings, Boxes, Leaf, Wifi, WifiOff } from "lucide-react";
import clsx from "clsx";
import { ThemeToggle } from "./ThemeToggle";
import { useSocketStatus } from "../../providers/SocketProvider";

const NAV_ITEMS = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/history", label: "History", icon: LineChart },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
  { to: "/app/devices", label: "Bins", icon: Boxes },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function LiveIndicator() {
  const status = useSocketStatus();
  const isOpen = status === "open";
  return (
    <span
      className={clsx(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        isOpen ? "bg-eco-100 text-eco-700 dark:bg-eco-950 dark:text-eco-300" : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"
      )}
    >
      {isOpen ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {isOpen ? "Live" : "Reconnecting…"}
    </span>
  );
}

export function AppShell() {
  return (
    <div className="min-h-dvh bg-ink-50 dark:bg-ink-950">
      <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/80 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-ink-50">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-eco-600 text-white">
              <Leaf className="h-4 w-4" />
            </span>
            EkoGuard
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-eco-50 text-eco-700 dark:bg-eco-950/60 dark:text-eco-300"
                      : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                  )
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LiveIndicator />
            <ThemeToggle />
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto border-t border-ink-200/70 px-4 py-2 md:hidden dark:border-ink-800">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
                  isActive ? "bg-eco-50 text-eco-700 dark:bg-eco-950/60 dark:text-eco-300" : "text-ink-600 dark:text-ink-300"
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
