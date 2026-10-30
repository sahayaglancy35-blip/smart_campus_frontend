import { ShieldExclamationIcon, ArrowLeftIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

export function AccessDeniedView({ user, onNavigateToPortal, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center shadow-2xl shadow-black/60">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-950/60 text-rose-400 ring-1 ring-rose-800/50 shadow-lg shadow-rose-950/40">
          <ShieldExclamationIcon className="h-9 w-9" />
        </div>

        <span className="inline-flex items-center rounded-full bg-rose-950/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-400 ring-1 ring-rose-800/60 mb-3">
          403 Access Denied
        </span>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
          Administrator Clearance Required
        </h1>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          The requested section is restricted to authorized System Administrators. Your current session (
          <span className="font-semibold text-slate-200">
            {user?.name || user?.username || "Authenticated User"}
          </span>
          {user?.role && (
            <span className="ml-1 text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
              {user.role}
            </span>
          )}
          ) does not have administrative privileges.
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onNavigateToPortal}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-950/50 transition"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Return to User Portal</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 hover:bg-slate-800 py-2.5 text-sm font-medium text-slate-300 transition"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span>Sign Out Current Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccessDeniedView;
