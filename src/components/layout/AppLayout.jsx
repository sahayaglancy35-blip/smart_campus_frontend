import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Modal from "../common/Modal";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export function AppLayout({
  user,
  activePage,
  onNavigate,
  onLogout,
  pageTitle,
  pageSubtitle,
  children,
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isDashboardPage =
    activePage === "dashboard" ||
    activePage === "admin-dashboard" ||
    activePage === "faculty-dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header
        user={user}
        activeTitle={pageTitle}
        onToggleSidebar={() => setMobileSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          user={user}
          activePage={activePage}
          onNavigate={onNavigate}
          onLogoutClick={() => setShowLogoutModal(true)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {!isDashboardPage && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200/80 pb-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    {pageTitle}
                  </h1>
                  {pageSubtitle && (
                    <p className="mt-1 text-sm text-gray-500">
                      {pageSubtitle}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>{children}</div>
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign Out Confirmation"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-gray-900">
            Ready to leave?
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Are you sure you want to end your current session? You will need to log
            in again to access the portal.
          </p>

          <div className="mt-6 flex w-full items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setShowLogoutModal(false);
                onLogout();
              }}
              className="w-1/2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              Yes, Sign Out
            </button>
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="w-1/2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AppLayout;
