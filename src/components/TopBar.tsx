type TopBarProps = {
  theme: "dark" | "light";
  onThemeToggle: (theme: "dark" | "light") => void;
  onHostProfileOpen: (trigger: HTMLButtonElement) => void;
};

export function TopBar({
  theme,
  onThemeToggle,
  onHostProfileOpen
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <button type="button" className="avatar-button brand-avatar-button" onClick={(event) => onHostProfileOpen(event.currentTarget)} aria-label="打开 Claudio 主持人主页">
          <span className="brand-avatar claudio-avatar" aria-hidden="true" />
        </button>
        <h1>Claudio</h1>
      </div>
      <div className="top-actions">
        <div className="theme-toggle" role="group" aria-label="Theme toggle">
          <button
            className={theme === "dark" ? "active" : ""}
            onClick={() => onThemeToggle("dark")}
            type="button"
          >
            DARK
          </button>
          <button
            className={theme === "light" ? "active" : ""}
            onClick={() => onThemeToggle("light")}
            type="button"
          >
            LIGHT
          </button>
        </div>
      </div>
    </header>
  );
}
