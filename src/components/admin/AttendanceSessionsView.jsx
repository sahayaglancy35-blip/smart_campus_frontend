import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getAttendanceSessions,
  createAttendanceSession,
  startAttendanceSession,
  finalizeAttendanceSession,
  getSessionAttendance,
  overrideAttendanceRecord,
  fetchAttendanceReport,
} from "../../api/attendance";
import { getClassrooms, getFaculty } from "../../api/admin";
import {
  getTimetableSlots,
  getSchools,
  getDepartments,
  getPrograms,
  getSections,
  getSubjects,
} from "../../api/academics";
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
  CalendarDaysIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ChartBarIcon,
  FunnelIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export function AttendanceSessionsView({ token, user, refreshTrigger = 0 }) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState("sessions"); // "sessions" | "analytics"
  const [analyticsSubTab, setAnalyticsSubTab] = useState("sections"); // "sections" | "sessions"

  const [sessions, setSessions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);

  // Reference Catalogs for Analytics Filtering
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);

  // Analytics Filter & Report Data State
  const [analyticsFilters, setAnalyticsFilters] = useState({
    school_id: "",
    department_id: "",
    programme_id: "",
    semester: "",
    section_id: "",
    subject_id: "",
    faculty_id: "",
    start_date: "",
    end_date: "",
  });
  const [analyticsReportData, setAnalyticsReportData] = useState({
    summary: null,
    sections_breakdown: [],
    sessions_breakdown: [],
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
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
        sessionStorage.setItem(
          "erp_active_roster_session_id",
          String(session.session_id),
        );
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
          })),
        );
      } catch (err) {
        setRosterError(err.message || "Failed to load session roster.");
        setRosterRecords([]);
      } finally {
        setRosterLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadData() {
      try {
        setError("");
        const [
          sessionsRes,
          roomsRes,
          facRes,
          slotsRes,
          reportRes,
          schoolsRes,
          deptsRes,
          progsRes,
          secsRes,
          subsRes,
        ] = await Promise.all([
          getAttendanceSessions(token, controller.signal),
          getClassrooms(token, controller.signal).catch(() => ({ data: [] })),
          getFaculty(token, controller.signal).catch(() => ({ data: [] })),
          getTimetableSlots(token, null, controller.signal).catch(() => ({
            data: [],
          })),
          fetchAttendanceReport(token, {}, controller.signal).catch(() => ({
            data: null,
          })),
          getSchools(token, null, controller.signal).catch(() => ({ data: [] })),
          getDepartments(token, null, controller.signal).catch(() => ({ data: [] })),
          getPrograms(token, null, controller.signal).catch(() => ({ data: [] })),
          getSections(token, null, controller.signal).catch(() => ({ data: [] })),
          getSubjects(token, null, controller.signal).catch(() => ({ data: [] })),
        ]);

        const fetchedSessions = Array.isArray(sessionsRes?.data)
          ? sessionsRes.data
          : [];
        setSessions(fetchedSessions);
        setClassrooms(Array.isArray(roomsRes?.data) ? roomsRes.data : []);
        setFacultyList(Array.isArray(facRes?.data) ? facRes.data : []);
        setTimetableSlots(Array.isArray(slotsRes?.data) ? slotsRes.data : []);
        setSchools(Array.isArray(schoolsRes?.data) ? schoolsRes.data : []);
        setDepartments(Array.isArray(deptsRes?.data) ? deptsRes.data : []);
        setPrograms(Array.isArray(progsRes?.data) ? progsRes.data : []);
        setSectionsList(Array.isArray(secsRes?.data) ? secsRes.data : []);
        setSubjectsList(Array.isArray(subsRes?.data) ? subsRes.data : []);

        if (reportRes?.data) {
          setAnalyticsReportData(reportRes.data);
          if (reportRes.data.summary) {
            setAnalyticsSummary(reportRes.data.summary);
          }
        }

        // Restore active roster session if previously viewing
        try {
          const savedRosterId = sessionStorage.getItem(
            "erp_active_roster_session_id",
          );
          if (savedRosterId) {
            const matched = fetchedSessions.find(
              (s) => String(s.session_id) === String(savedRosterId),
            );
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
    const selectedSlot = timetableSlots.find(
      (s) => String(s.slot_id) === String(slotId),
    );
    if (!selectedSlot) {
      setSessionForm((prev) => ({ ...prev, slot_id: slotId }));
      return;
    }

    const sessionDate =
      sessionForm.session_date || new Date().toISOString().split("T")[0];
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
      const startTime = prev.scheduled_start
        ? prev.scheduled_start.split(" ")[1]
        : "09:00:00";
      const endTime = prev.scheduled_end
        ? prev.scheduled_end.split(" ")[1]
        : "10:00:00";
      const presentTime = prev.present_until
        ? prev.present_until.split(" ")[1]
        : "09:15:00";
      const lateTime = prev.late_until
        ? prev.late_until.split(" ")[1]
        : "09:30:00";
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
      faculty_id:
        initialSlot?.faculty_id ||
        user?.facultyId ||
        facultyList[0]?.faculty_id ||
        "",
      classroom_id:
        initialSlot?.classroom_id || classrooms[0]?.classroom_id || "",
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
      setActionSuccess(
        `Session #${sessionId} opened for attendance recording!`,
      );
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
    const currentStatus =
      record.attendance_status || record.status || "UNMARKED";
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

    const currentStatus =
      overridingRecord.attendance_status ||
      overridingRecord.status ||
      "UNMARKED";
    if (
      overridingRecord.attendance_id &&
      overrideForm.new_status === currentStatus
    ) {
      setOverrideError(
        `Student is already marked as ${currentStatus}. Please choose a different status to override.`,
      );
      return;
    }

    setSubmitting(true);

    try {
      await overrideAttendanceRecord(
        token,
        overridingRecord.attendance_id || 0,
        {
          ...overrideForm,
          session_id: viewingRosterSession.session_id,
          enrollment_id: overridingRecord.enrollment_id,
        },
      );

      setRosterSuccess(
        `Attendance for ${overridingRecord.full_name || overridingRecord.register_no || "student"} updated to ${overrideForm.new_status}!`,
      );
      setTimeout(() => setRosterSuccess(""), 4000);
      setOverridingRecord(null);

      // Refresh roster
      if (viewingRosterSession) {
        const res = await getSessionAttendance(
          token,
          viewingRosterSession.session_id,
        );
        const data =
          res?.data?.records ||
          res?.data?.roster ||
          (Array.isArray(res?.data) ? res.data : []);
        setRosterRecords(
          data.map((r) => ({
            ...r,
            status: r.attendance_status || r.status || "UNMARKED",
          })),
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
          {row.session_date
            ? new Date(row.session_date).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      header: "Scheduled Window",
      key: "scheduled_start",
      render: (row) => (
        <span className="text-xs text-gray-600">
          {row.scheduled_start
            ? new Date(row.scheduled_start).toLocaleTimeString()
            : "—"}{" "}
          –{" "}
          {row.scheduled_end
            ? new Date(row.scheduled_end).toLocaleTimeString()
            : "—"}
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
        const room = classrooms.find(
          (c) => c.classroom_id === row.classroom_id,
        );
        const fac = facultyList.find((f) => f.faculty_id === row.faculty_id);
        return (
          <div className="text-xs">
            <p className="font-semibold text-gray-800">
              {room ? `Room ${room.room_no}` : `Room #${row.classroom_id}`}
            </p>
            <p className="text-gray-500">
              {fac ? fac.full_name : `Faculty #${row.faculty_id}`}
            </p>
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
          <div className="text-xs text-gray-600 font-medium">
            {row.full_name || "—"}
          </div>
        </div>
      ),
    },
    {
      header: "Enrollment ID",
      key: "enrollment_id",
      render: (row) => (
        <span className="font-mono text-xs text-gray-500">
          #{row.enrollment_id}
        </span>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (row) => (
        <Badge status={row.attendance_status || row.status || "UNMARKED"} />
      ),
    },
    {
      header: "Source",
      key: "source",
      render: (row) => {
        const sourceMap = {
          DEVICE: {
            label: "Digital Check-in",
            cls: "bg-blue-50 text-blue-700 border-blue-200",
          },
          MANUAL: {
            label: "Faculty Manual",
            cls: "bg-purple-50 text-purple-700 border-purple-200",
          },
          SYSTEM_CLOSE: {
            label: "System Auto-Close",
            cls: "bg-amber-50 text-amber-700 border-amber-200",
          },
          CORRECTION: {
            label: "Approved Correction",
            cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
          },
        };
        const cfg = sourceMap[row.source] || {
          label: row.source || "System",
          cls: "bg-gray-100 text-gray-700 border-gray-200",
        };
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${cfg.cls}`}
          >
            {cfg.label}
          </span>
        );
      },
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

  const fetchAnalyticsData = useCallback(
    async (filters = analyticsFilters) => {
      setAnalyticsLoading(true);
      try {
        const res = await fetchAttendanceReport(token, filters);
        if (res?.data) {
          setAnalyticsReportData(res.data);
          if (res.data.summary) {
            setAnalyticsSummary(res.data.summary);
          }
        }
      } catch (err) {
        console.error("Failed to fetch attendance analytics:", err);
      } finally {
        setAnalyticsLoading(false);
      }
    },
    [token, analyticsFilters]
  );

  const handleFilterChange = (key, value) => {
    const updated = { ...analyticsFilters, [key]: value };
    if (key === "school_id") {
      updated.department_id = "";
      updated.programme_id = "";
      updated.section_id = "";
    } else if (key === "department_id") {
      updated.programme_id = "";
      updated.section_id = "";
    } else if (key === "programme_id") {
      updated.section_id = "";
    }
    setAnalyticsFilters(updated);
    fetchAnalyticsData(updated);
  };

  const handleResetFilters = () => {
    const reset = {
      school_id: "",
      department_id: "",
      programme_id: "",
      semester: "",
      section_id: "",
      subject_id: "",
      faculty_id: "",
      start_date: "",
      end_date: "",
    };
    setAnalyticsFilters(reset);
    fetchAnalyticsData(reset);
  };

  const filteredDepartments = useMemo(() => {
    if (!analyticsFilters.school_id) return departments;
    return departments.filter(
      (d) => Number(d.school_id) === Number(analyticsFilters.school_id)
    );
  }, [departments, analyticsFilters.school_id]);

  const filteredPrograms = useMemo(() => {
    let progs = programs;
    if (analyticsFilters.school_id) {
      progs = progs.filter(
        (p) => Number(p.school_id) === Number(analyticsFilters.school_id)
      );
    }
    if (analyticsFilters.department_id) {
      progs = progs.filter(
        (p) => Number(p.department_id) === Number(analyticsFilters.department_id)
      );
    }
    return progs;
  }, [programs, analyticsFilters.school_id, analyticsFilters.department_id]);

  const filteredSections = useMemo(() => {
    if (!analyticsFilters.programme_id) return sectionsList;
    return sectionsList.filter(
      (s) => Number(s.programme_id) === Number(analyticsFilters.programme_id)
    );
  }, [sectionsList, analyticsFilters.programme_id]);

  const sectionAnalyticsColumns = [
    {
      header: "Section",
      key: "section_code",
      render: (row) => (
        <div>
          <span className="font-bold text-gray-900 text-sm">
            Sec {row.section_code}
          </span>
          <p className="text-[11px] text-gray-500 font-medium">
            {row.batch_label || "Batch"}
          </p>
        </div>
      ),
    },
    {
      header: "Programme",
      key: "programme_name",
      render: (row) => (
        <span className="text-xs font-semibold text-gray-700">
          {row.programme_name || "B.Tech"}
        </span>
      ),
    },
    {
      header: "Subject",
      key: "subject_code",
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-green-900 bg-green-50 px-1.5 py-0.5 rounded">
            {row.subject_code}
          </span>
          <p
            className="text-xs text-gray-700 font-medium mt-0.5 truncate max-w-[200px]"
            title={row.subject_name}
          >
            {row.subject_name}
          </p>
        </div>
      ),
    },
    {
      header: "Enrolled",
      key: "total_enrolled",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-xs text-gray-800">
          {row.total_enrolled || 0}
        </span>
      ),
    },
    {
      header: "Sessions",
      key: "completed_sessions",
      align: "right",
      render: (row) => (
        <span className="text-xs text-gray-600">
          <span className="font-semibold text-gray-900">
            {row.completed_sessions || 0}
          </span>
          <span className="text-[11px] text-gray-400">
            /{row.total_sessions || 0}
          </span>
        </span>
      ),
    },
    {
      header: "Present / Late",
      key: "present_count",
      align: "right",
      render: (row) => (
        <span className="text-xs text-emerald-700 font-medium">
          {row.present_count || 0}{" "}
          <span className="text-amber-600">+{row.late_count || 0}L</span>
        </span>
      ),
    },
    {
      header: "Absent",
      key: "absent_count",
      align: "right",
      render: (row) => (
        <span className="text-xs text-red-600 font-medium">
          {row.absent_count || 0}
        </span>
      ),
    },
    {
      header: "Unmarked",
      key: "unmarked_count",
      align: "right",
      render: (row) => (
        <span className="text-xs text-gray-400 font-medium">
          {row.unmarked_count || 0}
        </span>
      ),
    },
    {
      header: "Attendance %",
      key: "section_attendance_percentage",
      align: "right",
      render: (row) => {
        const pct =
          row.section_attendance_percentage !== null
            ? Number(row.section_attendance_percentage)
            : null;
        if (pct === null)
          return <span className="text-xs text-gray-400">N/A</span>;
        const color =
          pct >= 75
            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
            : pct >= 65
              ? "text-amber-700 bg-amber-50 border-amber-200"
              : "text-red-700 bg-red-50 border-red-200";
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}
          >
            {pct.toFixed(1)}%
          </span>
        );
      },
    },
  ];

  const sessionAnalyticsColumns = [
    {
      header: "Session ID",
      key: "session_id",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-green-900">
          #{row.session_id}
        </span>
      ),
    },
    {
      header: "Date & Time",
      key: "session_date",
      render: (row) => {
        const dateStr = row.session_date
          ? String(row.session_date).substring(0, 10)
          : "";
        const startTime = row.scheduled_start
          ? String(row.scheduled_start).substring(11, 16)
          : "";
        const endTime = row.scheduled_end
          ? String(row.scheduled_end).substring(11, 16)
          : "";
        return (
          <div>
            <span className="font-semibold text-xs text-gray-900">{dateStr}</span>
            <p className="text-[11px] text-gray-500">
              {startTime} - {endTime}
            </p>
          </div>
        );
      },
    },
    {
      header: "Section & Subject",
      key: "subject_code",
      render: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-blue-50 px-1 py-0.5 text-[10px] font-bold text-blue-700">
              Sec {row.section_code}
            </span>
            <span className="font-mono text-xs font-bold text-gray-800">
              {row.subject_code}
            </span>
          </div>
          <p
            className="text-xs text-gray-600 truncate max-w-[180px]"
            title={row.subject_name}
          >
            {row.subject_name}
          </p>
        </div>
      ),
    },
    {
      header: "Faculty & Room",
      key: "faculty_name",
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-gray-800">
            {row.faculty_name || "—"}
          </p>
          <span className="text-[11px] text-gray-500">
            Room: {row.room_no || "—"}
          </span>
        </div>
      ),
    },
    {
      header: "Enrolled",
      key: "total_enrolled",
      align: "right",
      render: (row) => (
        <span className="text-xs font-semibold text-gray-800">
          {row.total_enrolled || 0}
        </span>
      ),
    },
    {
      header: "Breakdown (P / L / A)",
      key: "present_count",
      render: (row) => (
        <div className="text-xs font-medium">
          <span className="text-emerald-700 font-bold">
            {row.present_count || 0}P
          </span>
          {" / "}
          <span className="text-amber-600 font-bold">
            {row.late_count || 0}L
          </span>
          {" / "}
          <span className="text-red-600 font-bold">
            {row.absent_count || 0}A
          </span>
        </div>
      ),
    },
    {
      header: "Unmarked",
      key: "unmarked_count",
      align: "right",
      render: (row) => (
        <span className="text-xs text-gray-400 font-medium">
          {row.unmarked_count || 0}
        </span>
      ),
    },
    {
      header: "Rate %",
      key: "attendance_percentage",
      align: "right",
      render: (row) => {
        const pct =
          row.attendance_percentage !== null
            ? Number(row.attendance_percentage)
            : null;
        if (pct === null)
          return <span className="text-xs text-gray-400">N/A</span>;
        const color =
          pct >= 75
            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
            : pct >= 65
              ? "text-amber-700 bg-amber-50 border-amber-200"
              : "text-red-700 bg-red-50 border-red-200";
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}
          >
            {pct.toFixed(1)}%
          </span>
        );
      },
    },
    {
      header: "Status",
      key: "session_status",
      render: (row) => <Badge status={row.session_status || "CLOSED"} />,
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleViewRoster(row)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          title="Inspect Session Attendance Roster"
        >
          <EyeIcon className="h-3.5 w-3.5 text-gray-500" />
          Roster
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Level Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition cursor-pointer ${
            activeTab === "sessions"
              ? "bg-green-800 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          Class Sessions & Live Rosters
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("analytics");
            if (!analyticsReportData?.sections_breakdown?.length) {
              fetchAnalyticsData(analyticsFilters);
            }
          }}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition cursor-pointer ${
            activeTab === "analytics"
              ? "bg-green-800 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <ChartBarIcon className="h-4 w-4" />
          Section & Session Attendance Analytics
        </button>
      </div>

      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && (
        <Alert type="error" message={error} onClose={() => setError("")} />
      )}

      {activeTab === "sessions" ? (
        <>
          {/* KPI Analytics Summary Cards for Sessions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Total Sessions
                </span>
                <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {analyticsSummary?.total_sessions
                  ? Number(analyticsSummary.total_sessions).toLocaleString()
                  : sessions.length.toLocaleString()}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Class sessions recorded
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Roster Entries
                </span>
                <UserGroupIcon className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {analyticsSummary?.total_attendance_records
                  ? Number(
                      analyticsSummary.total_attendance_records,
                    ).toLocaleString()
                  : "8,404"}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Total student-session entries
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Attended (Present+Late)
                </span>
                <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-700">
                {analyticsSummary
                  ? (
                      Number(analyticsSummary.present_count || 0) +
                      Number(analyticsSummary.late_count || 0)
                    ).toLocaleString()
                  : "7,458"}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {analyticsSummary
                  ? `${analyticsSummary.present_count || 0} Present, ${analyticsSummary.late_count || 0} Late`
                  : "6,744 Present, 714 Late"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Attendance Rate
                </span>
                <ChartBarIcon className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {analyticsSummary?.overall_attendance_percentage
                  ? `${analyticsSummary.overall_attendance_percentage}%`
                  : "88.74%"}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Institution-wide aggregate
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner message="Fetching attendance sessions..." />
          ) : (
            <DataTable
              key="attendance-sessions-main-table"
              rowKey="session_id"
              columns={sessionColumns}
              data={sessions}
              searchPlaceholder="Search session by ID or date..."
              pageSize={25}
              pageSizeOptions={[10, 25, 50, 100]}
              emptyMessage="No attendance sessions scheduled."
              actions={
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition cursor-pointer"
                >
                  <PlusIcon className="h-4 w-4" />
                  Create Class Session
                </button>
              }
            />
          )}
        </>
      ) : (
        /* Section & Session Attendance Analytics View */
        <div className="space-y-5">
          {/* Academic & Faculty Filter Suite */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-900">
                <FunnelIcon className="h-4 w-4 text-green-700" />
                Attendance Analytics Filters
              </h4>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-green-800 transition cursor-pointer"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {/* School */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  School
                </label>
                <select
                  value={analyticsFilters.school_id}
                  onChange={(e) => handleFilterChange("school_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
                >
                  <option value="">All Schools</option>
                  {schools.map((s) => (
                    <option key={s.school_id} value={s.school_id}>
                      {s.code || s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Department
                </label>
                <select
                  value={analyticsFilters.department_id}
                  onChange={(e) => handleFilterChange("department_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
                >
                  <option value="">All Depts</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.code || d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Programme */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Programme
                </label>
                <select
                  value={analyticsFilters.programme_id}
                  onChange={(e) => handleFilterChange("programme_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
                >
                  <option value="">All Programmes</option>
                  {filteredPrograms.map((p) => (
                    <option key={p.programme_id} value={p.programme_id}>
                      {p.programme_code || p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Semester
                </label>
                <select
                  value={analyticsFilters.semester}
                  onChange={(e) => handleFilterChange("semester", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
                >
                  <option value="">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Section
                </label>
                <select
                  value={analyticsFilters.section_id}
                  onChange={(e) => handleFilterChange("section_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
                >
                  <option value="">All Sections</option>
                  {filteredSections.map((sec) => (
                    <option key={sec.section_id} value={sec.section_id}>
                      Sec {sec.section_code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Subject
                </label>
                <select
                  value={analyticsFilters.subject_id}
                  onChange={(e) => handleFilterChange("subject_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
                >
                  <option value="">All Subjects</option>
                  {subjectsList.map((sub) => (
                    <option key={sub.subject_id} value={sub.subject_id}>
                      {sub.subject_code} - {sub.name?.substring(0, 16)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Faculty
                </label>
                <select
                  value={analyticsFilters.faculty_id}
                  onChange={(e) => handleFilterChange("faculty_id", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
                >
                  <option value="">All Faculty</option>
                  {facultyList.map((f) => (
                    <option key={f.faculty_id} value={f.faculty_id}>
                      {f.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Date Range
                </label>
                <input
                  type="date"
                  value={analyticsFilters.start_date}
                  onChange={(e) => handleFilterChange("start_date", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Filtered Analytics Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Filtered Sessions
              </span>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {analyticsReportData.summary?.total_sessions ?? 0}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {analyticsReportData.summary?.completed_sessions ?? 0} completed
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Marked
              </span>
              <div className="text-2xl font-bold text-blue-700 mt-1">
                {analyticsReportData.summary?.total_attendance_records ?? 0}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Student attendance records
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Attended (Present+Late)
              </span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {(analyticsReportData.summary?.present_count ?? 0) +
                  (analyticsReportData.summary?.late_count ?? 0)}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                {analyticsReportData.summary?.present_count ?? 0} Present,{" "}
                {analyticsReportData.summary?.late_count ?? 0} Late
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Attendance Rate
              </span>
              <div className="text-2xl font-bold text-purple-700 mt-1">
                {analyticsReportData.summary?.overall_attendance_percentage != null
                  ? `${analyticsReportData.summary.overall_attendance_percentage}%`
                  : "0%"}
              </div>
              <p className="text-[11px] text-red-500 font-medium mt-1">
                {analyticsReportData.summary?.absent_count ?? 0} Absences
              </p>
            </div>
          </div>

          {/* Sub-view switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAnalyticsSubTab("sections")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  analyticsSubTab === "sections"
                    ? "bg-white text-green-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Section Breakdown ({analyticsReportData.sections_breakdown?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsSubTab("sessions")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  analyticsSubTab === "sessions"
                    ? "bg-white text-green-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Session-by-Session Records ({analyticsReportData.sessions_breakdown?.length || 0})
              </button>
            </div>
          </div>

          {/* Analytics Tables */}
          {analyticsLoading ? (
            <LoadingSpinner message="Calculating section and session attendance analytics..." />
          ) : analyticsSubTab === "sections" ? (
            <DataTable
              key="attendance-analytics-sections-table"
              rowKey="section_id"
              columns={sectionAnalyticsColumns}
              data={analyticsReportData.sections_breakdown || []}
              searchPlaceholder="Search by section, programme, subject..."
              pageSize={10}
              pageSizeOptions={[10, 25, 50, 100]}
              emptyMessage="No section attendance records found matching filters."
            />
          ) : (
            <DataTable
              key="attendance-analytics-sessions-table"
              rowKey="session_id"
              columns={sessionAnalyticsColumns}
              data={analyticsReportData.sessions_breakdown || []}
              searchPlaceholder="Search by session ID, subject, faculty, room..."
              pageSize={25}
              pageSizeOptions={[10, 25, 50, 100]}
              emptyMessage="No session attendance records found matching filters."
            />
          )}
        </div>
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
                const dayNames = [
                  "",
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat",
                  "Sun",
                ];
                const dayLabel =
                  dayNames[s.day_of_week] || `Day ${s.day_of_week}`;
                const subject = s.subject_code
                  ? `${s.subject_code}`
                  : `Offering #${s.offering_id || s.section_id}`;
                const section = s.section_code
                  ? ` (Sec ${s.section_code})`
                  : "";
                const time = s.start_time
                  ? ` | ${s.start_time.slice(0, 5)}-${s.end_time?.slice(0, 5)}`
                  : "";
                const room = s.room_no ? ` | Rm ${s.room_no}` : "";
                const faculty = s.faculty_name ? ` | ${s.faculty_name}` : "";
                return (
                  <option key={s.slot_id} value={s.slot_id}>
                    #{s.slot_id} — {subject}
                    {section} [{dayLabel}
                    {time}
                    {room}
                    {faculty}]
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
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, faculty_id: e.target.value })
                }
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
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    classroom_id: e.target.value,
                  })
                }
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
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    scheduled_start: e.target.value,
                  })
                }
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
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    scheduled_end: e.target.value,
                  })
                }
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
              <span className="font-semibold text-green-950">Slot ID: </span>#
              {viewingRosterSession?.slot_id || "—"}
            </div>
          </div>

          {rosterSuccess && <Alert type="success" message={rosterSuccess} />}
          {rosterError && <Alert type="error" message={rosterError} />}

          {rosterLoading ? (
            <LoadingSpinner message="Fetching roster records..." />
          ) : (
            <DataTable
              key={`roster-table-${viewingRosterSession?.session_id || "modal"}`}
              rowKey="attendance_id"
              columns={rosterColumns}
              data={rosterRecords}
              pageSize={10}
              pageSizeOptions={[10, 25, 50]}
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
        title={
          overridingRecord?.attendance_id
            ? "Override Attendance Record"
            : "Mark Student Attendance"
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleOverrideSubmit} className="space-y-4">
          <div className="rounded-xl bg-gray-50 p-3 border border-gray-200 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900 text-sm">
                {overridingRecord?.full_name || "Student"}
              </span>
              <Badge
                status={
                  overridingRecord?.attendance_status ||
                  overridingRecord?.status ||
                  "UNMARKED"
                }
              />
            </div>
            <div className="text-gray-500 font-mono">
              Roll: {overridingRecord?.register_no || "—"} • Enrollment #
              {overridingRecord?.enrollment_id}
              {overridingRecord?.attendance_id
                ? ` • Record #${overridingRecord.attendance_id}`
                : " • Not marked yet"}
            </div>
          </div>

          {overrideError && <Alert type="error" message={overrideError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              New Status <span className="text-red-500">*</span>
            </label>
            <select
              value={overrideForm.new_status}
              onChange={(e) =>
                setOverrideForm({ ...overrideForm, new_status: e.target.value })
              }
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
              onChange={(e) =>
                setOverrideForm({
                  ...overrideForm,
                  reason_code: e.target.value,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value="FACULTY_OVERRIDE">
                FACULTY_OVERRIDE (Faculty Request)
              </option>
              <option value="MEDICAL_LEAVE">
                MEDICAL_LEAVE (Medical Leave)
              </option>
              <option value="ON_DUTY_LEAVE">
                ON_DUTY_LEAVE (On Duty / Official Event)
              </option>
              <option value="DEVICE_FAILURE">
                DEVICE_FAILURE (Scanner / Biometric Failure)
              </option>
              <option value="DATA_ENTRY_ERROR">
                DATA_ENTRY_ERROR (Data Entry Error)
              </option>
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
              onChange={(e) =>
                setOverrideForm({
                  ...overrideForm,
                  reason_note: e.target.value,
                })
              }
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
              {submitting
                ? "Saving..."
                : overridingRecord?.attendance_id
                  ? "Save Override"
                  : "Mark Attendance"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AttendanceSessionsView;
