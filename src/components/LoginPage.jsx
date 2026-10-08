import { useState } from "react";
import {
  UserIcon,
  IdentificationIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { ROLES, inputClass } from "../constants";
import { DEMO_CREDENTIALS } from "../api/endpoints";

/* ================================================================
   LOGIN PAGE
   Owns its own form state. On submit it hands the entered
   { role, userId, password } up to the parent via onLogin, which
   decides what happens next (e.g. calling an API, building a user
   object, and switching to the dashboard).
================================================================= */
function LoginPage({ onLogin, onForgotPassword, loading = false }) {
  const [role, setRole] = useState("Student");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isStudent = role === "Student";
  const idLabel = isStudent ? "Register No" : "User ID";

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setUserId("");
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ role, userId, password });
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-xl shadow-green-900/10 ring-1 ring-green-900/5">
        {/* ================= BRAND PANEL (desktop only) ================= */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-green-900 p-10 text-white">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-6 h-52 w-52 rounded-full bg-green-800/60" />

          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <UserIcon className="h-6 w-6" />
          </div>

          <div className="relative">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Welcome back
            </h1>
            <p className="mt-4 max-w-xs text-base leading-relaxed text-green-100">
              Secure access for students, staff and administrators. Sign in to
              continue to your account.
            </p>
          </div>

          <p className="relative text-sm text-green-200/80">
            &copy; {new Date().getFullYear()} All rights reserved
          </p>
        </aside>

        {/* ================= FORM PANEL ================= */}
        <main className="px-6 py-10 sm:px-12 sm:py-12">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 text-green-700 lg:hidden">
            <UserIcon className="h-7 w-7" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Sign in
          </h2>
          <p className="mt-1.5 text-[15px] text-gray-500">
            Choose your role and enter your details.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* ---------- Role ---------- */}
            <div>
              <span
                id="role-label"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Role
              </span>
              <div
                role="radiogroup"
                aria-labelledby="role-label"
                className="grid grid-cols-3 gap-1 rounded-lg bg-green-50 p-1 ring-1 ring-green-100"
              >
                {ROLES.map((item) => {
                  const selected = role === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleRoleChange(item)}
                      className={
                        "h-10 rounded-md text-[15px] font-medium transition " +
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 " +
                        (selected
                          ? "bg-white text-green-800 shadow-sm ring-1 ring-green-200"
                          : "text-gray-600 hover:text-green-800")
                      }
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ---------- User ID / Register No ---------- */}
            <div>
              <label
                htmlFor="userId"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                {idLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IdentificationIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="userId"
                  type="text"
                  autoComplete="username"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder={`Enter your ${idLabel}`}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* ---------- Password ---------- */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  className={inputClass + " pr-12"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition hover:bg-green-50 hover:text-green-700 focus-visible:outline-2 focus-visible:outline-green-600"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* ---------- Forgot password ---------- */}
            <div className="flex justify-end">
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  onForgotPassword();
                }}
                className="text-[15px] font-medium text-green-700 hover:text-green-900 hover:underline"
              >
                Forgot password?
              </a>
            </div>

            {/* ---------- Submit ---------- */}
            <button
              type="submit"
              className="h-12 w-full rounded-lg bg-green-700 text-base font-semibold text-white shadow-sm transition hover:bg-green-800 active:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* ---------- Anonymous / Demo Credentials Quick Fill ---------- */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  const creds = DEMO_CREDENTIALS[role];
                  if (creds) {
                    setUserId(creds.userId);
                    setPassword(creds.password);
                  }
                }}
                className="w-full rounded-lg border border-green-200 bg-green-50/70 py-2.5 text-xs font-semibold text-green-800 transition hover:bg-green-100/90 hover:border-green-300 active:bg-green-200 focus-visible:outline-2 focus-visible:outline-green-700"
              >
                Auto-Fill Demo Credentials ({role})
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export default LoginPage;
