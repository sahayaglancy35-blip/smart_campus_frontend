import { useState, useEffect } from "react";
import { getAdminDashboardStats } from "../../api/admin";
import StatCard from "../common/StatCard";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  UserGroupIcon,
  IdentificationIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export function AdminDashboardOverview({ token, user, onNavigate }) {
  const [stats, setStats] = useState({
    studentsCount: 0,
    facultyCount: 0,
    departmentsCount: 0,
    blocksCount: 0,
    classroomsCount: 0,
    activeSessionsCount: 0,
  });
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function loadStats() {
      try {
        setLoading(true);
        setError("");

        const res = await getAdminDashboardStats(token, controller.signal);
        const data = res?.data || {};

        setStats({
          studentsCount: data.students_count || 0,
          facultyCount: data.faculty_count || 0,
          departmentsCount: data.departments_count || 0,
          blocksCount: data.blocks_count || 0,
          classroomsCount: data.classrooms_count || 0,
          activeSessionsCount: data.active_sessions_count || 0,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load administrative overview.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadStats();
    return () => controller.abort();
  }, [token]);

  const adminModules = [
    {
      key: "students",
      label: "Student Information Directory",
      description: "Manage student enrollments, profiles, and academic status",
      icon: UserGroupIcon,
      color: "from-green-700 to-emerald-900",
      count: `${stats.studentsCount} Registered`,
    },
    {
      key: "faculty",
      label: "Faculty & Staff Management",
      description: "Oversee faculty profiles, employee codes, and departments",
      icon: IdentificationIcon,
      color: "from-emerald-700 to-teal-900",
      count: `${stats.facultyCount} Members`,
    },
    {
      key: "departments",
      label: "Academic Departments",
      description: "Manage university schools, degree tracks, and department codes",
      icon: BuildingOffice2Icon,
      color: "from-teal-800 to-green-950",
      count: `${stats.departmentsCount} Departments`,
    },
    {
      key: "infrastructure",
      label: "Campus Blocks & Classrooms",
      description: "Configure campus facilities, lecture halls, and lab capacities",
      icon: BuildingStorefrontIcon,
      color: "from-green-800 to-emerald-950",
      count: `${stats.blocksCount} Blocks, ${stats.classroomsCount} Rooms`,
    },
    {
      key: "academics",
      label: "Academics & Timetable",
      description: "Subjects, course offerings, section mappings, and class schedules",
      icon: AcademicCapIcon,
      color: "from-blue-700 to-indigo-900",
      count: "Curriculum & Timetables",
    },
    {
      key: "sessions",
      label: "Attendance Session Control",
      description: "Create, initiate, monitor and finalize classroom attendance sessions",
      icon: ClipboardDocumentCheckIcon,
      color: "from-emerald-800 to-green-900",
      count: `${stats.activeSessionsCount} Active Sessions`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-950 via-green-900 to-emerald-900 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
            <ShieldCheckIcon className="h-3.5 w-3.5 text-green-300" />
            University Administration Console
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome, Administrator {user?.name || ""}
          </h2>
          <p className="mt-1 text-sm text-green-100 max-w-2xl">
            Real-time administrative control of Joy University ERP. Manage campus infrastructure,
            student registries, faculty designations, and institutional attendance operations.
          </p>
        </div>
      </div>

      {loading && <LoadingSpinner message="Aggregating campus statistics from MySQL..." />}
      {error && <Alert type="error" message={error} />}

      {/* Real-time Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Students" value={stats.studentsCount} color="green" icon={UserGroupIcon} />
        <StatCard label="Faculty" value={stats.facultyCount} color="emerald" icon={IdentificationIcon} />
        <StatCard label="Departments" value={stats.departmentsCount} color="blue" icon={BuildingOffice2Icon} />
        <StatCard label="Campus Blocks" value={stats.blocksCount} color="gray" icon={BuildingStorefrontIcon} />
        <StatCard label="Classrooms" value={stats.classroomsCount} color="gray" icon={AcademicCapIcon} />
        <StatCard label="Active Sessions" value={stats.activeSessionsCount} color="green" icon={ClipboardDocumentCheckIcon} />
      </div>

      {/* Module Navigation Grid */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Administrative ERP Modules
          </h3>
          <p className="text-xs text-gray-500">
            Select an operational module to view registries and perform CRUD workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminModules.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-green-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-sm transition group-hover:scale-105`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                      {item.count}
                    </span>
                  </div>

                  <h4 className="mt-4 text-base font-bold text-gray-900 group-hover:text-green-800">
                    {item.label}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs font-semibold text-green-700">
                  <span>Open Management Console</span>
                  <span className="transition group-hover:translate-x-1">&rarr;</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardOverview;
