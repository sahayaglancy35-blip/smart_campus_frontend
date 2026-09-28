import { useState } from "react";
import LoginPage from "./components/LoginPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import Dashboard from "./components/Dashboard";
import { loginUser } from "./api/auth";
import { fetchStudentProfile } from "./api/student";

const ROLE_MAP = {
  Student: "STUDENT",
  Staff: "FACULTY",
  Admin: "ADMIN",
};

function App() {
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async ({ role, userId, password }) => {
    setLoginError("");
    setLoading(true);

    try {
      const result = await loginUser(userId, password);

      if (!result.success) {
        throw new Error(result.message || "Login failed");
      }

      const expectedRole = ROLE_MAP[role] || role;

      if (result.data.role !== expectedRole) {
        throw new Error("Please select the correct role for this account.");
      }

      setToken(result.token);

      let profile = result.data;

      if (result.data.role === "STUDENT") {
        try {
          const profileResult = await fetchStudentProfile(result.token);
          if (profileResult.success && profileResult.data) {
            profile = {
              ...result.data,
              ...profileResult.data,
            };
          }
        } catch (profileErr) {
          console.warn("Could not fetch detailed student profile:", profileErr.message);
        }
      }

      setUser({
        name:
          profile.full_name ||
          profile.name ||
          profile.username ||
          result.data.username,
        registerNo:
          profile.register_no || profile.registerNo || result.data.username,
        department: profile.department_name || profile.department || null,
        email: profile.email || result.data.email,
        role: result.data.role, // Canonical role: "STUDENT", "FACULTY", "ADMIN"
        roleLabel: role,
        gender: profile.gender || "male",
        userId: result.data.user_id,
        studentId: result.data.student_id,
        facultyId: result.data.faculty_id,
      });

      setView("dashboard");
    } catch (error) {
      setLoginError(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setLoginError("");
    setView("login");
  };

  if (view === "login") {
    return (
      <>
        <LoginPage
          onLogin={handleLogin}
          onForgotPassword={() => setView("forgot")}
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

  if (view === "forgot") {
    return <ForgotPasswordPage onBack={() => setView("login")} />;
  }

  return <Dashboard user={user} token={token} onLogout={handleLogout} />;
}

export default App;
