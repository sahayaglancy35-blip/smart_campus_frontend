import { useState, useEffect, useCallback } from "react";
import {
  getAttendanceSessions,
  createAttendanceSession,
  startAttendanceSession,
  finalizeAttendanceSession,
  getSessionAttendance,
  overrideAttendanceRecord,
} from "../../api/attendance";
import { getClassrooms, getFaculty } from "../../api/admin";
import { getTimetableSlots } from "../../api/academics";
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

export function AttendanceSessionsView({ token, user, refreshTrigger = 0 }) {
  const [sessions, setSessions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingRosterSession, setViewingRosterSession] = useState(null);
  const [rosterRecords, setRosterRecords] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [rosterSuccess, setRosterSuccess] = useState("");

  const [overridingRecord, setOverridingRecord] = useState(null);
  const [overrideError, setOverrideError] = useState("");
  const [overrideForm, setOverrideForm] = useState({
    new_status: "PRESENT",
    reason_code: "FACULTY_OVERRIDE",
    reason_note: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [sessionForm, setSessionForm] = useState({
    slot_id: "",
    session_date: new Date().toISOString().split("T")[0],
    faculty_id: "",
    classroom_id: "",
    scheduled_start: `${new Date().toISOString().split("T")[0]} 09:00:00`,
    scheduled_end: `${new Date().toISOString().split("T")[0]} 10:00:00`,
    present_until: `${new Date().toISOString().split("T")[0]} 09:15:00`,
    late_until: `${new Date().toISOString().split("T")[0]} 09:30:00`,
  });

  const [reloadTrigger, setReloadTrigger] = useState(0);

  const handleCloseRoster = useCallback(() => {
    setViewingRosterSession(null);
    setRosterRecords([]);
    try {
      sessionStorage.removeItem("erp_active_roster_session_id");
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleViewRoster = useCallback(
    async (session) => {
      setViewingRosterSession(session);
      try {
        sessionStorage.setItem("erp_active_roster_session_id", String(session.session_id));
      } catch {
        // Ignore storage errors
      }
      setRosterLoading(true);
      setRosterError("");
      setRosterSuccess("");
      try {
        const res = await getSessionAttendance(token, session.session_id);
        const data =
          res?.data?.records ||
          res?.data?.roster ||
          (Array.isArray(res?.data) ? res.data : []);
        setRosterRecords(
          data.map((r) => ({
            ...r,
            status: r.attendance_status || r.status || "UNMARKED",
          }))
        );
      } catch (err) {
        setRosterError(err.message || "Failed to load session roster.");
        setRosterRecords([]);
      } finally {
        setRosterLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadData() {
      try {
        setError("");
        const [sessionsRes, roomsRes, facRes, slotsRes] = await Promise.all([
          getAttendanceSessions(token, controller.signal),
          getClassrooms(token, controller.signal).catch(() => ({ data: [] })),
          getFaculty(token, controller.signal).catch(() => ({ data: [] })),
          getTimetableSlots(token, null, controller.signal).catch(() => ({ data: [] })),
        ]);

        const fetchedSessions = Array.isArray(sessionsRes?.data) ? sessionsRes.data : [];
        setSessions(fetchedSessions);
        setClassrooms(Array.isArray(roomsRes?.data) ? roomsRes.data : []);
        setFacultyList(Array.isArray(facRes?.data) ? facRes.data : []);
        setTimetableSlots(Array.isArray(slotsRes?.data) ? slotsRes.data : []);

        // Restore active roster session if previously viewing
        try {
          const savedRosterId = sessionStorage.getItem("erp_active_roster_session_id");
          if (savedRosterId) {
            const matched = fetchedSessions.find((s) => String(s.session_id) === String(savedRosterId));
            if (matched) {
              handleViewRoster(matched);
            }
          }
        } catch {
          // Ignore storage errors
        }
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
  }, [token, reloadTrigger, refreshTrigger, handleViewRoster]);

  const handleSlotSelect = (slotId) => {
    const selectedSlot = timetableSlots.find((s) => String(s.slot_id) === String(slotId));
    if (!selectedSlot) {
      setSessionForm((prev) => ({ ...prev, slot_id: slotId }));
      return;
    }

    const sessionDate = sessionForm.session_date || new Date().toISOString().split("T")[0];
    const startTime = selectedSlot.start_time || "09:00:00";
    const endTime = selectedSlot.end_time || "10:00:00";

    const sStart = `${sessionDate} ${startTime.length === 5 ? `${startTime}:00` : startTime}`;
    const sEnd = `${sessionDate} ${endTime.length === 5 ? `${endTime}:00` : endTime}`;

    const startDateObj = new Date(sStart.replace(" ", "T"));
    let presentUntil = `${sessionDate} 09:15:00`;
    let lateUntil = `${sessionDate} 09:30:00`;
    if (!isNaN(startDateObj.getTime())) {
      const pDate = new Date(startDateObj.getTime() + 15 * 60 * 1000);
      const lDate = new Date(startDateObj.getTime() + 30 * 60 * 1000);
      const formatTime = (d) =>
        `${sessionDate} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
      presentUntil = formatTime(pDate);
      lateUntil = formatTime(lDate);
    }

    setSessionForm((prev) => ({
      ...prev,
      slot_id: slotId,
      faculty_id: selectedSlot.faculty_id || prev.faculty_id,
      classroom_id: selectedSlot.classroom_id || prev.classroom_id,
      scheduled_start: sStart,
      scheduled_end: sEnd,
      present_until: presentUntil,
      late_until: lateUntil,
    }));
  };

  const handleDateChange = (date) => {
    setSessionForm((prev) => {
      const startTime = prev.scheduled_start ? prev.scheduled_start.split(" ")[1] : "09:00:00";
      const endTime = prev.scheduled_end ? prev.scheduled_end.split(" ")[1] : "10:00:00";
      const presentTime = prev.present_until ? prev.present_until.split(" ")[1] : "09:15:00";
      const lateTime = prev.late_until ? prev.late_until.split(" ")[1] : "09:30:00";
      return {
        ...prev,
        session_date: date,
        scheduled_start: `${date} ${startTime}`,
        scheduled_end: `${date} ${endTime}`,
        present_until: `${date} ${presentTime}`,
        late_until: `${date} ${lateTime}`,
      };
    });
  };

  const handleOpenCreate = () => {
    const today = new Date().toISOString().split("T")[0];
    const initialSlot = timetableSlots[0];
    const startTime = initialSlot?.start_time || "09:00:00";
    const endTime = initialSlot?.end_time || "10:00:00";
    const sStart = `${today} ${startTime.length === 5 ? `${startTime}:00` : startTime}`;
    const sEnd = `${today} ${endTime.length === 5 ? `${endTime}:00` : endTime}`;

    setSessionForm({
      slot_id: initialSlot?.slot_id || "",
      session_date: today,
      faculty_id: initialSlot?.faculty_id || user?.facultyId || facultyList[0]?.faculty_id || "",
      classroom_id: initialSlot?.classroom_id || classrooms[0]?.classroom_id || "",
      scheduled_start: sStart,
      scheduled_end: sEnd,
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



  const handleOpenOverride = (record) => {
    const currentStatus = record.attendance_status || record.status || "UNMARKED";
    setOverridingRecord(record);
    setOverrideError("");
    setOverrideForm({
      new_status: currentStatus === "PRESENT" ? "ABSENT" : "PRESENT",
      reason_code: "FACULTY_OVERRIDE",
      reason_note: "",
    });
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overridingRecord) return;
    setOverrideError("");

    const currentStatus = overridingRecord.attendance_status || overridingRecord.status || "UNMARKED";
    if (overridingRecord.attendance_id && overrideForm.new_status === currentStatus) {
      setOverrideError(
        `Student is already marked as ${currentStatus}. Please choose a different status to override.`
      );
      return;
    }

    setSubmitting(true);

    try {
      await overrideAttendanceRecord(token, overridingRecord.attendance_id || 0, {
        ...overrideForm,
        session_id: viewingRosterSession.session_id,
        enrollment_id: overridingRecord.enrollment_id,
      });

      setRosterSuccess(
        `Attendance for ${overridingRecord.full_name || overridingRecord.register_no || "student"} updated to ${overrideForm.new_status}!`
      );
      setTimeout(() => setRosterSuccess(""), 4000);
      setOverridingRecord(null);

      // Refresh roster
      if (viewingRosterSession) {
        const res = await getSessionAttendance(token, viewingRosterSession.session_id);
        const data =
          res?.data?.records ||
          res?.data?.roster ||
          (Array.isArray(res?.data) ? res.data : []);
        setRosterRecords(
          data.map((r) => ({
            ...r,
            status: r.attendance_status || r.status || "UNMARKED",
          }))
        );
      }
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setOverrideError(err.message || "Failed to override attendance.");
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
      header: "Student",
      key: "register_no",
      render: (row) => (
        <div>
          <div className="font-mono text-xs font-bold text-gray-900">
            {row.register_no || `ID #${row.student_id || row.enrollment_id}`}
          </div>
          <div className="text-xs text-gray-600 font-medium">{row.full_name || "—"}</div>
        </div>
      ),
    },
    {
      header: "Enrollment ID",
      key: "enrollment_id",
      render: (row) => <span className="font-mono text-xs text-gray-500">#{row.enrollment_id}</span>,
    },
    {
      header: "Status",
      key: "status",
      render: (row) => <Badge status={row.attendance_status || row.status || "UNMARKED"} />,
    },
    {
      header: "Source",
      key: "source",
      render: (row) => (
        <span className="text-xs font-mono text-gray-500">{row.source || "—"}</span>
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
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 transition"
          title="Override or update attendance status"
        >
          <PencilSquareIcon className="h-3.5 w-3.5" />
          {row.attendance_id ? "Override" : "Mark"}
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
          key="attendance-sessions-main-table"
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

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Timetable Slot <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={sessionForm.slot_id}
              onChange={(e) => handleSlotSelect(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value="">Select Scheduled Timetable Slot</option>
              {timetableSlots.map((s) => {
                const dayNames = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                const dayLabel = dayNames[s.day_of_week] || `Day ${s.day_of_week}`;
                const subject = s.subject_code ? `${s.subject_code}` : `Offering #${s.offering_id || s.section_id}`;
                const section = s.section_code ? ` (Sec ${s.section_code})` : "";
                const time = s.start_time ? ` | ${s.start_time.slice(0, 5)}-${s.end_time?.slice(0, 5)}` : "";
                const room = s.room_no ? ` | Rm ${s.room_no}` : "";
                const faculty = s.faculty_name ? ` | ${s.faculty_name}` : "";
                return (
                  <option key={s.slot_id} value={s.slot_id}>
                    #{s.slot_id} — {subject}{section} [{dayLabel}{time}{room}{faculty}]
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Session Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={sessionForm.session_date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
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
        onClose={handleCloseRoster}
        title={`Session #${viewingRosterSession?.session_id} Attendance Roster`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-green-50 p-3 rounded-xl border border-green-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-950">Status: </span>
              <Badge status={viewingRosterSession?.status} />
            </div>
            <div>
              <span className="font-semibold text-green-950">Date: </span>
              {viewingRosterSession?.session_date
                ? String(viewingRosterSession.session_date).slice(0, 10)
                : "—"}
            </div>
            <div>
              <span className="font-semibold text-green-950">Slot ID: </span>
              #{viewingRosterSession?.slot_id || "—"}
            </div>
          </div>

          {rosterSuccess && <Alert type="success" message={rosterSuccess} />}
          {rosterError && <Alert type="error" message={rosterError} />}

          {rosterLoading ? (
            <LoadingSpinner message="Fetching roster records..." />
          ) : (
            <DataTable
              key={`roster-table-${viewingRosterSession?.session_id || "modal"}`}
              columns={rosterColumns}
              data={rosterRecords}
              pageSize={8}
              emptyMessage="No student attendance records found for this session."
            />
          )}

          <div className="flex justify-end pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCloseRoster}
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
        title={overridingRecord?.attendance_id ? "Override Attendance Record" : "Mark Student Attendance"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleOverrideSubmit} className="space-y-4">
          <div className="rounded-xl bg-gray-50 p-3 border border-gray-200 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900 text-sm">{overridingRecord?.full_name || "Student"}</span>
              <Badge status={overridingRecord?.attendance_status || overridingRecord?.status || "UNMARKED"} />
            </div>
            <div className="text-gray-500 font-mono">
              Roll: {overridingRecord?.register_no || "—"} • Enrollment #{overridingRecord?.enrollment_id}
              {overridingRecord?.attendance_id ? ` • Record #${overridingRecord.attendance_id}` : " • Not marked yet"}
            </div>
          </div>

          {overrideError && <Alert type="error" message={overrideError} />}

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
              Reason Code <span className="text-red-500">*</span>
            </label>
            <select
              value={overrideForm.reason_code}
              onChange={(e) => setOverrideForm({ ...overrideForm, reason_code: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value="FACULTY_OVERRIDE">FACULTY_OVERRIDE (Faculty Request)</option>
              <option value="MEDICAL_LEAVE">MEDICAL_LEAVE (Medical Leave)</option>
              <option value="ON_DUTY_LEAVE">ON_DUTY_LEAVE (On Duty / Official Event)</option>
              <option value="DEVICE_FAILURE">DEVICE_FAILURE (Scanner / Biometric Failure)</option>
              <option value="DATA_ENTRY_ERROR">DATA_ENTRY_ERROR (Data Entry Error)</option>
              <option value="OTHER">OTHER (Other / Administrative)</option>
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
              {submitting ? "Saving..." : overridingRecord?.attendance_id ? "Save Override" : "Mark Attendance"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AttendanceSessionsView;
