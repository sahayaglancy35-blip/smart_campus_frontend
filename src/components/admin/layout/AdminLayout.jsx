import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import ConfirmDialog from "../../common/ConfirmDialog";

export function AdminLayout({
  user,
  currentPath,
  onNavigate,
  onLogout,
  onRefresh,
  title = "Administrator Portal",
  subtitle = "Joy University Enterprise Control & System Governance",
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans antialiased text-slate-800">
      {/* Sidebar */}
      <AdminSidebar
        user={user}
        currentPath={currentPath}
        onNavigate={onNavigate}
        onLogoutClick={() => setLogoutModalOpen(true)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <AdminHeader
          user={user}
          title={title}
          subtitle={subtitle}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onRefresh={onRefresh}
          onLogoutClick={() => setLogoutModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={() => {
          setLogoutModalOpen(false);
          onLogout();
        }}
        title="Sign Out Administrator"
        message="Are you sure you want to terminate your administrative session? You will be returned to the dedicated Administrator Sign In portal."
        confirmText="Sign Out Admin"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
}

export default AdminLayout;
