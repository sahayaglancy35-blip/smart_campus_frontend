import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { RouterProvider } from "./context/RouterProvider";
import { useRouter } from "./context/useRouter";
import LoadingSpinner from "./components/common/LoadingSpinner";
import { loginUser, loginAdmin, getAuthMe, logoutUser } from "./api/auth";
import { fetchStudentProfile } from "./api/student";
import { fetchFacultyProfile } from "./api/faculty";
import * as adminApi from "./api/admin";
import { ProfileUpdateContext } from "./context/ProfileUpdateContext";

const LoginPage = lazy(() => import("./components/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./components/ForgotPasswordPage"));
const AdminLoginPage = lazy(() => import("./components/admin/AdminLoginPage"));
const AdminPortal = lazy(() => import("./components/admin/AdminPortal"));
const AccessDeniedView = lazy(() => import("./components/common/AccessDeniedView"));
const NotFoundPage = lazy(() => import("./components/common/NotFoundPage"));
const Dashboard = lazy(() => import("./components/Dashboard"));

const ROLE_MAP = {
  Student: "STUDENT",
  Staff: "FACULTY",
  Admin: "ADMIN",
};

const TOKEN_KEY = "smart_campus_jwt";
const LEGACY_TOKEN_KEY = "token";
const USER_KEY = "smart_campus_user";

const VALID_ADMIN_MODULE_ROUTES = [
  "/admin",
  "/admin/dashboard",
  "/admin/students",
  "/admin/faculty",
  "/admin/departments",
  "/admin/classrooms",
  "/admin/academics",
  "/admin/academic/subjects",
  "/admin/attendance",
];

function isValidAdminPath(path) {
  if (!path) return false;
  if (VALID_ADMIN_MODULE_ROUTES.includes(path)) return true;
  if (path.startsWith("/admin/academic/subjects/")) return true;
  return false;
}

