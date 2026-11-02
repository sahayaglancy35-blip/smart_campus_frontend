import { useState } from "react";
import {
  Bars3Icon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import ProfileModal from "../../common/ProfileModal";

export function AdminHeader({
  user,
  title,
  subtitle,
  onOpenMobileMenu,
  onRefresh,
}) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-xs sm:px-6 lg:px-8">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-green-950">
              {title}
            </h1>
            <span className="hidden sm:inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
              Admin Console
            </span>
          </div>
          {subtitle && (
            <p className="hidden text-xs text-gray-500 sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Actions: Refresh, User display, and Clickable Avatar opening ProfileModal */}
      <div className="flex items-center gap-4">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh administrative data"
            title="Refresh administrative data"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-xs transition hover:bg-gray-50 hover:text-green-800"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        )}

        {/* User Info Chip */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-gray-900">
              {user?.name || user?.username || "Administrator"}
            </p>
            <p className="text-xs font-medium text-green-700">Administrator</p>
          </div>

          {/* Clickable Avatar Opening ProfileModal */}
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            aria-label="View and edit administrator profile"
            title="View and edit administrator profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800 ring-2 ring-green-600/20 transition hover:scale-105 hover:ring-green-600/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
          </button>
        </div>
      </div>

      {/* Embedded Profile Modal for Admin Profile Viewing and Editing */}
      <ProfileModal
        isOpen={showProfile}
        user={user}
        onClose={() => setShowProfile(false)}
      />
    </header>
  );
}

export default AdminHeader;
