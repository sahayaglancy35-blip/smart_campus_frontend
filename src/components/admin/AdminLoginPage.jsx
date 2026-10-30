import { useState, useEffect } from "react";
import {
  ShieldCheckIcon,
  IdentificationIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const ADMIN_SAVED_USER_KEY = "smart_campus_admin_remembered_user";

export function AdminLoginPage({ onLogin, loading = false, error = "" }) {
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_SAVED_USER_KEY) || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberUser, setRememberUser] = useState(() => {
    try {
      return Boolean(localStorage.getItem(ADMIN_SAVED_USER_KEY));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (rememberUser && username.trim()) {
        localStorage.setItem(ADMIN_SAVED_USER_KEY, username.trim());
      } else {
        localStorage.removeItem(ADMIN_SAVED_USER_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [rememberUser, username]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    onLogin({ username: username.trim(), password });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md">
        {/* Institutional Admin Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-950/50">
            <ShieldCheckIcon className="h-9 w-9" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-800/60 mb-2">
            Institutional Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Administrator Portal
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Joy University Smart Campus Enterprise Control
          </p>
        </div>

        {/* Admin Card */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl shadow-black/60 p-6 sm:p-8 backdrop-blur-sm">
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-xl border border-rose-800/60 bg-rose-950/50 p-4 text-sm text-rose-300"
            >
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username / Admin Identifier */}
            <div>
              <label
                htmlFor="admin-username"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Administrator Username or Email <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <IdentificationIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  id="admin-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or admin@joyuniversity.edu"
                  required
                  className="w-full h-12 rounded-lg border border-slate-700 bg-slate-950/70 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Security Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  required
                  className="w-full h-12 rounded-lg border border-slate-700 bg-slate-950/70 pl-11 pr-12 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberUser}
                  onChange={(e) => setRememberUser(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500/30"
                />
                Remember username
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 font-semibold text-white shadow-lg shadow-emerald-950/50 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Verifying Administrator Clearance...</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span>Sign In as Administrator</span>
                </>
              )}
            </button>
          </form>

          {/* Audit Notice */}
          <div className="mt-6 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 text-center">
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-400">Security Notice:</span> Access to this system is restricted to authorized campus administrators. All logins, modifications, and query activities are logged.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-600">
          &copy; {new Date().getFullYear()} Joy University Smart Campus ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default AdminLoginPage;
