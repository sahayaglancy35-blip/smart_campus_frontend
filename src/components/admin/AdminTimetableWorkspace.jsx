import { useState, useMemo } from "react";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import { deliveryStyleOf, getDeliveryType } from "../common/deliveryStyle";
import { DeliveryLegend } from "../common/DeliveryLegend";
import {
  CalendarDaysIcon,
  TableCellsIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  FunnelIcon,
  ArrowPathIcon,
  MapPinIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

const DAYS_OF_WEEK = [
  { id: 1, name: "Monday", short: "Mon" },
  { id: 2, name: "Tuesday", short: "Tue" },
  { id: 3, name: "Wednesday", short: "Wed" },
  { id: 4, name: "Thursday", short: "Thu" },
  { id: 5, name: "Friday", short: "Fri" },
  { id: 6, name: "Saturday", short: "Sat" },
];

const STANDARD_PERIODS = [
  { start: "08:00:00", end: "09:00:00", label: "08:00 – 09:00" },
  { start: "09:00:00", end: "10:00:00", label: "09:00 – 10:00" },
  { start: "10:00:00", end: "11:00:00", label: "10:00 – 11:00" },
  { start: "11:00:00", end: "12:00:00", label: "11:00 – 12:00" },
  { start: "12:00:00", end: "13:00:00", label: "12:00 – 13:00" },
  { start: "13:00:00", end: "14:00:00", label: "13:00 – 14:00" },
  { start: "14:00:00", end: "15:00:00", label: "14:00 – 15:00" },
  { start: "15:00:00", end: "16:00:00", label: "15:00 – 16:00" },
  { start: "16:00:00", end: "17:00:00", label: "16:00 – 17:00" },
  { start: "17:00:00", end: "18:00:00", label: "17:00 – 18:00" },
];

const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return "--";
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
};

