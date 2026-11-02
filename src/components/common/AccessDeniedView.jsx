import { ShieldExclamationIcon, ArrowLeftIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

export function AccessDeniedView({ user, onNavigateToPortal, onLogout }) {
  const isStudent = user?.role === "STUDENT";

  return (
    <div className="min-h-screen bg-green-50 flex flex-col justify-center items-center p-4 sm:p-6 text-gray-900">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl shadow-green-900/10 ring-1 ring-green-900/5 p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-700 shadow-md ring-4 ring-red-50">
          <ShieldExclamationIcon className="h-9 w-9" />
        </div>

        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-800 ring-1 ring-red-200 mb-3">
          403 Access Denied
        </span>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 mb-2">
          Administrator Clearance Required
        </h1>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          The requested administrative area is strictly restricted to authorized university administrators. Student and faculty accounts are prohibited from accessing administrative registries and controls.
        </p>

        {user && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-left">
            <div className="flex justify-between items-center py-1 border-b border-gray-200">
              <span className="text-gray-500 font-medium">Logged in as:</span>
              <span className="font-semibold text-gray-900 truncate max-w-[180px]">
                {user.name || user.username}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 pt-2">
              <span className="text-gray-500 font-medium">Account Role:</span>
              <span className="rounded bg-gray-200 px-2 py-0.5 font-mono text-[11px] font-bold text-gray-800">
                {user.role || "STUDENT"}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onNavigateToPortal}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-800 hover:bg-green-900 active:bg-green-950 py-3 text-sm font-semibold text-white shadow-sm transition"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Return to {isStudent ? "Student Portal" : "Faculty Portal"}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 py-2.5 text-sm font-medium text-gray-700 transition"
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
