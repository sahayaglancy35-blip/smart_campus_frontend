import { useState, useEffect } from "react";
import {
  fetchFacultyAttendanceSessions,
  startFacultyAttendanceSession,
  finalizeFacultyAttendanceSession,
  fetchFacultyAttendanceRoster,
  markFacultyAttendanceRecord,
  overrideFacultyAttendanceRecord,
} from "../../api/faculty";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  PlayIcon,
  StopIcon,
  EyeIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

export function FacultySessionsView({ token }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Roster inspection / marking modal
  const [selectedSession, setSelectedSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");

  // Override dialog
  const [overrideRecord, setOverrideRecord] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState("PRESENT");
  const [overrideReason, setOverrideReason] = useState("FACULTY_OVERRIDE");
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadSessions() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchFacultyAttendanceSessions(token, controller.signal);
        setSessions(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load class attendance sessions.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSessions();
    return () => controller.abort();
  }, [token, reloadTrigger]);

  const handleStartSession = async (session) => {
    try {
      setError("");
      setActionSuccess("");
      await startFacultyAttendanceSession(token, session.session_id);
      setActionSuccess(
        `Session #${session.session_id} started successfully. Session is now OPEN for attendance.`,
      );
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to start attendance session.");
    }
  };

  const handleFinalizeSession = async (session) => {
    if (!window.confirm("Are you sure you want to finalize and close this attendance session?")) {
      return;
    }

    try {
      setError("");
      setActionSuccess("");
      await finalizeFacultyAttendanceSession(token, session.session_id);
      setActionSuccess(
        `Session #${session.session_id} finalized and closed successfully.`,
      );
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to finalize attendance session.");
    }
  };

  const handleOpenRoster = async (session) => {
    setSelectedSession(session);
    setRoster([]);
    setRosterLoading(true);
    setRosterError("");

    try {
      const res = await fetchFacultyAttendanceRoster(token, session.session_id);
      setRoster(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setRosterError(err.message || "Failed to load student roster.");
    } finally {
      setRosterLoading(false);
    }
  };

  const handleMarkAttendance = async (enrollmentId, status) => {
    if (!selectedSession) return;

    try {
      setRosterError("");
      await markFacultyAttendanceRecord(token, selectedSession.session_id, {
        enrollment_id: enrollmentId,
        status,
      });

      // Update local roster record
      setRoster((prev) =>
        prev.map((item) =>
          item.enrollment_id === enrollmentId
            ? { ...item, status, source: "MANUAL", marked_at: new Date().toISOString() }
            : item,
        ),
      );
    } catch (err) {
      setRosterError(err.message || "Failed to mark attendance.");
    }
  };

  const handleOpenOverride = (record) => {
    setOverrideRecord(record);
    setOverrideStatus(record.status || "PRESENT");
    setOverrideReason("FACULTY_OVERRIDE");
    setOverrideNote("");
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!overrideRecord || !overrideRecord.attendance_id) return;

    try {
      setOverrideSubmitting(true);
      setRosterError("");
      await overrideFacultyAttendanceRecord(token, overrideRecord.attendance_id, {
        new_status: overrideStatus,
        reason_code: overrideReason,
        reason_note: overrideNote,
      });

      // Update local roster
      setRoster((prev) =>
        prev.map((item) =>
          item.attendance_id === overrideRecord.attendance_id
            ? { ...item, status: overrideStatus }
            : item,
        ),
      );
      setOverrideRecord(null);
    } catch (err) {
      setRosterError(err.message || "Failed to override attendance record.");
    } finally {
      setOverrideSubmitting(false);
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
      header: "Subject & Section",
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
      header: "Time Window",
      key: "time",
      render: (row) => (
        <div className="text-xs text-gray-600">
          {row.scheduled_start
            ? new Date(row.scheduled_start).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--"}{" "}
          -{" "}
          {row.scheduled_end
            ? new Date(row.scheduled_end).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--"}
        </div>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (row) => {
        const variant =
          row.status === "OPEN"
            ? "success"
            : row.status === "SCHEDULED"
            ? "warning"
            : "secondary";
        return <Badge variant={variant}>{row.status}</Badge>;
      },
    },
    {
      header: "Marked / Enrolled",
      key: "counts",
      render: (row) => (
        <div className="text-xs font-semibold text-gray-700">
          <span className="text-green-700 font-bold">{row.present_count || 0}</span> Present /{" "}
          <span className="text-red-700 font-bold">{row.absent_count || 0}</span> Absent
        </div>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.status === "SCHEDULED" && (
            <button
              type="button"
              onClick={() => handleStartSession(row)}
              className="inline-flex items-center gap-1 rounded-lg bg-green-800 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-green-900"
              title="Start Attendance Session"
            >
              <PlayIcon className="h-3.5 w-3.5" />
              Start
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenRoster(row)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50"
            title="Inspect Class Roster & Attendance"
          >
            <EyeIcon className="h-3.5 w-3.5 text-gray-500" />
            {row.status === "OPEN" ? "Mark" : "Roster"}
          </button>

          {row.status === "OPEN" && (
            <button
              type="button"
              onClick={() => handleFinalizeSession(row)}
              className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 shadow-xs hover:bg-red-100"
              title="Finalize & Close Session"
            >
              <StopIcon className="h-3.5 w-3.5" />
              Finalize
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {/* Sessions Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner message="Loading your class sessions..." />
          </div>
        ) : (
          <DataTable
            data={sessions}
            columns={columns}
            searchable
            searchPlaceholder="Search sessions by subject or section..."
            emptyMessage="No class attendance sessions assigned to your profile."
          />
        )}
      </div>

      {/* Roster Modal */}
      <Modal
        isOpen={Boolean(selectedSession)}
        onClose={() => setSelectedSession(null)}
        title={
          selectedSession
            ? `Class Roster — Session #${selectedSession.session_id} (${selectedSession.subject_code || ""})`
            : "Class Roster"
        }
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <p className="text-sm font-bold text-gray-900">
                {selectedSession?.subject_name || "Course Session"}
              </p>
              <p className="text-xs text-gray-500">
                Section: {selectedSession?.section_code || "A"} • Status:{" "}
                <strong className="text-green-800">{selectedSession?.status}</strong>
              </p>
            </div>
            <Badge
              variant={
                selectedSession?.status === "OPEN"
                  ? "success"
                  : selectedSession?.status === "SCHEDULED"
                  ? "warning"
                  : "secondary"
              }
            >
              {selectedSession?.status}
            </Badge>
          </div>

          {rosterError && <Alert type="error" message={rosterError} />}

          {rosterLoading ? (
            <LoadingSpinner message="Loading enrolled students..." />
          ) : roster.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No students enrolled in this section.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-200">
              {roster.map((student) => {
                const isMarked = Boolean(student.status);
                const isSessionOpen = selectedSession?.status === "OPEN";

                return (
                  <div
                    key={student.enrollment_id}
                    className="flex items-center justify-between p-3 transition hover:bg-gray-50"
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-gray-900">
                        {student.register_no}
                      </div>
                      <div className="text-sm font-semibold text-gray-800">
                        {student.full_name}
                      </div>
                      {student.marked_at && (
                        <div className="text-[10px] text-gray-400">
                          Marked: {new Date(student.marked_at).toLocaleTimeString()} ({student.source || "MANUAL"})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isMarked ? (
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              student.status === "PRESENT"
                                ? "success"
                                : student.status === "LATE"
                                ? "warning"
                                : "error"
                            }
                          >
                            {student.status}
                          </Badge>
                          {student.attendance_id && (
                            <button
                              type="button"
                              onClick={() => handleOpenOverride(student)}
                              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              title="Override Status"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ) : isSessionOpen ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(student.enrollment_id, "PRESENT")}
                            className="rounded-md bg-green-50 px-2 py-1 text-xs font-bold text-green-700 hover:bg-green-100"
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(student.enrollment_id, "LATE")}
                            className="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100"
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkAttendance(student.enrollment_id, "ABSENT")}
                            className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                          >
                            Absent
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs italic text-gray-400">Not Marked</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setSelectedSession(null)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Override Dialog */}
      <Modal
        isOpen={Boolean(overrideRecord)}
        onClose={() => setOverrideRecord(null)}
        title="Override Attendance Record"
        size="md"
      >
        <form onSubmit={handleSaveOverride} className="space-y-4">
          <p className="text-xs text-gray-500">
            Audited status correction for{" "}
            <strong>{overrideRecord?.full_name}</strong> ({overrideRecord?.register_no}).
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700">
              New Attendance Status
            </label>
            <select
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
            >
              <option value="PRESENT">PRESENT</option>
              <option value="LATE">LATE</option>
              <option value="ABSENT">ABSENT</option>
              <option value="EXCUSED">EXCUSED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">
              Correction Reason Code
            </label>
            <select
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
            >
              <option value="FACULTY_OVERRIDE">FACULTY_OVERRIDE</option>
              <option value="TRANSIT_DELAY">TRANSIT_DELAY</option>
              <option value="MEDICAL_EMERGENCY">MEDICAL_EMERGENCY</option>
              <option value="OFFICIAL_DUTY">OFFICIAL_DUTY</option>
              <option value="DEVICE_ERROR">DEVICE_ERROR</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">
              Audit Notes
            </label>
            <textarea
              rows={2}
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              placeholder="e.g. Student reported lab arrival delay"
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOverrideRecord(null)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={overrideSubmitting}
              className="rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {overrideSubmitting ? "Saving..." : "Save Correction"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default FacultySessionsView;