export function AdminTimetableWorkspace({
  timetableSlots = [],
  schools = [],
  departments = [],
  programs = [],
  batches = [],
  sections = [],
  offerings = [],
  subjects = [],
  onOpenCreateSlot,
  onOpenEditSlot,
  onDeleteSlot,
}) {
  // 3-tab workspace: "calendar" | "records" | "conflicts"
  const [workspaceTab, setWorkspaceTab] = useState("calendar");

  // Dependent academic cascading filters
  const [filterSchool, setFilterSchool] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterProgram, setFilterProgram] = useState("ALL");
  const [filterBatch, setFilterBatch] = useState("ALL");
  const [filterSemester, setFilterSemester] = useState("ALL");
  const [filterSection, setFilterSection] = useState("ALL");
  const [dayFilter, setDayFilter] = useState("ALL");

  // Cascading filter options
  const filteredDepartments = useMemo(() => {
    if (filterSchool === "ALL") return departments;
    return departments.filter((d) => String(d.school_id) === String(filterSchool));
  }, [departments, filterSchool]);

  const filteredPrograms = useMemo(() => {
    let progs = programs;
    if (filterSchool !== "ALL") {
      progs = progs.filter((p) => String(p.school_id) === String(filterSchool));
    }
    if (filterDepartment !== "ALL") {
      progs = progs.filter((p) => String(p.department_id) === String(filterDepartment));
    }
    return progs;
  }, [programs, filterSchool, filterDepartment]);

  const filteredBatches = useMemo(() => {
    if (filterProgram === "ALL") return batches;
    return batches.filter((b) => String(b.programme_id) === String(filterProgram));
  }, [batches, filterProgram]);

  const filteredSections = useMemo(() => {
    let secs = sections;
    if (filterBatch !== "ALL") {
      secs = secs.filter((s) => String(s.batch_id) === String(filterBatch));
    }
    return secs;
  }, [sections, filterBatch]);

  // Handle reset filters
  const handleResetFilters = () => {
    setFilterSchool("ALL");
    setFilterDepartment("ALL");
    setFilterProgram("ALL");
    setFilterBatch("ALL");
    setFilterSemester("ALL");
    setFilterSection("ALL");
    setDayFilter("ALL");
  };

  // Filtered timetable slots
  const filteredSlots = useMemo(() => {
    return timetableSlots.filter((slot) => {
      if (filterSchool !== "ALL" && String(slot.school_id) !== String(filterSchool)) return false;
      if (filterDepartment !== "ALL" && String(slot.department_id) !== String(filterDepartment)) return false;
      if (filterProgram !== "ALL" && String(slot.programme_id) !== String(filterProgram)) return false;
      if (filterBatch !== "ALL" && String(slot.batch_id) !== String(filterBatch)) return false;
      if (filterSemester !== "ALL" && String(slot.semester) !== String(filterSemester) && String(slot.term_id) !== String(filterSemester)) return false;
      if (filterSection !== "ALL" && String(slot.section_id) !== String(filterSection)) return false;
      if (dayFilter !== "ALL" && String(slot.day_of_week) !== String(dayFilter)) return false;
      return true;
    });
  }, [
    timetableSlots,
    filterSchool,
    filterDepartment,
    filterProgram,
    filterBatch,
    filterSemester,
    filterSection,
    dayFilter,
  ]);

  // KPI Metrics Calculation
  const kpis = useMemo(() => {
    const total = filteredSlots.length;
    let theory = 0;
    let lab = 0;
    filteredSlots.forEach((slot) => {
      const type = getDeliveryType(slot);
      if (type === "LAB") lab++;
      else theory++;
    });

    const coveredOfferings = new Set(filteredSlots.map((s) => s.offering_id || s.subject_id).filter(Boolean));
    const totalActiveOfferings = offerings.length || subjects.length;
    const unallocated = Math.max(0, totalActiveOfferings - coveredOfferings.size);

    return {
      total,
      theory,
      lab,
      unallocated,
    };
  }, [filteredSlots, offerings, subjects]);

  // Real-Time Schedule Conflict Analysis
  const detectedConflicts = useMemo(() => {
    const active = timetableSlots.filter((s) => s.is_active === 1);
    const conflicts = [];

    const isOverlap = (startA, endA, startB, endB) => {
      return startA < endB && endA > startB;
    };

    const isDateOverlap = (slotA, slotB) => {
      const aStart = slotA.effective_from || "1900-01-01";
      const aEnd = slotA.effective_to || "2099-12-31";
      const bStart = slotB.effective_from || "1900-01-01";
      const bEnd = slotB.effective_to || "2099-12-31";
      return aStart <= bEnd && aEnd >= bStart;
    };

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];

        if (Number(a.day_of_week) !== Number(b.day_of_week)) continue;
        if (!isOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) continue;
        if (!isDateOverlap(a, b)) continue;

        // Faculty Double-Booking
        if (a.faculty_id && b.faculty_id && Number(a.faculty_id) === Number(b.faculty_id)) {
          conflicts.push({
            type: "FACULTY_CONFLICT",
            severity: "HIGH",
            title: "Faculty Double-Booking Conflict",
            description: `${a.faculty_name || `Faculty #${a.faculty_id}`} is simultaneously scheduled for two classes on ${DAYS_OF_WEEK.find((d) => d.id === Number(a.day_of_week))?.name || `Day ${a.day_of_week}`}.`,
            slotA: a,
            slotB: b,
            time: `${formatTimeDisplay(a.start_time)} – ${formatTimeDisplay(a.end_time)}`,
          });
        }

        // Room Overlap
        if (a.classroom_id && b.classroom_id && Number(a.classroom_id) === Number(b.classroom_id)) {
          conflicts.push({
            type: "ROOM_CONFLICT",
            severity: "HIGH",
            title: "Classroom / Laboratory Collision",
            description: `Room ${a.room_no || `ID #${a.classroom_id}`} is assigned to multiple classes simultaneously.`,
            slotA: a,
            slotB: b,
            time: `${formatTimeDisplay(a.start_time)} – ${formatTimeDisplay(a.end_time)}`,
          });
        }

        // Section Overlap
        if (a.section_id && b.section_id && Number(a.section_id) === Number(b.section_id)) {
          conflicts.push({
            type: "SECTION_CONFLICT",
            severity: "MEDIUM",
            title: "Section Overlap Conflict",
            description: `Section ${a.section_code || `#${a.section_id}`} has two concurrent classes scheduled.`,
            slotA: a,
            slotB: b,
            time: `${formatTimeDisplay(a.start_time)} – ${formatTimeDisplay(a.end_time)}`,
          });
        }
      }
    }
    return conflicts;
  }, [timetableSlots]);

  // Calendar Dynamic Periods
  const calendarPeriods = useMemo(() => {
    const periodMap = new Map();
    // Add standard periods first
    STANDARD_PERIODS.forEach((p) => {
      periodMap.set(`${p.start}|${p.end}`, {
        start: p.start,
        end: p.end,
        label: p.label,
      });
    });

    // Add any unique slot start/end times from filteredSlots
    filteredSlots.forEach((s) => {
      if (s.start_time && s.end_time) {
        const key = `${s.start_time.slice(0, 8)}|${s.end_time.slice(0, 8)}`;
        if (!periodMap.has(key)) {
          periodMap.set(key, {
            start: s.start_time.slice(0, 8),
            end: s.end_time.slice(0, 8),
            label: `${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}`,
          });
        }
      }
    });

    return [...periodMap.values()].sort((a, b) =>
      String(a.start).localeCompare(String(b.start))
    );
  }, [filteredSlots]);

  // Group slots by "day|period"
  const calendarCells = useMemo(() => {
    const grouped = {};
    filteredSlots.forEach((slot) => {
      const sDay = Number(slot.day_of_week);
      const sStart = slot.start_time?.slice(0, 8);
      const sEnd = slot.end_time?.slice(0, 8);

      // Match exact period or intersecting period
      calendarPeriods.forEach((period) => {
        if (
          sStart < period.end &&
          sEnd > period.start
        ) {
          const key = `${sDay}|${period.start}|${period.end}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(slot);
        }
      });
    });
    return grouped;
  }, [filteredSlots, calendarPeriods]);

  // Columns for Schedule Records Tab
  const recordColumns = [
    {
      header: "Day & Time",
      key: "day_of_week",
      render: (row) => {
        const dayObj = DAYS_OF_WEEK.find((d) => d.id === Number(row.day_of_week));
        return (
          <div>
            <span className="font-bold text-gray-900 text-xs">
              {dayObj ? dayObj.name : `Day ${row.day_of_week}`}
            </span>
            <p className="font-mono text-[11px] text-gray-500">
              {row.start_time?.slice(0, 5)} – {row.end_time?.slice(0, 5)}
            </p>
          </div>
        );
      },
    },
    {
      header: "Subject & Type",
      key: "subject_code",
      render: (row) => {
        const style = deliveryStyleOf(row);
        const type = getDeliveryType(row);
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold ${style.code}`}>
                {row.subject_code}
              </span>
              <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${style.chip}`}>
                {type}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate max-w-[200px]" title={row.subject_name}>
              {row.subject_name}
            </p>
          </div>
        );
      },
    },
    {
      header: "Section & Programme",
      key: "section_code",
      render: (row) => (
        <div>
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700">
            Sec {row.section_code}
          </span>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            {row.programme_code || row.programme_name || "B.Tech"} • {row.batch_label || "Batch"}
          </p>
        </div>
      ),
    },
    {
      header: "Faculty Instructor",
      key: "faculty_name",
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-gray-900">{row.faculty_name || "—"}</p>
          <span className="text-[11px] text-gray-400 font-mono">{row.employee_code || ""}</span>
        </div>
      ),
    },
    {
      header: "Room / Lab",
      key: "room_no",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-200">
          <MapPinIcon className="h-3.5 w-3.5 text-green-700" />
          {row.room_no || "TBD"}
        </span>
      ),
    },
    {
      header: "Status",
      key: "is_active",
      render: (row) => (
        <Badge status={row.is_active ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onOpenEditSlot?.(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-800 transition cursor-pointer"
            title="Edit Schedule Slot"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteSlot?.(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
            title="Deactivate / Remove Slot"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Overview Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Classes
            </span>
            <CalendarDaysIcon className="h-4 w-4 text-green-700" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {kpis.total}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Scheduled slots</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Theory Classes
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-800">
            {kpis.theory}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Lecture sessions</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Lab Sessions
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-700">
            {kpis.lab}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Practical labs</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Unallocated
            </span>
            <AcademicCapIcon className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {kpis.unallocated}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Unassigned subjects</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Conflicts
            </span>
            {detectedConflicts.length > 0 ? (
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
            )}
          </div>
          <div
            className={`text-2xl font-bold ${
              detectedConflicts.length > 0 ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {detectedConflicts.length}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {detectedConflicts.length > 0 ? "Overlaps detected" : "All clean & verified"}
          </p>
        </div>
      </div>

      {/* Cascading Dependent Academic Filter Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-900">
            <FunnelIcon className="h-4 w-4 text-green-700" />
            Hierarchical Academic Filters
          </h4>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-green-800 transition cursor-pointer"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* 1. School */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              1. School
            </label>
            <select
              value={filterSchool}
              onChange={(e) => {
                setFilterSchool(e.target.value);
                setFilterDepartment("ALL");
                setFilterProgram("ALL");
                setFilterBatch("ALL");
                setFilterSection("ALL");
              }}
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Schools ({schools.length})</option>
              {schools.map((s) => (
                <option key={s.school_id} value={s.school_id}>
                  {s.code || s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Department */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              2. Department
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setFilterProgram("ALL");
                setFilterBatch("ALL");
                setFilterSection("ALL");
              }}
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Depts ({filteredDepartments.length})</option>
              {filteredDepartments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.code || d.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Programme */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              3. Programme
            </label>
            <select
              value={filterProgram}
              onChange={(e) => {
                setFilterProgram(e.target.value);
                setFilterBatch("ALL");
                setFilterSection("ALL");
              }}
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Programmes ({filteredPrograms.length})</option>
              {filteredPrograms.map((p) => (
                <option key={p.programme_id} value={p.programme_id}>
                  {p.programme_code || p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Batch */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              4. Batch
            </label>
            <select
              value={filterBatch}
              onChange={(e) => {
                setFilterBatch(e.target.value);
                setFilterSection("ALL");
              }}
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Batches ({filteredBatches.length})</option>
              {filteredBatches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Semester */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              5. Semester
            </label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Section */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              6. Section
            </label>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Sections ({filteredSections.length})</option>
              {filteredSections.map((s) => (
                <option key={s.section_id} value={s.section_id}>
                  Sec {s.section_code}
                </option>
              ))}
            </select>
          </div>

          {/* 7. Day of Week */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              7. Day
            </label>
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-medium text-gray-800 focus:border-green-600 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Days</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3-Tab Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setWorkspaceTab("calendar")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              workspaceTab === "calendar"
                ? "bg-white text-green-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <CalendarDaysIcon className="h-4 w-4" />
            Timetable Calendar
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceTab("records")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              workspaceTab === "records"
                ? "bg-white text-green-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <TableCellsIcon className="h-4 w-4" />
            Schedule Records ({filteredSlots.length})
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceTab("conflicts")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              workspaceTab === "conflicts"
                ? "bg-white text-green-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ExclamationTriangleIcon
              className={`h-4 w-4 ${
                detectedConflicts.length > 0 ? "text-red-500" : "text-gray-400"
              }`}
            />
            Conflict Overview ({detectedConflicts.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <DeliveryLegend />
          <button
            type="button"
            onClick={() => onOpenCreateSlot?.()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" /> Allocate Class Slot
          </button>
        </div>
      </div>

      {/* TAB 1: Timetable Calendar Grid */}
      {workspaceTab === "calendar" && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-xs">
          <table className="w-full min-w-[950px] border-collapse text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="w-36 bg-green-900 px-3 py-3.5 text-left text-xs font-semibold text-green-100"
                >
                  Time Period
                </th>
                {DAYS_OF_WEEK.map((day) => (
                  <th
                    key={day.id}
                    scope="col"
                    className="border-l border-green-800 bg-green-900 px-3 py-3.5 text-left text-xs font-semibold text-white"
                  >
                    {day.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendarPeriods.map((period, idx) => (
                <tr key={`${period.start}-${period.end}`}>
                  <th
                    scope="row"
                    className="whitespace-nowrap border-t border-gray-200 bg-gray-50/70 px-3 py-3 text-left align-top"
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Period {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-gray-800 font-mono">
                      {formatTimeDisplay(period.start)} – {formatTimeDisplay(period.end)}
                    </span>
                  </th>

                  {DAYS_OF_WEEK.map((day) => {
                    const cellKey = `${day.id}|${period.start}|${period.end}`;
                    const slotsInCell = calendarCells[cellKey] || [];

                    return (
                      <td
                        key={day.id}
                        className="min-w-[145px] border-l border-t border-gray-200 p-1.5 align-top group hover:bg-green-50/20 transition"
                      >
                        {slotsInCell.length === 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenCreateSlot?.({
                                day_of_week: day.id,
                                start_time: period.start,
                                end_time: period.end,
                                section_id:
                                  filterSection !== "ALL"
                                    ? filterSection
                                    : undefined,
                              })
                            }
                            className="w-full h-16 rounded-lg border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 hover:text-green-800 hover:border-green-300 hover:bg-green-50/50 transition cursor-pointer text-[11px]"
                            title={`Click to allocate slot for ${day.name} at ${period.label}`}
                          >
                            <PlusIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition" />
                            <span className="opacity-0 group-hover:opacity-100 transition font-semibold text-[10px]">
                              Allocate
                            </span>
                          </button>
                        ) : (
                          <div className="space-y-1.5">
                            {slotsInCell.map((slot) => {
                              const style = deliveryStyleOf(slot);
                              const type = getDeliveryType(slot);
                              return (
                                <div
                                  key={slot.slot_id}
                                  className={`rounded-xl border ${style.card} p-2.5 shadow-xs relative group/card hover:shadow-md transition`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span
                                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${style.code}`}
                                    >
                                      {slot.subject_code}
                                    </span>
                                    <span
                                      className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${style.chip}`}
                                    >
                                      {type}
                                    </span>
                                  </div>

                                  <h6
                                    className="text-xs font-bold text-gray-900 leading-tight truncate"
                                    title={slot.subject_name}
                                  >
                                    {slot.subject_name}
                                  </h6>

                                  <div className="mt-1 text-[11px] text-gray-600 flex items-center justify-between">
                                    <span className="font-semibold text-blue-700 bg-blue-50 px-1 rounded">
                                      Sec {slot.section_code || "—"}
                                    </span>
                                    <span className="font-medium text-gray-500">
                                      {slot.room_no || "TBD"}
                                    </span>
                                  </div>

                                  <p className="text-[10px] text-gray-500 truncate mt-0.5" title={slot.faculty_name}>
                                    {slot.faculty_name || "Faculty Unassigned"}
                                  </p>

                                  {/* Quick Action Drawer Hover */}
                                  <div className="absolute top-1.5 right-1.5 hidden group-hover/card:flex items-center gap-1 bg-white/90 p-0.5 rounded-md shadow-xs">
                                    <button
                                      type="button"
                                      onClick={() => onOpenEditSlot?.(slot)}
                                      className="p-1 text-gray-600 hover:text-green-800 hover:bg-gray-100 rounded"
                                      title="Edit slot"
                                    >
                                      <PencilSquareIcon className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteSlot?.(slot)}
                                      className="p-1 text-gray-600 hover:text-red-700 hover:bg-gray-100 rounded"
                                      title="Deactivate slot"
                                    >
                                      <TrashIcon className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Schedule Records Table */}
      {workspaceTab === "records" && (
        <DataTable
          key="timetable-schedule-records-table"
          data={filteredSlots}
          columns={recordColumns}
          searchPlaceholder="Search timetable slots by subject, room, faculty, or section..."
          pageSize={10}
          emptyMessage="No timetable slots found matching the selected hierarchical filters."
          emptyAction={
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-800 bg-white px-3 py-1.5 text-xs font-semibold text-green-800 shadow-xs hover:bg-green-50 transition"
            >
              Reset Filters
            </button>
          }
        />
      )}

      {/* TAB 3: Conflict Overview */}
      {workspaceTab === "conflicts" && (
        <div className="space-y-4">
          {detectedConflicts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-3">
                <CheckCircleIcon className="h-7 w-7" />
              </div>
              <h4 className="text-base font-bold text-emerald-950">
                Timetable Verification Passed
              </h4>
              <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                All {timetableSlots.length} active timetable slots have been audited across faculty schedules, room assignments, and student sections. Zero conflicts or collisions detected!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900">
                <div className="flex items-center gap-2 font-bold text-red-950">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                  {detectedConflicts.length} Timetable Conflicts Detected
                </div>
                <p className="mt-1 text-red-800">
                  The schedule contains simultaneous room collisions, faculty double-bookings, or section overlaps. Resolve these conflicts by editing the affected slots below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {detectedConflicts.map((c, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-red-200 bg-white p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-xs font-bold">
                        {c.type}
                      </span>
                      <span className="text-xs font-mono font-semibold text-gray-500">
                        {c.time}
                      </span>
                    </div>

                    <div>
                      <h5 className="text-sm font-bold text-gray-900">{c.title}</h5>
                      <p className="text-xs text-gray-600 mt-1">{c.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                      <div className="rounded-lg bg-gray-50 p-2 border border-gray-200">
                        <span className="font-bold text-gray-800">Slot #{c.slotA.slot_id}</span>
                        <p className="text-[11px] text-gray-600 truncate">{c.slotA.subject_code} - {c.slotA.subject_name}</p>
                        <p className="text-[10px] text-gray-500">Sec {c.slotA.section_code} • {c.slotA.room_no}</p>
                        <button
                          type="button"
                          onClick={() => onOpenEditSlot?.(c.slotA)}
                          className="mt-2 text-xs font-bold text-green-800 hover:underline"
                        >
                          Edit Slot #{c.slotA.slot_id}
                        </button>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-2 border border-gray-200">
                        <span className="font-bold text-gray-800">Slot #{c.slotB.slot_id}</span>
                        <p className="text-[11px] text-gray-600 truncate">{c.slotB.subject_code} - {c.slotB.subject_name}</p>
                        <p className="text-[10px] text-gray-500">Sec {c.slotB.section_code} • {c.slotB.room_no}</p>
                        <button
                          type="button"
                          onClick={() => onOpenEditSlot?.(c.slotB)}
                          className="mt-2 text-xs font-bold text-green-800 hover:underline"
                        >
                          Edit Slot #{c.slotB.slot_id}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
