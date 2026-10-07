import { useState, useEffect } from "react";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getCourseOfferings,
  createCourseOffering,
  updateCourseOffering,
  deleteCourseOffering,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getTimetableSlots,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
} from "../../api/academics";
import { getDepartments, getFaculty, getClassrooms } from "../../api/admin";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  AcademicCapIcon,
  BookOpenIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const DAYS_OF_WEEK = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
];

export function AcademicsManagementView({ token }) {
  const [activeTab, setActiveTab] = useState("subjects"); // "subjects" | "offerings" | "sections" | "timetable"
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Data states
  const [subjects, setSubjects] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [sections, setSections] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);

  // Supporting dropdown data
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [classroomList, setClassroomList] = useState([]);

  // Timetable day filter
  const [dayFilter, setDayFilter] = useState("ALL");

  // Modals state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    subject_code: "",
    name: "",
    department_id: "",
    credits: 3,
    course_category: "CORE",
    is_active: 1,
  });

  const [isOfferingModalOpen, setIsOfferingModalOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState(null);
  const [offeringForm, setOfferingForm] = useState({
    subject_id: "",
    term_id: 1,
    coordinator_faculty_id: "",
    is_active: 1,
  });

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({
    offering_id: "",
    section_code: "A",
    max_strength: 60,
  });

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({
    section_id: "",
    faculty_id: "",
    classroom_id: "",
    day_of_week: 1,
    start_time: "09:00:00",
    end_time: "10:00:00",
    is_active: 1,
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Load all academics data
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadAcademicsData() {
      try {
        setLoading(true);
        setError("");

        const [
          subjRes,
          offRes,
          secRes,
          ttRes,
          deptRes,
          facRes,
          roomRes,
        ] = await Promise.all([
          getSubjects(token, controller.signal).catch(() => ({ data: [] })),
          getCourseOfferings(token, controller.signal).catch(() => ({ data: [] })),
          getSections(token, controller.signal).catch(() => ({ data: [] })),
          getTimetableSlots(token, controller.signal).catch(() => ({ data: [] })),
          getDepartments(token, controller.signal).catch(() => ({ data: [] })),
          getFaculty(token, controller.signal).catch(() => ({ data: [] })),
          getClassrooms(token, controller.signal).catch(() => ({ data: [] })),
        ]);

        setSubjects(Array.isArray(subjRes?.data) ? subjRes.data : []);
        setOfferings(Array.isArray(offRes?.data) ? offRes.data : []);
        setSections(Array.isArray(secRes?.data) ? secRes.data : []);
        setTimetableSlots(Array.isArray(ttRes?.data) ? ttRes.data : []);
        setDepartments(Array.isArray(deptRes?.data) ? deptRes.data : []);
        setFacultyList(Array.isArray(facRes?.data) ? facRes.data : []);
        setClassroomList(Array.isArray(roomRes?.data) ? roomRes.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load academics management data.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAcademicsData();
    return () => controller.abort();
  }, [token, reloadTrigger]);

  // -------------------------------------------------------------
  // Subject Actions
  // -------------------------------------------------------------
  const handleOpenCreateSubject = () => {
    setEditingSubject(null);
    setSubjectForm({
      subject_code: "",
      name: "",
      department_id: departments[0]?.department_id || "",
      credits: 3,
      course_category: "CORE",
      is_active: 1,
    });
    setFormError("");
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (row) => {
    setEditingSubject(row);
    setSubjectForm({
      subject_code: row.subject_code || "",
      name: row.name || "",
      department_id: row.department_id || "",
      credits: row.credits || 3,
      course_category: row.course_category || "CORE",
      is_active: row.is_active !== undefined ? row.is_active : 1,
    });
    setFormError("");
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (editingSubject) {
        await updateSubject(token, editingSubject.subject_id, subjectForm);
        setActionSuccess(`Subject "${subjectForm.name}" updated successfully.`);
      } else {
        await createSubject(token, subjectForm);
        setActionSuccess(`Subject "${subjectForm.name}" created successfully.`);
      }
      setIsSubjectModalOpen(false);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to save subject.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (row) => {
    if (!window.confirm(`Deactivate subject ${row.subject_code} - ${row.name}?`)) return;
    try {
      await deleteSubject(token, row.subject_id);
      setActionSuccess(`Subject ${row.subject_code} deactivated.`);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to deactivate subject.");
    }
  };

  // -------------------------------------------------------------
  // Course Offering Actions
  // -------------------------------------------------------------
  const handleOpenCreateOffering = () => {
    setEditingOffering(null);
    setOfferingForm({
      subject_id: subjects[0]?.subject_id || "",
      term_id: 1,
      coordinator_faculty_id: facultyList[0]?.faculty_id || "",
      is_active: 1,
    });
    setFormError("");
    setIsOfferingModalOpen(true);
  };

  const handleOpenEditOffering = (row) => {
    setEditingOffering(row);
    setOfferingForm({
      subject_id: row.subject_id || "",
      term_id: row.term_id || 1,
      coordinator_faculty_id: row.coordinator_faculty_id || "",
      is_active: row.is_active !== undefined ? row.is_active : 1,
    });
    setFormError("");
    setIsOfferingModalOpen(true);
  };

  const handleSaveOffering = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (editingOffering) {
        await updateCourseOffering(token, editingOffering.offering_id, offeringForm);
        setActionSuccess("Course offering updated successfully.");
      } else {
        await createCourseOffering(token, offeringForm);
        setActionSuccess("Course offering created successfully.");
      }
      setIsOfferingModalOpen(false);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to save course offering.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOffering = async (row) => {
    if (!window.confirm("Delete course offering?")) return;
    try {
      await deleteCourseOffering(token, row.offering_id);
      setActionSuccess("Course offering deleted.");
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to delete course offering.");
    }
  };

  // -------------------------------------------------------------
  // Section Actions
  // -------------------------------------------------------------
  const handleOpenCreateSection = () => {
    setEditingSection(null);
    setSectionForm({
      offering_id: offerings[0]?.offering_id || "",
      section_code: "A",
      max_strength: 60,
    });
    setFormError("");
    setIsSectionModalOpen(true);
  };

  const handleOpenEditSection = (row) => {
    setEditingSection(row);
    setSectionForm({
      offering_id: row.offering_id || "",
      section_code: row.section_code || "A",
      max_strength: row.max_strength || 60,
    });
    setFormError("");
    setIsSectionModalOpen(true);
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (editingSection) {
        await updateSection(token, editingSection.section_id, sectionForm);
        setActionSuccess(`Section ${sectionForm.section_code} updated successfully.`);
      } else {
        await createSection(token, sectionForm);
        setActionSuccess(`Section ${sectionForm.section_code} created successfully.`);
      }
      setIsSectionModalOpen(false);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to save section.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSection = async (row) => {
    if (!window.confirm(`Delete section ${row.section_code}?`)) return;
    try {
      await deleteSection(token, row.section_id);
      setActionSuccess(`Section ${row.section_code} deleted.`);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to delete section.");
    }
  };

  // -------------------------------------------------------------
  // Timetable Actions
  // -------------------------------------------------------------
  const handleOpenCreateSlot = () => {
    setEditingSlot(null);
    setSlotForm({
      section_id: sections[0]?.section_id || "",
      faculty_id: facultyList[0]?.faculty_id || "",
      classroom_id: classroomList[0]?.classroom_id || "",
      day_of_week: 1,
      start_time: "09:00:00",
      end_time: "10:00:00",
      is_active: 1,
    });
    setFormError("");
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (row) => {
    setEditingSlot(row);
    setSlotForm({
      section_id: row.section_id || "",
      faculty_id: row.faculty_id || "",
      classroom_id: row.classroom_id || "",
      day_of_week: row.day_of_week || 1,
      start_time: row.start_time || "09:00:00",
      end_time: row.end_time || "10:00:00",
      is_active: row.is_active !== undefined ? row.is_active : 1,
    });
    setFormError("");
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (editingSlot) {
        await updateTimetableSlot(token, editingSlot.slot_id, slotForm);
        setActionSuccess("Timetable slot updated successfully.");
      } else {
        await createTimetableSlot(token, slotForm);
        setActionSuccess("Timetable slot created successfully.");
      }
      setIsSlotModalOpen(false);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      // Highlights timetable conflicts cleanly!
      setFormError(err.message || "Timetable conflict: please adjust room, time or faculty.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (row) => {
    if (!window.confirm("Deactivate this timetable slot?")) return;
    try {
      await deleteTimetableSlot(token, row.slot_id);
      setActionSuccess("Timetable slot deactivated.");
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to deactivate timetable slot.");
    }
  };

  // -------------------------------------------------------------
  // Columns
  // -------------------------------------------------------------
  const subjectColumns = [
    {
      header: "Code",
      key: "subject_code",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-gray-900">
          {row.subject_code}
        </span>
      ),
    },
    { header: "Subject Name", key: "name" },
    {
      header: "Department",
      key: "department_name",
      render: (row) => row.department_name || row.dept_code || "—",
    },
    {
      header: "Credits",
      key: "credits",
      render: (row) => `${row.credits || 0} Credits`,
    },
    {
      header: "Status",
      key: "is_active",
      render: (row) => (
        <Badge variant={row.is_active ? "success" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditSubject(row)}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-green-800"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          {row.is_active === 1 && (
            <button
              type="button"
              onClick={() => handleDeleteSubject(row)}
              className="rounded-md p-1 text-gray-500 hover:bg-red-50 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const offeringColumns = [
    {
      header: "Offering ID",
      key: "offering_id",
      render: (row) => <span className="font-mono text-xs font-bold">#{row.offering_id}</span>,
    },
    {
      header: "Subject",
      key: "subject",
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">{row.subject_code}</div>
          <div className="text-xs text-gray-500">{row.subject_name}</div>
        </div>
      ),
    },
    {
      header: "Academic Term",
      key: "term_name",
      render: (row) => row.term_name || `Term #${row.term_id}`,
    },
    {
      header: "Coordinator",
      key: "coordinator_name",
      render: (row) => row.coordinator_name || row.faculty_name || "Unassigned",
    },
    {
      header: "Status",
      key: "is_active",
      render: (row) => (
        <Badge variant={row.is_active ? "success" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditOffering(row)}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-green-800"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteOffering(row)}
            className="rounded-md p-1 text-gray-500 hover:bg-red-50 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const sectionColumns = [
    {
      header: "Section Code",
      key: "section_code",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-gray-900">
          Section {row.section_code}
        </span>
      ),
    },
    {
      header: "Subject / Offering",
      key: "subject",
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">{row.subject_code || "Course Offering"}</div>
          <div className="text-xs text-gray-500">{row.subject_name || `Offering #${row.offering_id}`}</div>
        </div>
      ),
    },
    {
      header: "Capacity",
      key: "max_strength",
      render: (row) => `${row.max_strength || 60} Students`,
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditSection(row)}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-green-800"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteSection(row)}
            className="rounded-md p-1 text-gray-500 hover:bg-red-50 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const filteredSlots =
    dayFilter === "ALL"
      ? timetableSlots
      : timetableSlots.filter((slot) => String(slot.day_of_week) === String(dayFilter));

  const timetableColumns = [
    {
      header: "Day",
      key: "day_of_week",
      render: (row) => (
        <span className="font-semibold text-gray-900">
          {DAYS_OF_WEEK.find((d) => d.id === row.day_of_week)?.name || `Day ${row.day_of_week}`}
        </span>
      ),
    },
    {
      header: "Time",
      key: "time",
      render: (row) => `${row.start_time?.slice(0, 5)} - ${row.end_time?.slice(0, 5)}`,
    },
    {
      header: "Subject",
      key: "subject",
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">{row.subject_code}</div>
          <div className="text-xs text-gray-500">{row.subject_name}</div>
        </div>
      ),
    },
    {
      header: "Section",
      key: "section_code",
      render: (row) => `Sec ${row.section_code || "A"}`,
    },
    {
      header: "Faculty",
      key: "faculty_name",
      render: (row) => row.faculty_name || "Assigned Instructor",
    },
    {
      header: "Room & Block",
      key: "room",
      render: (row) => `${row.room_no || "—"} (${row.block_name || "Main Block"})`,
    },
    {
      header: "Status",
      key: "is_active",
      render: (row) => (
        <Badge variant={row.is_active ? "success" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditSlot(row)}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-green-800"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          {row.is_active === 1 && (
            <button
              type="button"
              onClick={() => handleDeleteSlot(row)}
              className="rounded-md p-1 text-gray-500 hover:bg-red-50 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Academics & Timetable Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Define curriculum subjects, semester course offerings, student sections, and timetable schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "subjects" && (
            <button
              type="button"
              onClick={handleOpenCreateSubject}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900"
            >
              <PlusIcon className="h-4 w-4" /> Add Subject
            </button>
          )}

          {activeTab === "offerings" && (
            <button
              type="button"
              onClick={handleOpenCreateOffering}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900"
            >
              <PlusIcon className="h-4 w-4" /> Create Offering
            </button>
          )}

          {activeTab === "sections" && (
            <button
              type="button"
              onClick={handleOpenCreateSection}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900"
            >
              <PlusIcon className="h-4 w-4" /> Add Section
            </button>
          )}

          {activeTab === "timetable" && (
            <button
              type="button"
              onClick={handleOpenCreateSlot}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900"
            >
              <PlusIcon className="h-4 w-4" /> Allocate Slot
            </button>
          )}
        </div>
      </div>

      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && <Alert type="error" message={error} />}

      {/* Tabs Bar */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("subjects")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "subjects"
              ? "border-green-800 text-green-800"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          <BookOpenIcon className="h-4 w-4" />
          Subjects ({subjects.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("offerings")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "offerings"
              ? "border-green-800 text-green-800"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          <AcademicCapIcon className="h-4 w-4" />
          Course Offerings ({offerings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sections")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "sections"
              ? "border-green-800 text-green-800"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          <UserGroupIcon className="h-4 w-4" />
          Sections ({sections.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timetable")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "timetable"
              ? "border-green-800 text-green-800"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          <CalendarDaysIcon className="h-4 w-4" />
          Timetable ({timetableSlots.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner message="Loading academic records..." />
          </div>
        ) : activeTab === "subjects" ? (
          <DataTable
            data={subjects}
            columns={subjectColumns}
            searchable
            searchPlaceholder="Search subjects by code or name..."
            emptyMessage="No academic subjects configured."
          />
        ) : activeTab === "offerings" ? (
          <DataTable
            data={offerings}
            columns={offeringColumns}
            searchable
            searchPlaceholder="Search course offerings..."
            emptyMessage="No active course offerings."
          />
        ) : activeTab === "sections" ? (
          <DataTable
            data={sections}
            columns={sectionColumns}
            searchable
            searchPlaceholder="Search sections..."
            emptyMessage="No student course sections."
          />
        ) : (
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <span className="text-xs font-semibold text-gray-500">Filter by Day:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setDayFilter("ALL")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    dayFilter === "ALL"
                      ? "bg-green-800 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All Days
                </button>
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDayFilter(String(d.id))}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      String(dayFilter) === String(d.id)
                        ? "bg-green-800 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {d.name.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <DataTable
              data={filteredSlots}
              columns={timetableColumns}
              searchable
              searchPlaceholder="Search timetable by subject, room or faculty..."
              emptyMessage="No timetable slots scheduled for this selection."
            />
          </div>
        )}
      </div>

      {/* Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubject ? "Edit Subject" : "Create New Subject"}
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold text-gray-700">Subject Code *</label>
            <input
              type="text"
              required
              value={subjectForm.subject_code}
              onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value.toUpperCase() })}
              placeholder="e.g. CS201"
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Subject Name *</label>
            <input
              type="text"
              required
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              placeholder="e.g. Data Structures and Algorithms"
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Department</label>
              <select
                value={subjectForm.department_id}
                onChange={(e) => setSubjectForm({ ...subjectForm, department_id: e.target.value })}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Credits</label>
              <input
                type="number"
                min="1"
                max="10"
                value={subjectForm.credits}
                onChange={(e) => setSubjectForm({ ...subjectForm, credits: Number(e.target.value) })}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSubjectModalOpen(false)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Subject"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Course Offering Modal */}
      <Modal
        isOpen={isOfferingModalOpen}
        onClose={() => setIsOfferingModalOpen(false)}
        title={editingOffering ? "Edit Course Offering" : "Create Course Offering"}
      >
        <form onSubmit={handleSaveOffering} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold text-gray-700">Subject *</label>
            <select
              required
              value={offeringForm.subject_id}
              onChange={(e) => setOfferingForm({ ...offeringForm, subject_id: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.subject_code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Coordinator Faculty</label>
            <select
              value={offeringForm.coordinator_faculty_id}
              onChange={(e) => setOfferingForm({ ...offeringForm, coordinator_faculty_id: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
            >
              <option value="">Select Faculty Coordinator</option>
              {facultyList.map((f) => (
                <option key={f.faculty_id} value={f.faculty_id}>
                  {f.full_name} ({f.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOfferingModalOpen(false)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Offering"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Section Modal */}
      <Modal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        title={editingSection ? "Edit Section" : "Add Section"}
      >
        <form onSubmit={handleSaveSection} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold text-gray-700">Course Offering *</label>
            <select
              required
              value={sectionForm.offering_id}
              onChange={(e) => setSectionForm({ ...sectionForm, offering_id: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
            >
              <option value="">Select Course Offering</option>
              {offerings.map((o) => (
                <option key={o.offering_id} value={o.offering_id}>
                  Offering #{o.offering_id} ({o.subject_code} - {o.subject_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Section Code *</label>
              <input
                type="text"
                required
                maxLength={10}
                value={sectionForm.section_code}
                onChange={(e) => setSectionForm({ ...sectionForm, section_code: e.target.value.toUpperCase() })}
                placeholder="e.g. A"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Max Student Capacity</label>
              <input
                type="number"
                min="1"
                max="500"
                value={sectionForm.max_strength}
                onChange={(e) => setSectionForm({ ...sectionForm, max_strength: Number(e.target.value) })}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSectionModalOpen(false)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Section"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Timetable Slot Modal with Conflict Alerts */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title={editingSlot ? "Edit Timetable Slot" : "Allocate Timetable Slot"}
        size="lg"
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <strong>Schedule Conflict:</strong> {formError}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Section *</label>
              <select
                required
                value={slotForm.section_id}
                onChange={(e) => setSlotForm({ ...slotForm, section_id: e.target.value })}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
              >
                <option value="">Select Section</option>
                {sections.map((sec) => (
                  <option key={sec.section_id} value={sec.section_id}>
                    Sec {sec.section_code} ({sec.subject_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Instructor Faculty *</label>
              <select
                required
                value={slotForm.faculty_id}
                onChange={(e) => setSlotForm({ ...slotForm, faculty_id: e.target.value })}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
              >
                <option value="">Select Instructor</option>
                {facultyList.map((f) => (
                  <option key={f.faculty_id} value={f.faculty_id}>
                    {f.full_name} ({f.employee_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Classroom / Hall *</label>
              <select
                required
                value={slotForm.classroom_id}
                onChange={(e) => setSlotForm({ ...slotForm, classroom_id: e.target.value })}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
              >
                <option value="">Select Classroom</option>
                {classroomList.map((r) => (
                  <option key={r.classroom_id} value={r.classroom_id}>
                    Room {r.room_no} ({r.block_name || "Main Block"}) - Cap {r.capacity}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Day of the Week *</label>
              <select
                value={slotForm.day_of_week}
                onChange={(e) => setSlotForm({ ...slotForm, day_of_week: Number(e.target.value) })}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Start Time (HH:MM:SS) *</label>
              <input
                type="text"
                required
                value={slotForm.start_time}
                onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                placeholder="09:00:00"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">End Time (HH:MM:SS) *</label>
              <input
                type="text"
                required
                value={slotForm.end_time}
                onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                placeholder="10:00:00"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-800 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSlotModalOpen(false)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Checking & Allocating..." : "Save Timetable Slot"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AcademicsManagementView;
