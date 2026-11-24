import { useState } from "react";
import {
  AcademicCapIcon,
  Bars3Icon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import ProfileModal from "../common/ProfileModal";
import Avatar from "../common/Avatar";
import { getPhotoPath } from "../../utils/photo";

/* ================================================================
   HEADER
   Props:
   - user            logged-in user object
   - onToggleSidebar opens the sidebar on small screens
   - activeTitle     current page title shown next to the user
                     (pageTitle is also accepted)
   - onRefresh       optional; if not given, the refresh button
                     reloads the page
   Clicking the avatar circle opens the profile popup.
================================================================= */
export function Header({ user, onToggleSidebar, onRefresh }) {
  const [showProfile, setShowProfile] = useState(false);

  const roleDisplay = {
    STUDENT: "Student",
    FACULTY: "Faculty Member",
    ADMIN: "Administrator",
  };

  const role = user?.role || "STUDENT";

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-xs sm:px-6 lg:px-8">
      {/* Left: menu button (mobile) + brand */}
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
            <p className="hidden text-xs font-medium text-gray-500 sm:block">
              Smart Campus Management System
            </p>
          </div>
        </div>
      </div>

      {/* Right: refresh, page title, user */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh"
          title="Refresh"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-xs transition hover:bg-gray-50 hover:text-green-800"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-gray-900">
              {user?.name || "Authenticated User"}
            </p>
            <p className="text-xs font-medium text-green-700">
              {roleDisplay[role] || role}
            </p>
          </div>

          {/* Clicking the avatar opens the profile popup */}
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            aria-label="View my profile"
            title="View my profile"
            className="flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-green-600/20 transition hover:scale-105 hover:ring-green-600/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            <Avatar
              src={getPhotoPath(user)}
              version={user?.photoVersion}
              name={user?.name}
              size="sm"
            />
          </button>
        </div>
      </div>

      <ProfileModal
        isOpen={showProfile}
        user={user}
        onClose={() => setShowProfile(false)}
      />
    </header>
  );
}

export default Header;