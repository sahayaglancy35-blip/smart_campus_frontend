import { ExclamationTriangleIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

export function NotFoundPage({ user, currentPath, onNavigate }) {
  const getReturnAction = () => {
    if (!user) {
      return {
        label: "Return to Sign In",
        target: "/login",
      };
    }
    if (user.role === "ADMIN") {
      return {
        label: "Return to Admin Dashboard",
        target: "/admin/dashboard",
      };
    }
    return {
      label: "Return to Portal Dashboard",
      target: "/dashboard",
    };
  };

  const action = getReturnAction();

  return (
    <div className="min-h-screen bg-green-50 flex flex-col justify-center items-center p-4 sm:p-6 text-gray-900">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl shadow-green-900/10 ring-1 ring-green-900/5 p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm ring-4 ring-amber-50">
          <ExclamationTriangleIcon className="h-9 w-9" />
        </div>

        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800 ring-1 ring-amber-200 mb-3">
          404 Not Found
        </span>

        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
          Page Not Found
        </h1>

        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          The requested page or route does not exist within the Joy University ERP platform.
        </p>

        {currentPath && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 font-mono break-all text-center">
            {currentPath}
          </div>
        )}

        <button
          type="button"
          onClick={() => onNavigate(action.target)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-800 hover:bg-green-900 active:bg-green-950 py-3 text-sm font-semibold text-white shadow-sm transition"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>{action.label}</span>
        </button>
      </div>
    </div>
  );
}

export default NotFoundPage;
