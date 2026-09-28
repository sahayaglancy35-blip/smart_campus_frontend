import { useState } from "react";
import LoginPage from "./components/LoginPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import Dashboard from "./components/Dashboard";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

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
      const response = await fetch("http://localhost:5000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: userId.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Login failed");
      }

      const expectedRoles = {
        Student: "STUDENT",
        Staff: "FACULTY",
        Admin: "ADMIN",
      };

      if (result.data.role !== expectedRoles[role]) {
        throw new Error("Please select the correct role for this account.");
      }

      setToken(result.token);

      let profile = result.data;

      if (role === "Student") {
        const profileResponse = await fetch(`${API_BASE_URL}/student/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${result.token}`,
          },
        });

        const profileResult = await profileResponse.json();

        if (!profileResponse.ok || !profileResult.success) {
          throw new Error(
            profileResult.message || "Unable to fetch student profile.",
          );
        }

        profile = {
          ...result.data,
          ...profileResult.data,
        };
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
        role,
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
            className="fixed bottom-5 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700 shadow-lg"
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
