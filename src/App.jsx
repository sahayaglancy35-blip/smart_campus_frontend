import { useState } from "react";
import LoginPage from "./components/LoginPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import Dashboard from "./components/Dashboard";

/* ================================================================
   APP
   Holds the two pieces of state every component needs:
   - view: which of the three components is showing
   - user: the logged-in user's profile, passed down to Dashboard
================================================================= */
function App() {
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);

  const handleLogin = ({ role, userId }) => {
    // TODO: replace with a real authentication call. `name`,
    // `department`, `email` and `gender` are placeholders until the
    // API returns them.
    setUser({
      name: role === "Student" ? "Aarav Kumar" : role === "Staff" ? "Priya Raman" : "Admin User",
      registerNo: userId || "—",
      department: role === "Student" ? "Computer Science" : null,
      email: role === "Student" ? "aarav.kumar@college.edu" : role === "Staff" ? "priya.raman@college.edu" : "admin@college.edu",
      role,
      gender: "male",
    });
    setView("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setView("login");
  };

  if (view === "login") {
    return <LoginPage onLogin={handleLogin} onForgotPassword={() => setView("forgot")} />;
  }

  if (view === "forgot") {
    return <ForgotPasswordPage onBack={() => setView("login")} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;