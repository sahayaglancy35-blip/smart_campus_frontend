import { useState } from "react";
import {
  CalendarDaysIcon,
  ChartPieIcon,
  UserMinusIcon,
  BriefcaseIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { ArrowLeftIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

const QUICK_LINKS = [
  { key: "timetable", label: "Today's Timetable", icon: CalendarDaysIcon },
  { key: "summary", label: "Attendance Summary", icon: ChartPieIcon },
  { key: "absent", label: "Absent Details", icon: UserMinusIcon },
  { key: "onduty", label: "On Duty", icon: BriefcaseIcon },
];

/* ----------------------------------------------------------------
   Avatar — inline SVG bust illustration
---------------------------------------------------------------- */
function Avatar({ gender = "male", size = 96 }) {
  const isFemale = gender === "female";

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100 ring-4 ring-white shadow-sm"
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
          d={isFemale ? "M14 100 Q14 70 50 70 Q86 70 86 100 Z" : "M12 100 Q12 72 50 72 Q88 72 88 100 Z"}
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
          <path d="M28 42 Q26 22 50 21 Q74 22 72 42 Q71 30 50 29 Q29 30 28 42 Z" fill="#2B2119" />
        )}
      </svg>
    </div>
  );
}

/* ----------------------------------------------------------------
   Sidebar — Primary Brand Green (bg-green-900)
---------------------------------------------------------------- */
function Sidebar({ user, onLogoutClick }) {
  return (
    <aside className="flex w-full shrink-0 flex-col bg-green-900 px-6 py-8 md:w-[302px] md:py-10">
      <div className="flex flex-col items-center text-center">
        <Avatar gender={user?.gender} size={88} />

        <div className="mt-4">
          <h3 className="text-lg font-semibold text-white">
            Welcome, {user?.name || "User"}
          </h3>
          <p className="text-sm text-green-200">{user?.role || "Student"}</p>
        </div>
      </div>

      <dl className="mt-8 space-y-4 text-center text-sm">
        <div>
          <dt className="text-green-300">Register No</dt>
          <dd className="mt-0.5 font-medium text-white">{user?.registerNo || "N/A"}</dd>
        </div>

        {user?.role === "Student" && user?.department && (
          <div>
            <dt className="text-green-300">Department</dt>
            <dd className="mt-0.5 font-medium text-white">{user.department}</dd>
          </div>
        )}

        <div>
          <dt className="text-green-300">Email</dt>
          <dd className="mt-0.5 break-all font-medium text-white">{user?.email || "N/A"}</dd>
        </div>
      </dl>

      <div className="mt-8 border-t border-green-800 pt-6 text-center md:mt-auto">
        <button
          type="button"
          onClick={onLogoutClick}
          className="inline-flex items-center gap-2 text-sm font-medium text-green-100 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}

/* Header & Footer */
function DashboardHeader() {
  return <header className="h-14 shrink-0 border-b border-gray-200 bg-white" />;
}

function DashboardFooter() {
  return <footer className="h-14 shrink-0 border-t border-gray-200 bg-white" />;
}

/* ----------------------------------------------------------------
   Dashboard Home — Increased card width, icon size, & text size
---------------------------------------------------------------- */
function DashboardHome({ onNavigate }) {
  return (
    <div className="grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2">
      {QUICK_LINKS.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="flex h-[220px] w-[300px] flex-col items-center justify-center gap-5 rounded-xl bg-white px-5 py-6 text-center shadow-lg ring-1 ring-green-200/50 transition hover:-translate-y-1 hover:shadow-xl"
        >
          {/* Increased icon circle badge size (h-20 w-20) */}
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-green-800 text-white shadow-inner ring-4 ring-green-100">
            {/* Increased SVG icon size (h-10 w-10) */}
            <Icon className="h-10 w-10" />
          </span>

          {/* Increased text size (text-base) */}
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              onNavigate(key);
            }}
            className="text-base font-semibold text-green-800 hover:text-green-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            {label}
          </a>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------
   Placeholder section
---------------------------------------------------------------- */
function PlaceholderSection({ title, onBack }) {
  return (
    <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-green-200">
      <p className="text-gray-600">{title} content will appear here.</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center gap-2 text-base font-medium text-green-800 hover:text-green-950 hover:underline"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to dashboard
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------
   Logout Confirmation Modal
---------------------------------------------------------------- */
function LogoutModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl bg-green-50 p-6 shadow-2xl ring-1 ring-green-200 transition-all transform scale-100">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-200 text-green-800">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>

          <h3 className="mt-4 text-xl font-semibold text-green-950">
            Are you sure?
          </h3>
          <p className="mt-2 text-sm text-green-800">
            Do you really want to log out of your session?
          </p>

          <div className="mt-6 flex w-full items-center justify-center gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className="w-1/2 rounded-lg bg-green-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-900 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-1/2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-green-800 ring-1 ring-green-300 hover:bg-green-100 transition"
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PAGE_TITLES = {
  dashboard: "Attendance",
  timetable: "Today's Timetable",
  summary: "Attendance Summary",
  absent: "Absent Details",
  onduty: "On Duty",
};

/* ================================================================
   DASHBOARD
================================================================= */
function Dashboard({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const goDashboard = () => setPage("dashboard");

  const renderContent = () => {
    if (page === "dashboard") return <DashboardHome onNavigate={setPage} />;
    return <PlaceholderSection title={PAGE_TITLES[page]} onBack={goDashboard} />;
  };

  return (
    <div className="flex min-h-screen flex-col bg-green-100">
      <DashboardHeader />

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Sidebar */}
        <Sidebar user={user} onLogoutClick={() => setShowLogoutModal(true)} />

        {/* Main Content Area - Single Unified Section with "Attendance" Title pushed up */}
        <main className="flex-1 px-6 py-6 sm:px-10 sm:py-8">
          <h1 className="text-3xl font-bold tracking-tight text-green-950">
            {PAGE_TITLES[page]}
          </h1>
          <div className="mt-6">{renderContent()}</div>
        </main>
      </div>

      <DashboardFooter />

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={onLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}

export default Dashboard;