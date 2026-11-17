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
  BookOpenIcon,
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
    route: "/admin/academic/subjects",
    label: "Courseware & Subjects",
    icon: BookOpenIcon,
    description: "Course catalog & subject workspaces",
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
    if (itemRoute === "/admin/academic/subjects") {
      return currentPath?.startsWith("/admin/academic/subjects");
    }
    return currentPath === itemRoute;
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-green-950 p-5 text-white">
      <div>
        {/* Mobile close header */}
        <div className="flex items-center justify-between pb-3 lg:hidden">
          <span className="text-sm font-bold text-green-300">Admin Navigation</span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-green-300 hover:bg-green-900"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Branding */}
        <div className="flex items-center gap-3 pb-5 border-b border-green-900/60">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-800 text-white font-bold text-lg shadow-xs ring-1 ring-white/10">
            JU
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white">Joy University</span>
              <span className="rounded bg-green-800/90 px-1.5 py-0.5 text-[10px] font-semibold text-green-200">
                ERP
              </span>
            </div>
            <p className="text-xs text-green-300/80">Administrator Console</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="mt-5 flex flex-col items-center rounded-2xl bg-green-900/60 p-4 text-center ring-1 ring-white/10 shadow-inner">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-800 ring-4 ring-green-600/30 font-bold text-xl shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
          </div>
          <h3 className="mt-3 text-base font-bold text-white tracking-tight line-clamp-1">
            {user?.name || user?.username || "Administrator"}
          </h3>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-800/80 px-2.5 py-0.5 text-xs font-semibold text-green-200">
            <ShieldCheckIcon className="h-3.5 w-3.5 text-green-300" />
            ADMINISTRATOR
          </span>

          <dl className="mt-3 w-full border-t border-green-800/60 pt-2.5 text-left text-xs space-y-1.5">
            <div className="flex justify-between gap-2">
              <dt className="text-green-300/80 font-medium">User ID:</dt>
              <dd className="font-semibold text-green-50 truncate">
                {user?.username || user?.registerNo || "admin"}
              </dd>
            </div>
            {user?.email && (
              <div className="flex justify-between gap-2">
                <dt className="text-green-300/80 font-medium">Email:</dt>
                <dd className="font-semibold text-green-50 truncate max-w-[140px]">
                  {user.email}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Navigation Section */}
        <div className="mt-6">
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-green-400/80">
            Administrative Modules
          </p>

          <nav className="mt-2.5 space-y-1" aria-label="Administrator Navigation">
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? "bg-green-700 text-white shadow-xs font-semibold ring-1 ring-green-500/50"
                      : "text-green-100 hover:bg-green-900 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 transition ${
                      active ? "text-white" : "text-green-300"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Single Logout Action at Bottom Left */}
      <div className="border-t border-green-900/60 pt-4 mt-6">
        <button
          type="button"
          onClick={onLogoutClick}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-green-200/80 transition hover:bg-green-900/40 hover:text-white"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />
          <span>Sign Out</span>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
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