function getStoredToken() {
  try {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem(LEGACY_TOKEN_KEY) ||
      null
    );
  } catch {
    return null;  
  }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function AppContent() {
  const { currentPath, navigate } = useRouter();

  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);
  const [isInitializing, setIsInitializing] = useState(() => {
    const savedToken = getStoredToken();
    const savedUser = getStoredUser();
    return Boolean(savedToken && !savedUser);
  });

  const [loginError, setLoginError] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAdminRoute = currentPath === "/admin" || currentPath.startsWith("/admin/");
  const isAdminLogin = currentPath === "/admin/login";
  const isForgotPassword = currentPath === "/forgot-password";
  const isGeneralLogin = currentPath === "/login" || currentPath === "/";

  const buildUserProfile = useCallback(async (authData, authToken) => {
    let profile = authData;

    if (authData.role === "STUDENT") {
      try {
        const profileResult = await fetchStudentProfile(authToken);
        if (profileResult?.success && profileResult?.data) {
          profile = {
            ...authData,
            ...profileResult.data,
          };
        }
      } catch (profileErr) {
        console.warn(
          "Could not fetch detailed student profile:",
          profileErr.message,
        );
      }
    } else if (authData.role === "FACULTY") {
      try {
        const profileResult = await fetchFacultyProfile(authToken);
        if (profileResult?.success && profileResult?.data) {
          profile = {
            ...authData,
            ...profileResult.data,
          };
        }
      } catch (profileErr) {
        console.warn(
          "Could not fetch detailed faculty profile:",
          profileErr.message,
        );
      }
    } else if (
      authData.role === "ADMIN" &&
      typeof adminApi.fetchAdminProfile === "function"
    ) {
      try {
        const profileResult = await adminApi.fetchAdminProfile(authToken);
        if (profileResult?.success && profileResult?.data) {
          profile = {
            ...authData,
            ...profileResult.data,
          };
        }
      } catch (profileErr) {
        console.warn(
          "Could not fetch detailed admin profile:",
          profileErr.message,
        );
      }
    }

    const roleLabel =
      authData.role === "STUDENT"
        ? "Student"
        : authData.role === "FACULTY"
          ? "Staff"
          : "Admin";

    return {
      name:
        profile.full_name ||
        profile.name ||
        profile.username ||
        authData.username,
      registerNo:
        profile.register_no ||
        profile.registerNo ||
        profile.employee_code ||
        authData.username,
      department: profile.department_name || profile.department || null,
      email: profile.email || authData.email,
      phone: profile.phone || null,
      role: authData.role,
      roleLabel,
      gender: profile.gender || "male",
      genderLabel: profile.gender || "male",
      userId: authData.user_id,
      studentId: authData.student_id,
      facultyId: authData.faculty_id || profile.faculty_id,

      // Profile details
      dateOfBirth:
        profile.date_of_birth ||
        profile.dateOfBirth ||
        profile.dob ||
        null,
      bloodGroup:
        profile.blood_group ||
        profile.bloodGroup ||
        null,
      // student
      batch: profile.batch || profile.batch_label || null,
      programme:
        profile.programme_name ||
        profile.programme ||
        null,
      section: profile.section_code || profile.section || null,
      degree_name: profile.degree_name || null,
      academic_year_label: profile.academic_year_label || null,
      // faculty and admin
      joiningYear:
        profile.joining_year ||
        profile.joiningYear ||
        null,
      designation:
        profile.designation ||
        null,
      inChargeClass:
        profile.in_charge_class || profile.inChargeClass || null,
      employeeId:
        profile.employee_id ||
        profile.employee_code ||
        null,
      department_id: profile.department_id || authData.department_id || null,
      department_name: profile.department_name || profile.department || null,
      is_hod: Boolean(
        profile.is_hod ||
        authData.is_hod ||
        /head\s+of\s+department|\bhod/i.test(profile.designation || "") ||
        /head\s+of\s+department|\bhod/i.test(profile.designation_name || "") ||
        /head\s+of\s+department|\bhod/i.test(profile.in_charge_class || "") ||
        /head\s+of\s+department|\bhod/i.test(authData.username || "")
      ),
    };
  }, []);

  const restoreSession = useCallback(
    async (savedToken) => {
      setIsInitializing(true);
      setSessionError("");

      try {
        const result = await getAuthMe(savedToken);

        if (!result?.success || !result?.data) {
          throw new Error(
            result?.message || "Invalid session response from server",
          );
        }

        const userData = await buildUserProfile(result.data, savedToken);

        try {
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
        } catch {
          // Ignore storage errors
        }

        setToken(savedToken);
        setUser(userData);
      } catch (err) {
        console.error("Session restoration error:", err);

        const isAuthError =
          err.status === 401 ||
          err.status === 403 ||
          /invalid|expired|inactive|unauthorized/i.test(err.message || "");

        if (isAuthError) {
          try {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(LEGACY_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          } catch {
            // Ignore storage errors
          }
          setToken(null);
          setUser(null);

          if (window.location.pathname.startsWith("/admin")) {
            setAdminLoginError("Your session has expired. Please log in again.");
            navigate("/admin/login", { replace: true });
          } else {
            setLoginError("Your session has expired. Please log in again.");
            navigate("/login", { replace: true });
          }
        } else {
          setSessionError(
            "Unable to connect to the campus server. Please check your network and try again.",
          );
        }
      } finally {
        setIsInitializing(false);
      }
    },
    [buildUserProfile, navigate],
  );

  useEffect(() => {
    let mounted = true;
    const savedToken = getStoredToken();

    if (!savedToken) {
      return;
    }

    getAuthMe(savedToken)
      .then(async (result) => {
        if (!mounted) return;
        if (!result?.success || !result?.data) {
          throw new Error(
            result?.message || "Invalid session response from server",
          );
        }

        const userData = await buildUserProfile(result.data, savedToken);
        if (!mounted) return;

        try {
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
        } catch {
          // Ignore storage errors
        }

        setToken(savedToken);
        setUser(userData);
        setIsInitializing(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Session restoration error:", err);

        const isAuthError =
          err.status === 401 ||
          err.status === 403 ||
          /invalid|expired|inactive|unauthorized/i.test(err.message || "");

        if (isAuthError) {
          try {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(LEGACY_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          } catch {
            // Ignore storage errors
          }
          setToken(null);
          setUser(null);

          if (window.location.pathname.startsWith("/admin")) {
            setAdminLoginError("Your session has expired. Please log in again.");
            navigate("/admin/login", { replace: true });
          } else {
            setLoginError("Your session has expired. Please log in again.");
            navigate("/login", { replace: true });
          }
        } else {
          setSessionError(
            "Unable to connect to the campus server. Please check your network and try again.",
          );
        }
        setIsInitializing(false);
      });

    return () => {
      mounted = false;
    };
  }, [buildUserProfile, navigate]);

  // Route guarding and automatic redirection for authenticated users visiting login
  useEffect(() => {
    if (isInitializing || isLoggingOut) return;

    if (!token || !user) {
      // Unauthenticated visitor attempting to access valid admin module -> redirect to admin login
      if (isAdminRoute && !isAdminLogin && VALID_ADMIN_MODULE_ROUTES.includes(currentPath)) {
        navigate("/admin/login", { replace: true });
      }
    } else {
      // Authenticated user
      if (user.role === "ADMIN") {
        if (currentPath === "/login" || currentPath === "/admin/login" || currentPath === "/admin" || currentPath === "/" || currentPath === "/dashboard") {
          navigate("/admin/dashboard", { replace: true });
        }
      } else {
        // Non-admin (STUDENT, FACULTY, etc.)
        if (currentPath === "/login" || currentPath === "/") {
          navigate("/dashboard", { replace: true });
        }
      }
    }
  }, [token, user, currentPath, isAdminRoute, isAdminLogin, isInitializing, isLoggingOut, navigate]);

  const handleGeneralLogin = async ({ role, userId, password }) => {
    setLoginError("");
    setSessionError("");
    setLoading(true);

    try {
      const result = await loginUser(userId, password);

      if (!result.success) {
        throw new Error(result.message || "Login failed");
      }

      // Strict rejection of Administrator accounts without revealing the secret admin URL
      if (result.data.role === "ADMIN") {
        throw new Error(
          "Access denied: this account does not have student or staff privileges for this portal."
        );
      }

      const expectedRole = ROLE_MAP[role] || role;

      if (result.data.role !== expectedRole) {
        throw new Error("Please select the correct role for this account.");
      }

      try {
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(LEGACY_TOKEN_KEY, result.token);
      } catch (storageErr) {
        console.warn("Storage write failed:", storageErr);
      }

      const userData = await buildUserProfile(result.data, result.token);

      try {
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      } catch (storageErr) {
        console.warn("User storage write failed:", storageErr);
      }

      setToken(result.token);
      setUser(userData);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setLoginError(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async ({ username, password }) => {
    setAdminLoginError("");
    setSessionError("");
    setLoading(true);

    try {
      const result = await loginAdmin(username, password);

      if (!result.success) {
        throw new Error(result.message || "Administrator authentication failed");
      }

      if (result.data.role !== "ADMIN") {
        throw new Error(
          "Access restricted: only administrators may log in through the Administrator Portal."
        );
      }

      try {
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(LEGACY_TOKEN_KEY, result.token);
      } catch (storageErr) {
        console.warn("Storage write failed:", storageErr);
      }

      const userData = await buildUserProfile(result.data, result.token);

      try {
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      } catch (storageErr) {
        console.warn("User storage write failed:", storageErr);
      }

      setToken(result.token);
      setUser(userData);
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      setAdminLoginError(error.message || "Administrator authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneralLogout = async () => {
    setIsLoggingOut(true);
    const currentToken = token || getStoredToken();
    if (currentToken) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        await logoutUser(currentToken, controller.signal);
        clearTimeout(timeoutId);
      } catch (err) {
        console.warn("Server-side logout notice:", err.message);
      }
    }

    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // Ignore storage errors
    }
    setUser(null);
    setToken(null);
    setLoginError("");
    setSessionError("");
    setIsLoggingOut(false);
    navigate("/login", { replace: true });
  };

  const handleAdminLogout = async () => {
    setIsLoggingOut(true);
    const currentToken = token || getStoredToken();
    if (currentToken) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        await logoutUser(currentToken, controller.signal);
        clearTimeout(timeoutId);
      } catch (err) {
        console.warn("Server-side admin logout notice:", err.message);
      }
    }

    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // Ignore storage errors
    }
    setUser(null);
    setToken(null);
    setAdminLoginError("");
    setSessionError("");
    setIsLoggingOut(false);
    navigate("/admin/login", { replace: true });
  };

  const handleProfileUpdate = useCallback(
    async (values) => {
      const currentToken = token || getStoredToken();

      if (typeof adminApi.updateAdminProfile !== "function") {
        throw new Error(
          "Profile editing is not available: the updateAdminProfile API function is missing.",
        );
      }

      const result = await adminApi.updateAdminProfile(currentToken, {
        full_name: values.name,
        email: values.email,
        joining_year: values.joiningYear,
        date_of_birth: values.dateOfBirth,
        gender: values.gender,
        blood_group: values.bloodGroup,
      });

      if (result && result.success === false) {
        throw new Error(result.message || "Could not update your profile.");
      }

      const updatedUser = {
        ...user,
        name: values.name,
        full_name: values.name,
        email: values.email,
        joiningYear: values.joiningYear,
        dateOfBirth: values.dateOfBirth,
        bloodGroup: values.bloodGroup,
        gender: values.gender || user?.gender || "male",
        genderLabel: values.gender,
      };

      setUser(updatedUser);
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      } catch {
        // Ignore storage errors
      }
    },
    [token, user],
  );

  const handleRetrySession = () => {
    const savedToken = getStoredToken();
    if (savedToken) {
      restoreSession(savedToken);
    } else {
      if (window.location.pathname.startsWith("/admin")) {
        navigate("/admin/login", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }
  };

  // 0. Logging out state: revoking session
  if (isLoggingOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg border border-gray-100">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-900 text-white font-bold text-xl">
            JU
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-1">
            Joy University Smart Campus
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            Revoking secure session and signing out...
          </p>
          <LoadingSpinner message="Signing out securely..." size="md" />
        </div>
      </div>
    );
  }

  // 1. Initializing state: verifying existing session
  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg border border-gray-100">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-900 text-white font-bold text-xl">
            JU
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-1">
            Joy University Smart Campus
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            Restoring your authenticated session...
          </p>
          <LoadingSpinner message="Validating credentials..." size="md" />
        </div>
      </div>
    );
  }

  // 2. Network / server failure screen with retry
  if (sessionError && currentPath !== "/login" && !isAdminLogin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg border border-red-100">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Connection Problem
          </h3>
          <p className="text-xs text-gray-600 mb-6">{sessionError}</p>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleRetrySession}
              className="w-full rounded-xl bg-green-800 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
            >
              Retry Connection
            </button>
            <button
              type="button"
              onClick={isAdminRoute ? handleAdminLogout : handleGeneralLogout}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Sign In to Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthenticated views
  if (!token || !user) {
    if (isAdminLogin) {
      return (
        <AdminLoginPage
          onLogin={handleAdminLogin}
          loading={loading}
          error={adminLoginError}
        />
      );
    }

    if (isForgotPassword) {
      return <ForgotPasswordPage onBack={() => navigate("/login")} />;
    }

    if (isGeneralLogin) {
      return (
        <>
          <LoginPage
            onLogin={handleGeneralLogin}
            onForgotPassword={() => navigate("/forgot-password")}
            loading={loading}
          />

          {loginError && (
            <div
              role="alert"
              className="fixed bottom-5 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 rounded-xl border border-red-200 bg-white p-4 text-sm font-semibold text-red-700 shadow-xl"
            >
              {loginError}
            </div>
          )}
        </>
      );
    }

    // Unauthenticated user attempting any unrecognized or wrong route -> 404 error page
    return (
      <NotFoundPage
        user={null}
        currentPath={currentPath}
        onNavigate={(to) => navigate(to)}
      />
    );
  }

  // 4. Authenticated non-admin attempting to access any admin route -> Strict 403 Forbidden
  if (user.role !== "ADMIN" && isAdminRoute) {
    return (
      <AccessDeniedView
        user={user}
        onNavigateToPortal={() => navigate("/dashboard")}
        onLogout={handleGeneralLogout}
      />
    );
  }

  // 5. Authenticated Admin user
  if (user.role === "ADMIN") {
    if (isValidAdminPath(currentPath)) {
      return (
        <ProfileUpdateContext.Provider value={handleProfileUpdate}>
          <AdminPortal
            user={user}
            token={token}
            currentPath={currentPath}
            onNavigate={(path) => navigate(path)}
            onLogout={handleAdminLogout}
          />
        </ProfileUpdateContext.Provider>
      );
    }

    // Wrong route entered while logged in as Admin -> 404 error page
    return (
      <NotFoundPage
        user={user}
        currentPath={currentPath}
        onNavigate={(to) => navigate(to)}
      />
    );
  }

  // 6. Authenticated Student / Faculty user
  const isAcademicSubjectRoute =
    currentPath.startsWith("/faculty/academic") ||
    currentPath.startsWith("/hod/academic");

  // Prevent students from accessing faculty/HOD academic management routes
  if (user.role === "STUDENT" && isAcademicSubjectRoute) {
    return (
      <AccessDeniedView
        user={user}
        onNavigateToPortal={() => navigate("/dashboard")}
        onLogout={handleGeneralLogout}
      />
    );
  }

  // Prevent non-HOD faculty from accessing HOD department route
  if (user.role === "FACULTY" && currentPath.startsWith("/hod/academic") && !user.is_hod) {
    return (
      <AccessDeniedView
        user={user}
        onNavigateToPortal={() => navigate("/dashboard")}
        onLogout={handleGeneralLogout}
      />
    );
  }

  if (
    currentPath === "/dashboard" ||
    currentPath === "/" ||
    (user.role === "FACULTY" && isAcademicSubjectRoute)
  ) {
    return (
      <ProfileUpdateContext.Provider value={null}>
        <Dashboard user={user} token={token} onLogout={handleGeneralLogout} />
      </ProfileUpdateContext.Provider>
    );
  }

  // Wrong route entered while logged in as Student/Faculty -> 404 error page
  return (
    <NotFoundPage
      user={user}
      currentPath={currentPath}
      onNavigate={(to) => navigate(to)}
    />
  );
}

export function App() {
  return (
    <RouterProvider>
      <Suspense fallback={<LoadingSpinner message="Initializing workspace..." />}>
        <AppContent />
      </Suspense>
    </RouterProvider>
  );
}

export default App;
