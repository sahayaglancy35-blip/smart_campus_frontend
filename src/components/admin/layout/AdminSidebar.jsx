import {
  Squares2X2Icon,
  UserGroupIcon,
  IdentificationIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const ADMIN_NAV_ITEMS = [
  {
    route: "/admin/dashboard",
    label: "Dashboard Overview",
    icon: Squares2X2Icon,
    description: "System stats & registry metrics",
  },
  {
    route: "/admin/students",
    label: "Student Directory",
    icon: UserGroupIcon,
    description: "Enrollments & academic profiles",
  },
  {
    route: "/admin/faculty",
    label: "Faculty & Staff",
    icon: IdentificationIcon,
    description: "Academic personnel & staff",
  },
  {
    route: "/admin/departments",
    label: "Departments",
    icon: BuildingOffice2Icon,
    description: "Faculties & departmental units",
  },
  {
    route: "/admin/classrooms",
    label: "Blocks & Classrooms",
    icon: BuildingStorefrontIcon,
    description: "Lecture halls, smart labs & blocks",
  },
  {
    route: "/admin/academics",
    label: "Academics Management",
    icon: AcademicCapIcon,
    description: "Curriculum, batches & sections",
  },
  {
    route: "/admin/attendance",
    label: "Attendance Operations",
    icon: ClipboardDocumentCheckIcon,
    description: "Sessions, audits & overrides",
  },
];

export function AdminSidebar({
  user,
  currentPath,
  onNavigate,
  onLogoutClick,
  mobileOpen = false,
  onCloseMobile,
}) {
  const isItemActive = (itemRoute) => {
    if (itemRoute === "/admin/dashboard") {
      return currentPath === "/admin" || currentPath === "/admin/dashboard";
    }
    return currentPath === itemRoute;
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-slate-900 border-r border-slate-800 text-slate-100 p-5 overflow-y-auto">
      <div>
        {/* Branding */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400/30">
              JU
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">Joy University</span>
                <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-800/80">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400">Smart Campus ERP Control</p>
            </div>
          </div>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* User Card */}
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 ring-1 ring-emerald-600/40">
            <ShieldCheckIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {user?.name || user?.username || "Administrator"}
            </p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              System Administrator
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="mt-6 space-y-1.5" aria-label="Administrator Navigation">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Management Modules
          </p>

          {ADMIN_NAV_ITEMS.map((item) => {
            const active = isItemActive(item.route);
            const Icon = item.icon;

            return (
              <button
                key={item.route}
                type="button"
                onClick={() => {
                  onNavigate(item.route);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition ${
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/50"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition ${
                    active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-semibold">{item.label}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="pt-6 border-t border-slate-800 mt-6">
        <button
          type="button"
          onClick={onLogoutClick}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3.5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-rose-900/50 hover:bg-rose-950/30 hover:text-rose-400"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 text-slate-400" />
          <span>Sign Out Admin</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex h-full w-80 max-w-[85vw] flex-col shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

export default AdminSidebar;
