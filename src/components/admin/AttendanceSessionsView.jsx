import { useState, useEffect } from "react";
import {
  getAttendanceSessions,
  createAttendanceSession,
  startAttendanceSession,
  finalizeAttendanceSession,
  getSessionAttendance,
  overrideAttendanceRecord,
} from "../../api/attendance";
import { getClassrooms, getFaculty } from "../../api/admin";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  PlusIcon,
  PlayIcon,
  StopIcon,
  EyeIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

export function AttendanceSessionsView({ token, user }) {
  const [sessions, setSessions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingRosterSession, setViewingRosterSession] = useState(null);
  const [rosterRecords, setRosterRecords] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [overridingRecord, setOverridingRecord] = useState(null);
  const [overrideForm, setOverrideForm] = useState({
    new_status: "PRESENT",
    reason_code: "FACULTY_OVERRIDE",
    reason_note: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [sessionForm, setSessionForm] = useState({
    slot_id: 1,
    session_date: new Date().toISOString().split("T")[0],
    faculty_id: 1,
    classroom_id: 1,
    scheduled_start: `${new Date().toISOString().split("T")[0]} 09:00:00`,
    scheduled_end: `${new Date().toISOString().split("T")[0]} 10:00:00`,
    present_until: `${new Date().toISOString().split("T")[0]} 09:15:00`,
    late_until: `${new Date().toISOString().split("T")[0]} 09:30:00`,
  });

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadData() {
      try {
        setError("");
        const [sessionsRes, roomsRes, facRes] = await Promise.all([
          getAttendanceSessions(token, controller.signal),
          getClassrooms(token, controller.signal).catch(() => ({ data: [] })),
          getFaculty(token, controller.signal).catch(() => ({ data: [] })),
        ]);

        setSessions(Array.isArray(sessionsRes?.data) ? sessionsRes.data : []);
        setClassrooms(Array.isArray(roomsRes?.data) ? roomsRes.data : []);
        setFacultyList(Array.isArray(facRes?.data) ? facRes.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load attendance sessions.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => controller.abort();
  }, [token, reloadTrigger]);

  const handleOpenCreate = () => {
    const today = new Date().toISOString().split("T")[0];
    setSessionForm({
      slot_id: 1,
      session_date: today,
      faculty_id: user?.facultyId || facultyList[0]?.faculty_id || 1,
      classroom_id: classrooms[0]?.classroom_id || 1,
      scheduled_start: `${today} 09:00:00`,
      scheduled_end: `${today} 10:00:00`,
      present_until: `${today} 09:15:00`,
      late_until: `${today} 09:30:00`,
    });
    setFormError("");
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      await createAttendanceSession(token, {
        ...sessionForm,
        slot_id: Number(sessionForm.slot_id),
        faculty_id: Number(sessionForm.faculty_id),
        classroom_id: Number(sessionForm.classroom_id),
      });

      setIsCreateOpen(false);
      setActionSuccess("Attendance session created successfully!");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to create attendance session.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      await startAttendanceSession(token, sessionId);
      setActionSuccess(`Session #${sessionId} opened for attendance recording!`);
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to start session.");
    }
  };

  const handleFinalizeSession = async (sessionId) => {
    try {
      await finalizeAttendanceSession(token, sessionId);
      setActionSuccess(`Session #${sessionId} finalized and closed.`);
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to finalize session.");
    }
  };

  const handleViewRoster = async (session) => {
    setViewingRosterSession(session);
    setRosterLoading(true);
    try {
      const res = await getSessionAttendance(token, session.session_id);
      setRosterRecords(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err.message || "Failed to load session roster.");
      setRosterRecords([]);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleOpenOverride = (record) => {
    setOverridingRecord(record);
    setOverrideForm({
      new_status: record.status === "PRESENT" ? "ABSENT" : "PRESENT",
      reason_code: "FACULTY_OVERRIDE",
      reason_note: "Manual administrative update",
    });
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overridingRecord) return;
    setSubmitting(true);

    try {
      await overrideAttendanceRecord(token, overridingRecord.attendance_id, overrideForm);
      setActionSuccess("Attendance record overridden successfully.");
      setOverridingRecord(null);

      // Refresh roster
      if (viewingRosterSession) {
        const res = await getSessionAttendance(token, viewingRosterSession.session_id);
        setRosterRecords(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (err) {
      setError(err.message || "Failed to override attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  const sessionColumns = [
    {
      header: "Session ID",
      key: "session_id",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-green-900 bg-green-50 px-2 py-0.5 rounded">
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
      header: "Scheduled Window",
      key: "scheduled_start",
      render: (row) => (
        <span className="text-xs text-gray-600">
          {row.scheduled_start ? new Date(row.scheduled_start).toLocaleTimeString() : "—"} –{" "}
          {row.scheduled_end ? new Date(row.scheduled_end).toLocaleTimeString() : "—"}
        </span>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: "Room & Faculty",
      key: "classroom_id",
      render: (row) => {
        const room = classrooms.find((c) => c.classroom_id === row.classroom_id);
        const fac = facultyList.find((f) => f.faculty_id === row.faculty_id);
        return (
          <div className="text-xs">
            <p className="font-semibold text-gray-800">
              {room ? `Room ${room.room_no}` : `Room #${row.classroom_id}`}
            </p>
            <p className="text-gray-500">{fac ? fac.full_name : `Faculty #${row.faculty_id}`}</p>
          </div>
        );
      },
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status === "SCHEDULED" && (
            <button
              type="button"
              onClick={() => handleStartSession(row.session_id)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 transition"
              title="Start / Open Session"
            >
              <PlayIcon className="h-3.5 w-3.5" /> Start
            </button>
          )}

          {row.status === "OPEN" && (
            <button
              type="button"
              onClick={() => handleFinalizeSession(row.session_id)}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-800 transition"
              title="Finalize & Close Session"
            >
              <StopIcon className="h-3.5 w-3.5" /> Close
            </button>
          )}

          <button
            type="button"
            onClick={() => handleViewRoster(row)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            title="View Attendance Roster"
          >
            <EyeIcon className="h-3.5 w-3.5 text-gray-500" /> Roster
          </button>
        </div>
      ),
    },
  ];

  const rosterColumns = [
    {
      header: "Enrollment ID",
      key: "enrollment_id",
      render: (row) => <span className="font-mono text-xs text-gray-700">#{row.enrollment_id}</span>,
    },
    {
      header: "Status",
      key: "status",
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: "Source",
      key: "source",
      render: (row) => (
        <span className="text-xs font-mono text-gray-500">{row.source || "SYSTEM"}</span>
      ),
    },
    {
      header: "Marked At",
      key: "marked_at",
      render: (row) => (
        <span className="text-xs text-gray-500">
          {row.marked_at ? new Date(row.marked_at).toLocaleTimeString() : "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenOverride(row)}
          className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs font-semibold text-green-800 hover:bg-green-50"
        >
          <PencilSquareIcon className="h-4 w-4" /> Override
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {loading ? (
        <LoadingSpinner message="Fetching attendance sessions..." />
      ) : (
        <DataTable
          columns={sessionColumns}
          data={sessions}
          searchPlaceholder="Search session by ID or date..."
          pageSize={10}
          emptyMessage="No attendance sessions scheduled."
          actions={
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
            >
              <PlusIcon className="h-4 w-4" />
              Create Class Session
            </button>
          }
        />
      )}

      {/* Create Session Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Attendance Session"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Timetable Slot ID <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={sessionForm.slot_id}
                onChange={(e) => setSessionForm({ ...sessionForm, slot_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Session Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={sessionForm.session_date}
                onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Assigned Faculty <span className="text-red-500">*</span>
              </label>
              <select
                value={sessionForm.faculty_id}
                onChange={(e) => setSessionForm({ ...sessionForm, faculty_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {facultyList.map((f) => (
                  <option key={f.faculty_id} value={f.faculty_id}>
                    {f.full_name} ({f.employee_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Classroom <span className="text-red-500">*</span>
              </label>
              <select
                value={sessionForm.classroom_id}
                onChange={(e) => setSessionForm({ ...sessionForm, classroom_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {classrooms.map((c) => (
                  <option key={c.classroom_id} value={c.classroom_id}>
                    Room {c.room_no} ({c.room_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Scheduled Start (YYYY-MM-DD HH:MM:SS)
              </label>
              <input
                type="text"
                required
                value={sessionForm.scheduled_start}
                onChange={(e) => setSessionForm({ ...sessionForm, scheduled_start: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Scheduled End (YYYY-MM-DD HH:MM:SS)
              </label>
              <input
                type="text"
                required
                value={sessionForm.scheduled_end}
                onChange={(e) => setSessionForm({ ...sessionForm, scheduled_end: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Session"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Session Roster Modal */}
      <Modal
        isOpen={Boolean(viewingRosterSession)}
        onClose={() => setViewingRosterSession(null)}
        title={`Session #${viewingRosterSession?.session_id} Attendance Roster`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-green-50 p-3 rounded-xl border border-green-200 text-xs">
            <div>
              <span className="font-semibold text-green-950">Status: </span>
              <Badge status={viewingRosterSession?.status} />
            </div>
            <div>
              <span className="font-semibold text-green-950">Date: </span>
              {viewingRosterSession?.session_date
                ? new Date(viewingRosterSession.session_date).toLocaleDateString()
                : "—"}
            </div>
          </div>

          {rosterLoading ? (
            <LoadingSpinner message="Fetching roster records..." />
          ) : (
            <DataTable
              columns={rosterColumns}
              data={rosterRecords}
              pageSize={6}
              emptyMessage="No student attendance records logged for this session yet."
            />
          )}

          <div className="flex justify-end pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setViewingRosterSession(null)}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Override Attendance Modal */}
      <Modal
        isOpen={Boolean(overridingRecord)}
        onClose={() => setOverridingRecord(null)}
        title="Override Attendance Record"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleOverrideSubmit} className="space-y-4">
          <p className="text-xs text-gray-500">
            Overriding record #{overridingRecord?.attendance_id} for enrollment #
            {overridingRecord?.enrollment_id}.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              New Status <span className="text-red-500">*</span>
            </label>
            <select
              value={overrideForm.new_status}
              onChange={(e) => setOverrideForm({ ...overrideForm, new_status: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value="PRESENT">PRESENT</option>
              <option value="LATE">LATE</option>
              <option value="ABSENT">ABSENT</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Reason Code
            </label>
            <select
              value={overrideForm.reason_code}
              onChange={(e) => setOverrideForm({ ...overrideForm, reason_code: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value="FACULTY_OVERRIDE">FACULTY_OVERRIDE</option>
              <option value="MEDICAL_LEAVE">MEDICAL_LEAVE</option>
              <option value="ON_DUTY_LEAVE">ON_DUTY_LEAVE</option>
              <option value="DATA_ENTRY_ERROR">DATA_ENTRY_ERROR</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Reason Note
            </label>
            <textarea
              rows={2}
              value={overrideForm.reason_note}
              onChange={(e) => setOverrideForm({ ...overrideForm, reason_note: e.target.value })}
              placeholder="e.g. Student presented medical certificate"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setOverridingRecord(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Save Override"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AttendanceSessionsView;
