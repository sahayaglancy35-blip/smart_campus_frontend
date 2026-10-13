import { useState, useEffect } from "react";
import {
  fetchFacultyAttendanceSessions,
  fetchFacultyAttendanceSummary,
  fetchFacultyAttendanceRoster,
} from "../../api/faculty";
import StatCard from "../common/StatCard";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  ClockIcon,
  CheckCircleIcon,
  ChartPieIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

export function FacultyAttendanceLogsView({ token }) {
  const [summary, setSummary] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  const [inspectingSession, setInspectingSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [sumRes, sessRes] = await Promise.all([
          fetchFacultyAttendanceSummary(token, controller.signal).catch(() => ({ data: null })),
          fetchFacultyAttendanceSessions(token, controller.signal),
        ]);

        setSummary(sumRes?.data || null);
        const allSessions = Array.isArray(sessRes?.data) ? sessRes.data : [];
        setSessions(allSessions.filter((s) => s.status === "CLOSED" || s.status === "OPEN"));
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load teaching attendance audit logs.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => controller.abort();
  }, [token]);

  const handleInspectSession = async (session) => {
    setInspectingSession(session);
    setRoster([]);
    setRosterLoading(true);

    try {
      const res = await fetchFacultyAttendanceRoster(token, session.session_id);
      setRoster(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load session roster:", err);
    } finally {
      setRosterLoading(false);
    }
  };

  const columns = [
    {
      header: "Session ID",
      key: "session_id",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-gray-900">
          #{row.session_id}
        </span>
      ),
    },
    {
      header: "Date",
      key: "session_date",
      render: (row) => (
        <span className="font-semibold text-gray-900">
          {row.session_date ? new Date(row.session_date).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      header: "Course & Section",
      key: "subject",
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">
            {row.subject_code ? `${row.subject_code} - ` : ""}
            {row.subject_name || "General Lecture"}
          </div>
          <div className="text-xs text-gray-500">
            Section: {row.section_code || "A"} • Room: {row.room_no || "—"}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (row) => (
        <Badge variant={row.status === "OPEN" ? "success" : "secondary"}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Present Count",
      key: "present_count",
      render: (row) => (
        <span className="font-bold text-green-700">
          {row.present_count || 0}
        </span>
      ),
    },
    {
      header: "Absent Count",
      key: "absent_count",
      render: (row) => (
        <span className="font-bold text-red-700">
          {row.absent_count || 0}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleInspectSession(row)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50"
        >
          <EyeIcon className="h-3.5 w-3.5 text-gray-400" />
          Roster Log
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {/* Summary Stats */}
      {summary?.overall && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Conducted Sessions"
            value={summary.overall.total_sessions || sessions.length}
            color="gray"
            icon={ClockIcon}
          />
          <StatCard
            label="Total Students Marked"
            value={summary.overall.total_records || 0}
            color="emerald"
            icon={ChartPieIcon}
          />
          <StatCard
            label="Present Attendance"
            value={summary.overall.present_count || 0}
            color="green"
            icon={CheckCircleIcon}
          />
          <StatCard
            label="Overall Attendance Rate"
            value={`${summary.overall.overall_attendance_percentage || 0}%`}
            color="blue"
            icon={ChartPieIcon}
          />
        </div>
      )}

      {/* Sessions Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner message="Loading historical attendance logs..." />
          </div>
        ) : (
          <DataTable
            data={sessions}
            columns={columns}
            searchable
            searchPlaceholder="Search audit logs by subject code or name..."
            emptyMessage="No historical attendance records found for your lectures."
          />
        )}
      </div>

      {/* Roster Inspection Modal */}
      <Modal
        isOpen={Boolean(inspectingSession)}
        onClose={() => setInspectingSession(null)}
        title={
          inspectingSession
            ? `Attendance Log — Session #${inspectingSession.session_id} (${inspectingSession.subject_code || ""})`
            : "Attendance Log"
        }
        size="lg"
      >
        <div className="space-y-4">
          <div className="border-b border-gray-100 pb-3 text-sm">
            <p className="font-bold text-gray-900">
              {inspectingSession?.subject_name}
            </p>
            <p className="text-xs text-gray-500">
              Date: {inspectingSession?.session_date ? new Date(inspectingSession.session_date).toLocaleDateString() : ""} • Section: {inspectingSession?.section_code} • Room: {inspectingSession?.room_no}
            </p>
          </div>

          {rosterLoading ? (
            <LoadingSpinner message="Loading attendance records..." />
          ) : roster.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No student records marked for this session.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-200">
              {roster.map((student) => (
                <div
                  key={student.enrollment_id}
                  className="flex items-center justify-between p-3 text-sm"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-gray-900">
                      {student.register_no}
                    </div>
                    <div className="font-semibold text-gray-800">
                      {student.full_name}
                    </div>
                  </div>
                  <Badge
                    variant={
                      student.status === "PRESENT"
                        ? "success"
                        : student.status === "LATE"
                        ? "warning"
                        : student.status === "ABSENT"
                        ? "error"
                        : "secondary"
                    }
                  >
                    {student.status || "UNMARKED"}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setInspectingSession(null)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default FacultyAttendanceLogsView;
