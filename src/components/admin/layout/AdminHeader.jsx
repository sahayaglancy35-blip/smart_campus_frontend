import {
  Bars3Icon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export function AdminHeader({
  user,
  title,
  subtitle,
  onOpenMobileMenu,
  onRefresh,
  onLogoutClick,
}) {
  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-8 backdrop-blur-md">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            <span className="hidden sm:inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20">
              Admin Console
            </span>
          </div>
          {subtitle && (
            <p className="hidden text-xs text-slate-500 sm:block mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh administrative data"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        )}

        {/* User Info Chip */}
        <div className="hidden md:flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs ring-1 ring-emerald-600/30">
            <ShieldCheckIcon className="h-5 w-5" />
          </div>
          <div className="text-left text-xs">
            <p className="font-semibold text-slate-900 line-clamp-1">
              {user?.name || user?.username || "Admin"}
            </p>
            <p className="text-[11px] text-emerald-700 font-medium">ADMINISTRATOR</p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={onLogoutClick}
          className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:bg-rose-200"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}

export default AdminHeader;
