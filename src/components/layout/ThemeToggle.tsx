import { Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "../../providers/ThemeProvider";

const CYCLE = ["light", "dark", "system"] as const;
const ICON = { light: Sun, dark: Moon, system: SunMoon };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = ICON[theme];

  return (
    <button
      onClick={() => setTheme(CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length])}
      aria-label={`Theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
