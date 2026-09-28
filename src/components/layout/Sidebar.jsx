import {
  Squares2X2Icon,
  CalendarDaysIcon,
  ChartPieIcon,
  AcademicCapIcon,
  ClockIcon,
  UserGroupIcon,
  IdentificationIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

function Avatar({ gender = "male", size = 80 }) {
  const isFemale = gender === "female";

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100 ring-4 ring-green-600/30 shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        role="img"
        aria-label={isFemale ? "Female avatar" : "Male avatar"}
      >
        <circle cx="50" cy="50" r="50" fill="#DCFCE7" />
        <path
          d={
            isFemale
              ? "M14 100 Q14 70 50 70 Q86 70 86 100 Z"
              : "M12 100 Q12 72 50 72 Q88 72 88 100 Z"
          }
          fill={isFemale ? "#15803D" : "#166534"}
        />
        <rect x="42" y="58" width="16" height="16" fill="#E8B08A" />
        <circle cx="50" cy="45" r="20" fill="#F1C09A" />
        {isFemale ? (
          <path
            d="M27 50 Q23 20 50 18 Q77 20 73 50 Q73 34 64 30 Q58 40 50 32 Q42 40 36 30 Q27 34 27 50 Z M28 46 Q22 62 27 78 Q30 64 32 50 Z M72 46 Q78 62 73 78 Q70 64 68 50 Z"
            fill="#3F2A1D"
          />
        ) : (
          <path
            d="M28 42 Q26 22 50 21 Q74 22 72 42 Q71 30 50 29 Q29 30 28 42 Z"
            fill="#2B2119"
          />
        )}
      </svg>
    </div>
  );
}

export function Sidebar({
  user,
  activePage,
  onNavigate,
  onLogoutClick,
  mobileOpen = false,
  onCloseMobile,
}) {
  const role = user?.role || "STUDENT";

  const studentNavItems = [
    { key: "dashboard", label: "Dashboard", icon: Squares2X2Icon },
    { key: "timetable", label: "Today's Timetable", icon: CalendarDaysIcon },
    { key: "summary", label: "Attendance Summary", icon: ChartPieIcon },
    { key: "attendance-logs", label: "Attendance History", icon: ClockIcon },
    { key: "courses", label: "My Courses", icon: AcademicCapIcon },
  ];

  const adminNavItems = [
    { key: "admin-dashboard", label: "Dashboard Overview", icon: Squares2X2Icon },
    { key: "students", label: "Student Directory", icon: UserGroupIcon },
    { key: "faculty", label: "Faculty & Staff", icon: IdentificationIcon },
    { key: "departments", label: "Departments", icon: BuildingOffice2Icon },
    { key: "infrastructure", label: "Blocks & Classrooms", icon: BuildingStorefrontIcon },
    { key: "sessions", label: "Attendance Sessions", icon: ClipboardDocumentCheckIcon },
  ];

  const facultyNavItems = [
    { key: "faculty-dashboard", label: "Faculty Dashboard", icon: Squares2X2Icon },
    { key: "timetable", label: "My Schedule", icon: CalendarDaysIcon },
    { key: "sessions", label: "Class Sessions", icon: ClipboardDocumentCheckIcon },
    { key: "faculty-attendance", label: "My Attendance Logs", icon: ClockIcon },
  ];

  const navItems =
    role === "ADMIN"
      ? adminNavItems
      : role === "FACULTY"
      ? facultyNavItems
      : studentNavItems;

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-green-950 p-5 text-white">
      <div>
        {/* Mobile close button */}
        <div className="flex items-center justify-between pb-3 md:hidden">
          <span className="text-sm font-bold text-green-300">Navigation</span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-green-300 hover:bg-green-900"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="flex flex-col items-center rounded-2xl bg-green-900/60 p-4 text-center ring-1 ring-white/10 shadow-inner">
          <Avatar gender={user?.gender} size={76} />
          <h3 className="mt-3 text-base font-bold text-white tracking-tight line-clamp-1">
            {user?.name || "User"}
          </h3>
          <span className="mt-1 rounded-full bg-green-800/80 px-2.5 py-0.5 text-xs font-semibold text-green-200">
            {user?.role || "STUDENT"}
          </span>

          <dl className="mt-3 w-full border-t border-green-800/60 pt-2.5 text-left text-xs space-y-1.5">
            <div className="flex justify-between gap-2">
              <dt className="text-green-300/80 font-medium">ID / Reg No:</dt>
              <dd className="font-semibold text-green-50 truncate">
                {user?.registerNo || user?.userId || "—"}
              </dd>
            </div>
            {user?.department && (
              <div className="flex justify-between gap-2">
                <dt className="text-green-300/80 font-medium">Department:</dt>
                <dd className="font-semibold text-green-50 truncate max-w-[140px]">
                  {user.department}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Navigation Menu */}
        <div className="mt-6">
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-green-400/80">
            Navigation Menu
          </p>
          <nav className="mt-2.5 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onNavigate(item.key);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition ${
                    isActive
                      ? "bg-green-700 text-white shadow-xs font-semibold ring-1 ring-green-500/50"
                      : "text-green-100 hover:bg-green-900 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? "text-white" : "text-green-300"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Logout Action */}
      <div className="mt-8 border-t border-green-900 pt-4">
        <button
          type="button"
          onClick={onLogoutClick}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-950/40 px-4 py-2.5 text-sm font-semibold text-red-200 ring-1 ring-red-900/50 transition hover:bg-red-900/60 hover:text-white"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Logout
        </button>
        <p className="mt-3 text-center text-[11px] text-green-400/60">
          Joy University Smart Campus &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-72 shrink-0 md:block">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
