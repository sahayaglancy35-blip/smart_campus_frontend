import { useState, useEffect } from "react";
import {
  fetchFacultyAttendanceSessions,
  createFacultyAttendanceSession,
  startFacultyAttendanceSession,
  finalizeFacultyAttendanceSession,
  fetchFacultyAttendanceRoster,
  markFacultyAttendanceRecord,
  updateFacultyAttendanceRecord,
  fetchFacultyTimetable,
} from "../../api/faculty";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import Modal from "../common/Modal";
import ConfirmDialog from "../common/ConfirmDialog";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import { deliveryStyleOf } from "../common/deliveryStyle";
import { DeliveryLegend } from "../common/DeliveryLegend";
import {
  PlayIcon,
  StopIcon,
  EyeIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
  const [rosterActionLoading, setRosterActionLoading] = useState(false);

  // Create Session modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignedSlots, setAssignedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    slot_id: "",
    session_date: getTodayDateString(),
    scheduled_start: "",
    scheduled_end: "",
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const existingOnDate = sessions.filter(
    (s) =>
      Number(s.slot_id) === Number(createForm.slot_id) &&
      s.session_date &&
      String(s.session_date).slice(0, 10) === String(createForm.session_date),
  );

  // Application Confirmation Modal State
  const [finalizeTarget, setFinalizeTarget] = useState(null);
  const [finalizeLoading, setFinalizeLoading] = useState(false);

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadSessions() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchFacultyAttendanceSessions(
          token,
          controller.signal,
        );
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

  const handleOpenCreateModal = async () => {
    setCreateModalOpen(true);
    setCreateError("");
    setSlotsLoading(true);

    try {
      const res = await fetchFacultyTimetable(token);
      const slots = Array.isArray(res?.data) ? res.data : [];
      setAssignedSlots(slots);

      if (slots.length > 0) {
        const first = slots[0];
        setCreateForm({
          slot_id: String(first.slot_id),
          session_date: getTodayDateString(),
          scheduled_start: first.start_time || "",
          scheduled_end: first.end_time || "",
        });
      } else {
        setCreateForm({
          slot_id: "",
          session_date: getTodayDateString(),
          scheduled_start: "",
          scheduled_end: "",
        });
      }
    } catch (err) {
      setCreateError(err.message || "Failed to load assigned timetable slots.");
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSlotSelect = (slotId) => {
    const selected = assignedSlots.find(
      (s) => String(s.slot_id) === String(slotId),
    );
    setCreateForm((prev) => ({
      ...prev,
      slot_id: slotId,
      scheduled_start: selected?.start_time || prev.scheduled_start,
      scheduled_end: selected?.end_time || prev.scheduled_end,
    }));
  };

  const handleCreateSessionSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.slot_id || !createForm.session_date) {
      setCreateError("Please select a timetable slot and session date.");
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError("");

      const payload = {
        slot_id: Number(createForm.slot_id),
        session_date: createForm.session_date,
      };
      if (createForm.scheduled_start)
        payload.scheduled_start = createForm.scheduled_start;
      if (createForm.scheduled_end)
        payload.scheduled_end = createForm.scheduled_end;

      await createFacultyAttendanceSession(token, payload);
      setActionSuccess("Class session created successfully.");
      setCreateModalOpen(false);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setCreateError(
        err.message || "Failed to create class attendance session.",
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

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

  const handleFinalizeSession = (session) => {
    setFinalizeTarget(session);
  };

  const executeFinalizeSession = async () => {
    if (!finalizeTarget) return;
    setFinalizeLoading(true);
    try {
      setError("");
      setActionSuccess("");
      await finalizeFacultyAttendanceSession(token, finalizeTarget.session_id);
      setActionSuccess(
        `Session #${finalizeTarget.session_id} finalized and closed successfully.`,
      );
      setFinalizeTarget(null);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to finalize attendance session.");
    } finally {
      setFinalizeLoading(false);
    }
  };

  const handleOpenRoster = async (session) => {
    setSelectedSession(session);
    setRoster([]);
    setRosterLoading(true);
    setRosterError("");

    try {
      const res = await fetchFacultyAttendanceRoster(token, session.session_id);
      const data =
        res?.data?.roster || (Array.isArray(res?.data) ? res.data : []);
      setRoster(data);
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
      setRosterActionLoading(true);
      const res = await markFacultyAttendanceRecord(
        token,
        selectedSession.session_id,
        {
          enrollment_id: enrollmentId,
          status,
        },
      );

      const newRecordId = res?.data?.attendance_id;

      // Update local roster record
      setRoster((prev) =>
        prev.map((item) =>
          item.enrollment_id === enrollmentId
            ? {
                ...item,
                status,
                attendance_status: status,
                attendance_id: newRecordId || item.attendance_id,
                source: "MANUAL",
                marked_at: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (err) {
      setRosterError(err.message || "Failed to mark attendance.");
    } finally {
      setRosterActionLoading(false);
    }
  };

  const handleUpdateAttendance = async (recordId, status) => {
    if (!selectedSession || !recordId) return;

    try {
      setRosterError("");
      setRosterActionLoading(true);
      await updateFacultyAttendanceRecord(
        token,
        selectedSession.session_id,
        recordId,
        {
          status,
        },
      );

      // Update local roster record
      setRoster((prev) =>
        prev.map((item) =>
          item.attendance_id === recordId
            ? {
                ...item,
                status,
                attendance_status: status,
                source: "MANUAL",
                marked_at: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (err) {
      setRosterError(err.message || "Failed to update attendance.");
    } finally {
      setRosterActionLoading(false);
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
          {row.session_date
            ? new Date(row.session_date).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      header: "Subject & Section",
      key: "subject",
      render: (row) => {
        const style = deliveryStyleOf(row);
        return (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {row.subject_code && (
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold ${style.code}`}
                >
                  {row.subject_code}
                </span>
              )}
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.chip}`}
              >
                {style.label}
              </span>
              <span className="font-bold text-gray-900">
                {row.subject_name || "General Lecture"}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              Section: {row.section_code || "A"} • Room: {row.room_no || "—"}
            </div>
          </div>
        );
      },
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
      render: (row) => <Badge status={row.status} />,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Faculty Class Sessions
          </h2>
          <p className="text-xs text-gray-500">
            Create, conduct, and manage attendance for your scheduled teaching
            lectures.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-green-800 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-green-900"
        >
          <PlusIcon className="h-4 w-4" />
          Create Class Session
        </button>
      </div>

      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && (
        <Alert type="error" message={error} onClose={() => setError("")} />
      )}

      {/* Theory / Lab color key */}
      <div className="flex justify-end">
        <DeliveryLegend />
      </div>

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

      {/* Create Session Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Class Attendance Session"
        size="md"
      >
        <form onSubmit={handleCreateSessionSubmit} className="space-y-4">
          <p className="text-xs text-gray-500">
            Schedule a new attendance session for one of your assigned timetable
            slots.
          </p>

          {createError && <Alert type="error" message={createError} />}

          {slotsLoading ? (
            <LoadingSpinner message="Loading your assigned timetable slots..." />
          ) : assignedSlots.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              No active timetable slots are currently assigned to your faculty
              profile.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Assigned Timetable Slot{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.slot_id}
                  onChange={(e) => handleSlotSelect(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
                  required
                >
                  {assignedSlots.map((slot) => (
                    <option key={slot.slot_id} value={slot.slot_id}>
                      {slot.subject_code ? `${slot.subject_code} - ` : ""}
                      {slot.subject_name || "Course"} (Sec{" "}
                      {slot.section_code || "A"}) •{" "}
                      {slot.room_no ? `Room ${slot.room_no}` : "Room TBA"} •{" "}
                      {slot.start_time?.slice(0, 5)} -{" "}
                      {slot.end_time?.slice(0, 5)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Session Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={createForm.session_date}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      session_date: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Scheduled Start
                  </label>
                  <input
                    type="time"
                    value={
                      createForm.scheduled_start
                        ? createForm.scheduled_start.slice(0, 5)
                        : ""
                    }
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        scheduled_start: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Scheduled End
                  </label>
                  <input
                    type="time"
                    value={
                      createForm.scheduled_end
                        ? createForm.scheduled_end.slice(0, 5)
                        : ""
                    }
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        scheduled_end: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
                  />
                </div>
              </div>

              {existingOnDate.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                  <p className="font-semibold">
                    Existing session(s) on {createForm.session_date} for this slot:
                  </p>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5 text-blue-800">
                    {existingOnDate.map((s) => (
                      <li key={s.session_id}>
                        Session #{s.session_id} •{" "}
                        {s.scheduled_start
                          ? new Date(s.scheduled_start).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}{" "}
                        -{" "}
                        {s.scheduled_end
                          ? new Date(s.scheduled_end).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}{" "}
                        <span className="font-medium">({s.status})</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[11px] text-blue-700">
                    To create an additional session on this date, specify a distinct start time above.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSubmitting || assignedSlots.length === 0}
              className="rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {createSubmitting ? "Creating..." : "Create Session"}
            </button>
          </div>
        </form>
      </Modal>

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
                <strong className="text-green-800">
                  {selectedSession?.status}
                </strong>
              </p>
            </div>
            <Badge status={selectedSession?.status} />
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
                const currentStatus =
                  student.status || student.attendance_status;
                const isMarked = Boolean(
                  currentStatus && currentStatus !== "UNMARKED",
                );
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
                          Marked:{" "}
                          {new Date(student.marked_at).toLocaleTimeString()} (
                          {student.source || "MANUAL"})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isSessionOpen ? (
                        <div className="flex items-center gap-1">
                          {["PRESENT", "LATE", "ABSENT"].map((st) => {
                            const isSelected = currentStatus === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                disabled={rosterActionLoading}
                                onClick={() => {
                                  if (isSelected) return;
                                  if (student.attendance_id) {
                                    handleUpdateAttendance(
                                      student.attendance_id,
                                      st,
                                    );
                                  } else {
                                    handleMarkAttendance(
                                      student.enrollment_id,
                                      st,
                                    );
                                  }
                                }}
                                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                                  isSelected
                                    ? st === "PRESENT"
                                      ? "bg-green-700 text-white shadow-xs"
                                      : st === "LATE"
                                        ? "bg-amber-600 text-white shadow-xs"
                                        : "bg-red-700 text-white shadow-xs"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {st.charAt(0) + st.slice(1).toLowerCase()}
                              </button>
                            );
                          })}
                        </div>
                      ) : isMarked ? (
                        <Badge status={currentStatus} />
                      ) : (
                        <span className="text-xs italic text-gray-400">
                          Unmarked
                        </span>
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

      {/* Finalize Session Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(finalizeTarget)}
        onClose={() => setFinalizeTarget(null)}
        onConfirm={executeFinalizeSession}
        title="Finalize Attendance Session"
        message="Are you sure you want to finalize and close this attendance session? Once finalized, the session will be marked as finalized and attendance records will be permanently locked."
        itemDetails={
          finalizeTarget
            ? [
                { label: "Session ID", value: `#${finalizeTarget.session_id}` },
                {
                  label: "Course",
                  value: `${finalizeTarget.subject_code} - ${finalizeTarget.subject_name}`,
                },
                {
                  label: "Date",
                  value: String(finalizeTarget.session_date).slice(0, 10),
                },
              ]
            : null
        }
        confirmText="Finalize Session"
        confirmVariant="danger"
        loading={finalizeLoading}
      />
    </div>
  );
}

export default FacultySessionsView;