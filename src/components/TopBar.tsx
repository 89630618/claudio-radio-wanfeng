import { Loader2 } from "lucide-react";
import type { KuGouLibrarySyncStatus, KuGouLoginAccount, KuGouLoginStatus } from "../types";

type TopBarProps = {
  theme: "dark" | "light";
  onThemeToggle: (theme: "dark" | "light") => void;
  kugouMobile: string;
  kugouCode: string;
  kugouAccounts: KuGouLoginAccount[];
  selectedKuGouUserId: string;
  kugouLoginStatus: KuGouLoginStatus | null;
  kugouLibraryStatus: KuGouLibrarySyncStatus | null;
  isKuGouAuthBusy: boolean;
  isImportingPlaylist: boolean;
  onKuGouMobileChange: (value: string) => void;
  onKuGouCodeChange: (value: string) => void;
  onKuGouUserSelect: (userid: string) => void;
  onKuGouCaptchaSend: () => void;
  onKuGouLogin: () => void;
  onKuGouLogout: () => void;
  onHostProfileOpen: (trigger: HTMLButtonElement) => void;
  showLogin?: boolean;
};

export function TopBar({
  theme,
  onThemeToggle,
  kugouMobile,
  kugouCode,
  kugouAccounts,
  selectedKuGouUserId,
  kugouLoginStatus,
  kugouLibraryStatus,
  isKuGouAuthBusy,
  isImportingPlaylist,
  onKuGouMobileChange,
  onKuGouCodeChange,
  onKuGouUserSelect,
  onKuGouCaptchaSend,
  onKuGouLogin,
  onKuGouLogout,
  onHostProfileOpen,
  showLogin = true
}: TopBarProps) {
  const isLoggedIn = kugouLoginStatus?.loggedIn === true;
  const needsLogin = kugouLoginStatus?.needsLogin === true || !isLoggedIn;

  return (
    <header className="topbar">
      <div className="brand-block">
        <button type="button" className="avatar-button brand-avatar-button" onClick={(event) => onHostProfileOpen(event.currentTarget)} aria-label="打开 Claudio 主持人主页">
          <span className="brand-avatar claudio-avatar" aria-hidden="true" />
        </button>
        <h1>Claudio</h1>
      </div>
      <div className="top-actions">
        {showLogin && <div className="login-menu">
          <button className={`login-button ${isLoggedIn ? "logged-in" : ""}`} type="button">
            {isLoggedIn ? "KUGOU" : "LOGIN"}
          </button>
          <div className="login-popover">
            <small className="kugou-session">
              {isLoggedIn
                ? `KuGou logged in: ${kugouLoginStatus.userid}`
                : kugouLoginStatus?.reason === "status_unavailable"
                  ? "KuGou status is temporarily unavailable"
                  : "KuGou login required for private playlists"}
            </small>
            {isLoggedIn && (
              <>
                <small className="kugou-session">
                  {isImportingPlaylist
                    ? "Syncing KuGou library..."
                    : kugouLibraryStatus?.syncedAt
                      ? `Synced ${kugouLibraryStatus.playlistCount} playlists / ${kugouLibraryStatus.trackCount} songs`
                      : "Library sync will start after login"}
                </small>
                <button type="button" className="kugou-logout" onClick={onKuGouLogout} disabled={isKuGouAuthBusy}>
                  Log out
                </button>
              </>
            )}
            {needsLogin && (
              <div className="kugou-login">
                <input
                  value={kugouMobile}
                  onChange={(event) => onKuGouMobileChange(event.target.value)}
                  placeholder="KuGou phone"
                  inputMode="numeric"
                  disabled={isKuGouAuthBusy}
                />
                <button type="button" onClick={onKuGouCaptchaSend} disabled={isKuGouAuthBusy || kugouMobile.trim().length < 11}>
                  {isKuGouAuthBusy ? <Loader2 className="spin" size={15} /> : "Send code"}
                </button>
                <input
                  value={kugouCode}
                  onChange={(event) => onKuGouCodeChange(event.target.value)}
                  placeholder="Code"
                  inputMode="numeric"
                  disabled={isKuGouAuthBusy}
                />
                {kugouAccounts.length > 0 && (
                  <select
                    value={selectedKuGouUserId}
                    onChange={(event) => onKuGouUserSelect(event.target.value)}
                    disabled={isKuGouAuthBusy}
                    title="KuGou account"
                  >
                    {kugouAccounts.map((account) => (
                      <option key={account.userid} value={account.userid}>
                        {account.nickname ? `${account.nickname} / ${account.userid}` : account.userid}
                      </option>
                    ))}
                  </select>
                )}
                <button type="button" onClick={onKuGouLogin} disabled={isKuGouAuthBusy || !kugouMobile.trim() || !kugouCode.trim()}>
                  {isKuGouAuthBusy ? <Loader2 className="spin" size={15} /> : "KuGou login"}
                </button>
              </div>
            )}
          </div>
        </div>}
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
