import {
  AcademicCapIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

export function Header({ user, onToggleSidebar, activeTitle }) {
  const roleDisplay = {
    STUDENT: "Student",
    FACULTY: "Faculty Member",
    ADMIN: "Administrator",
  };

  const role = user?.role || "STUDENT";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden"
          aria-label="Open sidebar"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-800 text-white shadow-xs">
            <AcademicCapIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-green-950 sm:text-lg">
                Joy University
              </span>
              <span className="hidden rounded bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800 sm:inline-block">
                ERP
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium hidden sm:block">
              Smart Campus Management System
            </p>
          </div>
        </div>
      </div>

      {/* User Status Bar */}
      <div className="flex items-center gap-4">
        {activeTitle && (
          <div className="hidden lg:flex items-center text-sm font-semibold text-gray-700 border-l border-gray-200 pl-4">
            {activeTitle}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {user?.name || "Authenticated User"}
            </p>
            <p className="text-xs font-medium text-green-700">
              {roleDisplay[role] || role}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800 ring-2 ring-green-600/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
