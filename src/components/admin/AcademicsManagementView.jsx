import { useState, useEffect, useMemo } from "react";
import {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  getPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  getDegrees,
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
  getAcademicYears,
  getAcademicTerms,
} from "../../api/academics";
import { getDepartments, getFaculty, getClassrooms } from "../../api/admin";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import Modal from "../common/Modal";
import ConfirmDialog from "../common/ConfirmDialog";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import { deliveryStyleOf } from "../common/deliveryStyle";
import { DeliveryLegend } from "../common/DeliveryLegend";

import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  AcademicCapIcon,
  BookOpenIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  BuildingLibraryIcon,
  FunnelIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const DAYS_OF_WEEK = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
];

export function AcademicsManagementView({ token, refreshTrigger = 0 }) {
  // Tabs: "hierarchy" | "timetable" | "sections" | "offerings" | "subjects"
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem("ju_academics_tab") || "timetable";
    } catch {
      return "timetable";
    }
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem("ju_academics_tab", tab);
    } catch {
      // Ignore storage errors
    }
  };

  const [hierarchySubTab, setHierarchySubTabState] = useState(() => {
    try {
      return sessionStorage.getItem("ju_academics_hierarchy_subtab") || "programs";
    } catch {
      return "programs";
    }
  });

  const setHierarchySubTab = (subTab) => {
    setHierarchySubTabState(subTab);
    try {
      sessionStorage.setItem("ju_academics_hierarchy_subtab", subTab);
    } catch {
      // Ignore storage errors
    }
  };

  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Hierarchy Data States
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicTerms, setAcademicTerms] = useState([]);

  // Academics Data States
  const [subjects, setSubjects] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [sections, setSections] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);

  // Supporting Dropdown Data
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [classroomList, setClassroomList] = useState([]);

  // Cascading 5-Tier Timetable Filter State
  const [filterSchool, setFilterSchool] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterProgram, setFilterProgram] = useState("ALL");
  const [filterBatch, setFilterBatch] = useState("ALL");
  const [filterSection, setFilterSection] = useState("ALL");
  const [dayFilter, setDayFilter] = useState("ALL");

  // Modals state
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [schoolForm, setSchoolForm] = useState({ code: "", name: "", is_active: 1 });

  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [programForm, setProgramForm] = useState({
    school_id: "",
    department_id: "",
    degree_id: "",
    name: "",
    programme_code: "",
    partner_track: "STANDARD",
    duration_years: 4.0,
    is_active: 1,
  });

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [batchForm, setBatchForm] = useState({
    programme_id: "",
    start_year_id: "",
    label: "",
  });

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    subject_code: "",
    name: "",
    department_id: "",
    credits: 3,
    delivery_type: "THEORY",
    course_category: "CORE",
    is_active: 1,
  });

  const [isOfferingModalOpen, setIsOfferingModalOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState(null);
  const [offeringForm, setOfferingForm] = useState({
    subject_id: "",
    term_id: "",
    coordinator_faculty_id: "",
    is_active: 1,
  });

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({
    offering_id: "",
    batch_id: "",
    section_code: "A",
    max_strength: 60,
  });

  const [isSlotModalOpen, setIsSlotModalOpenState] = useState(() => {
    try {
      return sessionStorage.getItem("ju_academics_slot_modal_open") === "1";
    } catch {
      return false;
    }
  });

  const setIsSlotModalOpen = (open) => {
    setIsSlotModalOpenState(open);
    try {
      if (open) {
        sessionStorage.setItem("ju_academics_slot_modal_open", "1");
      } else {
        sessionStorage.removeItem("ju_academics_slot_modal_open");
      }
    } catch {
      // Ignore storage errors
    }
  };

  const [editingSlot, setEditingSlot] = useState(null);
  const [slotForm, setSlotFormState] = useState(() => {
    try {
      const saved = sessionStorage.getItem("ju_academics_slot_form");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            section_id: parsed.section_id ?? "",
            faculty_id: parsed.faculty_id ?? "",
            classroom_id: parsed.classroom_id ?? "",
            day_of_week: Number(parsed.day_of_week) || 1,
            start_time: parsed.start_time || "09:00:00",
            end_time: parsed.end_time || "10:00:00",
            effective_from: parsed.effective_from || new Date().toISOString().split("T")[0],
            effective_to: parsed.effective_to || "",
            is_active: parsed.is_active !== undefined ? parsed.is_active : 1,
          };
        }
      }
    } catch {
      // Ignore
    }
    return {
      section_id: "",
      faculty_id: "",
      classroom_id: "",
      day_of_week: 1,
      start_time: "09:00:00",
      end_time: "10:00:00",
      effective_from: new Date().toISOString().split("T")[0],
      effective_to: "",
      is_active: 1,
    };
  });

  const setSlotForm = (updater) => {
    setSlotFormState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        sessionStorage.setItem("ju_academics_slot_form", JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Application Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    itemDetails: null,
    confirmText: "Confirm",
    confirmVariant: "danger",
    onConfirm: null,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleConfirmAction = async () => {
    if (!confirmDialog.onConfirm) return;
    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
    } catch (err) {
      setError(err.message || "Operation failed.");
      setTimeout(() => setError(""), 5000);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
    } finally {
      setConfirmLoading(false);
    }
  };

  // Load all academics & hierarchy data
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadAllAcademics() {
      try {
        setLoading(true);
        setError("");

        const [
          schoolsRes,
          progsRes,
          batchesRes,
          degRes,
          subjRes,
          offRes,
          secRes,
          ttRes,
          deptRes,
          facRes,
          roomRes,
          yearsRes,
          termsRes,
        ] = await Promise.all([
          getSchools(token, null, controller.signal).catch(() => ({ data: [] })),
          getPrograms(token, null, controller.signal).catch(() => ({ data: [] })),
          getBatches(token, null, controller.signal).catch(() => ({ data: [] })),
          getDegrees(token, controller.signal).catch(() => ({ data: [] })),
          getSubjects(token, null, controller.signal).catch(() => ({ data: [] })),
          getCourseOfferings(token, null, controller.signal).catch(() => ({ data: [] })),
          getSections(token, null, controller.signal).catch(() => ({ data: [] })),
          getTimetableSlots(token, null, controller.signal).catch(() => ({ data: [] })),
          getDepartments(token, controller.signal).catch(() => ({ data: [] })),
          getFaculty(token, controller.signal).catch(() => ({ data: [] })),
          getClassrooms(token, controller.signal).catch(() => ({ data: [] })),
          getAcademicYears(token, controller.signal).catch(() => ({ data: [] })),
          getAcademicTerms(token, controller.signal).catch(() => ({ data: [] })),
        ]);

        setSchools(Array.isArray(schoolsRes?.data) ? schoolsRes.data : []);
        setPrograms(Array.isArray(progsRes?.data) ? progsRes.data : []);
        setBatches(Array.isArray(batchesRes?.data) ? batchesRes.data : []);
        setDegrees(Array.isArray(degRes?.data) ? degRes.data : []);
        setSubjects(Array.isArray(subjRes?.data) ? subjRes.data : []);
        setOfferings(Array.isArray(offRes?.data) ? offRes.data : []);
        setSections(Array.isArray(secRes?.data) ? secRes.data : []);
        setTimetableSlots(Array.isArray(ttRes?.data) ? ttRes.data : []);
        setDepartments(Array.isArray(deptRes?.data) ? deptRes.data : []);
        setFacultyList(Array.isArray(facRes?.data) ? facRes.data : []);
        setClassroomList(Array.isArray(roomRes?.data) ? roomRes.data : []);
        setAcademicYears(Array.isArray(yearsRes?.data) ? yearsRes.data : []);
        setAcademicTerms(Array.isArray(termsRes?.data) ? termsRes.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load academics data.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAllAcademics();
    return () => controller.abort();
  }, [token, reloadTrigger, refreshTrigger]);

  // -------------------------------------------------------------
  // Cascading Filter Logic
  // -------------------------------------------------------------
  const filteredDepartments = useMemo(() => {
    if (filterSchool === "ALL") return departments;
    return departments.filter((d) => Number(d.school_id) === Number(filterSchool));
  }, [departments, filterSchool]);

  const filteredPrograms = useMemo(() => {
    let list = programs;
    if (filterSchool !== "ALL") {
      list = list.filter((p) => Number(p.school_id) === Number(filterSchool));
    }
    if (filterDepartment !== "ALL") {
      list = list.filter((p) => Number(p.department_id) === Number(filterDepartment));
    }
    return list;
  }, [programs, filterSchool, filterDepartment]);

  const filteredBatches = useMemo(() => {
    if (filterProgram !== "ALL") {
      return batches.filter((b) => Number(b.programme_id) === Number(filterProgram));
    }
    // Scope batches to only programs matching active school and department filter
    const allowedProgramIds = new Set(filteredPrograms.map((p) => Number(p.programme_id)));
    return batches.filter((b) => allowedProgramIds.has(Number(b.programme_id)));
  }, [batches, filterProgram, filteredPrograms]);

  const filteredSections = useMemo(() => {
    if (filterBatch !== "ALL") {
      return sections.filter((s) => Number(s.batch_id) === Number(filterBatch));
    }
    // Scope sections to only batches matching active hierarchy filter
    const allowedBatchIds = new Set(filteredBatches.map((b) => Number(b.batch_id)));
    return sections.filter((s) => allowedBatchIds.has(Number(s.batch_id)));
  }, [sections, filterBatch, filteredBatches]);

  // Timetable Slots filtered by the 5 tiers + Day
  const filteredTimetableSlots = useMemo(() => {
    return timetableSlots.filter((slot) => {
      if (filterSchool !== "ALL" && Number(slot.school_id) !== Number(filterSchool)) {
        return false;
      }
      if (filterDepartment !== "ALL" && Number(slot.department_id) !== Number(filterDepartment)) {
        return false;
      }
      if (filterProgram !== "ALL" && Number(slot.programme_id) !== Number(filterProgram)) {
        return false;
      }
      if (filterBatch !== "ALL" && Number(slot.batch_id) !== Number(filterBatch)) {
        return false;
      }
      if (filterSection !== "ALL" && Number(slot.section_id) !== Number(filterSection)) {
        return false;
      }
      if (dayFilter !== "ALL" && Number(slot.day_of_week) !== Number(dayFilter)) {
        return false;
      }
      return true;
    });
  }, [timetableSlots, filterSchool, filterDepartment, filterProgram, filterBatch, filterSection, dayFilter]);

  const handleResetFilters = () => {
    setFilterSchool("ALL");
    setFilterDepartment("ALL");
    setFilterProgram("ALL");
    setFilterBatch("ALL");
    setFilterSection("ALL");
    setDayFilter("ALL");
  };

  // -------------------------------------------------------------
  // School Actions
  // -------------------------------------------------------------
  const handleOpenCreateSchool = () => {
    setEditingSchool(null);
    setSchoolForm({ code: "", name: "", is_active: 1 });
    setFormError("");
    setIsSchoolModalOpen(true);
  };

  const handleOpenEditSchool = (row) => {
    setEditingSchool(row);
    setSchoolForm({
      code: row.code || "",
      name: row.name || "",
      is_active: row.is_active ? 1 : 0,
    });
    setFormError("");
    setIsSchoolModalOpen(true);
  };

  const handleSaveSchool = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      if (editingSchool) {
        await updateSchool(token, editingSchool.school_id, schoolForm);
        setActionSuccess(`School "${schoolForm.name}" updated successfully.`);
      } else {
        await createSchool(token, schoolForm);
        setActionSuccess(`School "${schoolForm.name}" created successfully.`);
      }
      setIsSchoolModalOpen(false);
      setReloadTrigger((prev) => prev + 1);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setFormError(err.message || "Failed to save school.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchool = (row) => {
    setConfirmDialog({
      isOpen: true,
      title: "Deactivate School",
      message: `Are you sure you want to deactivate school "${row.name}"? This will set the school status to inactive.`,
      itemDetails: [
        { label: "School Code", value: row.code },
        { label: "School Name", value: row.name },
      ],
      confirmText: "Deactivate",
      confirmVariant: "danger",
      onConfirm: async () => {
        await deleteSchool(token, row.school_id);
        setActionSuccess(`School "${row.name}" deactivated.`);
        setReloadTrigger((prev) => prev + 1);
        setTimeout(() => setActionSuccess(""), 4000);
      },
    });
  };

  // -------------------------------------------------------------
  // Program Actions
  // -------------------------------------------------------------
  const handleOpenCreateProgram = () => {
    setEditingProgram(null);
    setProgramForm({
      school_id: schools[0]?.school_id || 1,
      department_id: departments[0]?.department_id || "",
      degree_id: degrees[0]?.degree_id || 1,
      name: "",
      programme_code: "",
      partner_track: "STANDARD",
      duration_years: 4.0,
      is_active: 1,
    });
    setFormError("");
    setIsProgramModalOpen(true);
  };

  const handleOpenEditProgram = (row) => {
    setEditingProgram(row);
    setProgramForm({
      school_id: row.school_id || (schools[0]?.school_id || 1),
      department_id: row.department_id || "",
      degree_id: row.degree_id || 1,
      name: row.name || "",
      programme_code: row.programme_code || "",
      partner_track: row.partner_track || "STANDARD",
      duration_years: row.duration_years || 4.0,
      is_active: row.is_active ? 1 : 0,
    });
    setFormError("");
    setIsProgramModalOpen(true);
  };

  const handleSaveProgram = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      if (editingProgram) {
        await updateProgram(token, editingProgram.programme_id, programForm);
        setActionSuccess(`Program "${programForm.name}" updated successfully.`);
      } else {
        await createProgram(token, programForm);
        setActionSuccess(`Program "${programForm.name}" created successfully.`);
      }
      setIsProgramModalOpen(false);
      setReloadTrigger((prev) => prev + 1);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setFormError(err.message || "Failed to save program.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProgram = (row) => {
    setConfirmDialog({
      isOpen: true,
      title: "Deactivate Academic Program",
      message: `Are you sure you want to deactivate program "${row.name}"? Active batches will preserve their links.`,
      itemDetails: [
        { label: "Program Code", value: row.programme_code || row.code || "N/A" },
        { label: "Program Name", value: row.name },
      ],
      confirmText: "Deactivate",
      confirmVariant: "danger",
      onConfirm: async () => {
        await deleteProgram(token, row.programme_id);
        setActionSuccess(`Program "${row.name}" deactivated.`);
        setReloadTrigger((prev) => prev + 1);
        setTimeout(() => setActionSuccess(""), 4000);
      },
    });
  };

  // -------------------------------------------------------------
  // Batch Actions
  // -------------------------------------------------------------
  const handleOpenCreateBatch = () => {
    setEditingBatch(null);
    setBatchForm({
      programme_id: programs[0]?.programme_id || "",
      start_year_id: academicYears[0]?.academic_year_id || academicYears[0]?.year_id || "",
      label: "",
    });
    setFormError("");
    setIsBatchModalOpen(true);
  };

  const handleOpenEditBatch = (row) => {
    setEditingBatch(row);
    setBatchForm({
      programme_id: row.programme_id || "",
      start_year_id: row.start_year_id || "",
      label: row.label || "",
    });
    setFormError("");
    setIsBatchModalOpen(true);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const payload = {
        ...batchForm,
        start_year_id: Number(batchForm.start_year_id),
      };
      if (editingBatch) {
        await updateBatch(token, editingBatch.batch_id, payload);
        setActionSuccess(`Batch "${batchForm.label}" updated successfully.`);
      } else {
        await createBatch(token, payload);
        setActionSuccess(`Batch "${batchForm.label}" created successfully.`);
      }
      setIsBatchModalOpen(false);
      setReloadTrigger((prev) => prev + 1);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setFormError(err.message || "Failed to save batch.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBatch = (row) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Cohort Batch",
      message: `Are you sure you want to delete batch "${row.label}"? Only batches with no enrolled students or sections can be removed.`,
      itemDetails: [
        { label: "Batch", value: `Batch ${row.label}` },
        { label: "Academic Year", value: row.academic_year_label || `Year #${row.academic_year_id}` },
      ],
      confirmText: "Delete",
      confirmVariant: "danger",
      onConfirm: async () => {
        await deleteBatch(token, row.batch_id);
        setActionSuccess(`Batch "${row.label}" deleted.`);
        setReloadTrigger((prev) => prev + 1);
        setTimeout(() => setActionSuccess(""), 4000);
      },
    });
  };

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
      delivery_type: "THEORY",
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
      department_id: row.department_id || row.owner_department_id || "",
      credits: row.credits || 3,
      delivery_type: row.delivery_type || "THEORY",
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
      const payload = {
        ...subjectForm,
        department_id: subjectForm.department_id ? Number(subjectForm.department_id) : null,
        owner_department_id: subjectForm.department_id ? Number(subjectForm.department_id) : null,
        credits: Number(subjectForm.credits) || 0,
        delivery_type: subjectForm.delivery_type || "THEORY",
      };
      if (editingSubject) {
        await updateSubject(token, editingSubject.subject_id, payload);
        setActionSuccess(`Subject "${subjectForm.name}" updated successfully.`);
      } else {
        await createSubject(token, payload);
        setActionSuccess(`Subject "${subjectForm.name}" created successfully.`);
      }
      setIsSubjectModalOpen(false);
      setReloadTrigger((prev) => prev + 1);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setFormError(err.message || "Failed to save subject.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = (row) => {
    setConfirmDialog({
      isOpen: true,
      title: "Deactivate Subject",
      message: `Are you sure you want to deactivate subject "${row.name}"? Inactive subjects cannot be assigned to new course offerings.`,
      itemDetails: [
        { label: "Subject Code", value: row.subject_code },
        { label: "Subject Name", value: row.name },
        { label: "Credits", value: row.credits },
      ],
      confirmText: "Deactivate",
      confirmVariant: "warning",
      onConfirm: async () => {
        await deleteSubject(token, row.subject_id);
        setActionSuccess(`Subject "${row.name}" deactivated.`);
        setReloadTrigger((prev) => prev + 1);
        setTimeout(() => setActionSuccess(""), 4000);
      },
    });
  };

  // -------------------------------------------------------------
  // Course Offering Actions
  // -------------------------------------------------------------
  const handleOpenCreateOffering = () => {
    setEditingOffering(null);
    setOfferingForm({
      subject_id: subjects[0]?.subject_id || "",
      term_id: academicTerms[0]?.term_id || "",
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
      term_id: row.term_id || "",
      coordinator_faculty_id: row.coordinator_faculty_id || "",
      is_active: row.is_active ? 1 : 0,
    });
    setFormError("");
    setIsOfferingModalOpen(true);
  };

  const handleSaveOffering = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const payload = {
        ...offeringForm,
        subject_id: Number(offeringForm.subject_id),
        term_id: Number(offeringForm.term_id),
        coordinator_faculty_id: offeringForm.coordinator_faculty_id
          ? Number(offeringForm.coordinator_faculty_id)
          : null,
        is_active: Number(offeringForm.is_active),
      };
      if (editingOffering) {
        await updateCourseOffering(token, editingOffering.offering_id, payload);
        setActionSuccess("Course offering updated successfully.");
      } else {
        await createCourseOffering(token, payload);
        setActionSuccess("Course offering created successfully.");
      }
      setIsOfferingModalOpen(false);
      setReloadTrigger((prev) => prev + 1);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setFormError(err.message || "Failed to save course offering.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOffering = (row) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Course Offering",
      message: `Are you sure you want to delete course offering #${row.offering_id}? Offerings referenced by existing sections cannot be deleted.`,
      itemDetails: [
        { label: "Offering ID", value: `#${row.offering_id}` },
        { label: "Subject", value: `${row.subject_code} - ${row.subject_name}` },
        { label: "Coordinator", value: row.coordinator_name || "Unassigned" },
      ],
      confirmText: "Delete",
      confirmVariant: "danger",
      onConfirm: async () => {
        await deleteCourseOffering(token, row.offering_id);
        setActionSuccess("Course offering deleted.");
        setReloadTrigger((prev) => prev + 1);
        setTimeout(() => setActionSuccess(""), 4000);
      },
    });
  };

  // -------------------------------------------------------------
  // Section Actions
  // -------------------------------------------------------------
  const handleOpenCreateSection = () => {
    setEditingSection(null);
    setSectionForm({
      offering_id: offerings[0]?.offering_id || "",
      batch_id: batches[0]?.batch_id || "",
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
      batch_id: row.batch_id || "",
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
        setActionSuccess(`Section "${sectionForm.section_code}" updated successfully.`);
      } else {
        await createSection(token, sectionForm);
        setActionSuccess(`Section "${sectionForm.section_code}" created successfully.`);
      }
      setIsSectionModalOpen(false);
      setReloadTrigger((prev) => prev + 1);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setFormError(err.message || "Failed to save section.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSection = (row) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Section",
      message: `Are you sure you want to delete section "${row.section_code}"? Sections referenced by timetable slots or active enrollments cannot be deleted.`,
      itemDetails: [
        { label: "Section Code", value: row.section_code },
        { label: "Subject", value: row.subject_code || `Offering #${row.offering_id}` },
        { label: "Batch", value: row.batch_label ? `Batch ${row.batch_label}` : "General" },
      ],
      confirmText: "Delete",
      confirmVariant: "danger",
      onConfirm: async () => {
        await deleteSection(token, row.section_id);
        setActionSuccess(`Section "${row.section_code}" deleted.`);
        setReloadTrigger((prev) => prev + 1);
        setTimeout(() => setActionSuccess(""), 4000);
      },
    });
  };

  // -------------------------------------------------------------
  // Timetable Slot Actions
  // -------------------------------------------------------------
  const handleOpenCreateSlot = () => {
    setEditingSlot(null);
    setFormError("");
    try {
      const saved = sessionStorage.getItem("ju_academics_slot_form");
      if (!saved) {
        const today = new Date().toISOString().split("T")[0];
        setSlotForm({
          section_id: sections[0]?.section_id || "",
          faculty_id: facultyList[0]?.faculty_id || "",
          classroom_id: classroomList[0]?.classroom_id || "",
          day_of_week: 1,
          start_time: "09:00:00",
          end_time: "10:00:00",
          effective_from: today,
          effective_to: "",
          is_active: 1,
        });
      }
    } catch {
      // Ignore storage errors
    }
    setIsSlotModalOpen(true);
  };

  const handleCancelSlotModal = () => {
    setIsSlotModalOpen(false);
    setEditingSlot(null);
    setFormError("");
    try {
      sessionStorage.removeItem("ju_academics_slot_modal_open");
      sessionStorage.removeItem("ju_academics_slot_form");
    } catch {
      // Ignore storage errors
    }
    const today = new Date().toISOString().split("T")[0];
    setSlotFormState({
      section_id: sections[0]?.section_id || "",
      faculty_id: facultyList[0]?.faculty_id || "",
      classroom_id: classroomList[0]?.classroom_id || "",
      day_of_week: 1,
      start_time: "09:00:00",
      end_time: "10:00:00",
      effective_from: today,
      effective_to: "",
      is_active: 1,
    });
  };

  const handleOpenEditSlot = (row) => {
    setEditingSlot(row);
    const today = new Date().toISOString().split("T")[0];
    setSlotForm({
      section_id: row.section_id || "",
      faculty_id: row.faculty_id || "",
      classroom_id: row.classroom_id || "",
      day_of_week: row.day_of_week || 1,
      start_time: row.start_time ? row.start_time.slice(0, 8) : "09:00:00",
      end_time: row.end_time ? row.end_time.slice(0, 8) : "10:00:00",
      effective_from: row.effective_from ? String(row.effective_from).slice(0, 10) : today,
      effective_to: row.effective_to ? String(row.effective_to).slice(0, 10) : "",
      is_active: row.is_active ? 1 : 0,
    });
    setFormError("");
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    setFormError("");

    const sectionId = slotForm.section_id || sections[0]?.section_id;
    const facultyId = slotForm.faculty_id || facultyList[0]?.faculty_id;
    const classroomId = slotForm.classroom_id || classroomList[0]?.classroom_id;

    if (!sectionId) {
      setFormError("Please select a student section.");
      return;
    }
    if (!facultyId) {
      setFormError("Please assign a faculty member.");
      return;
    }
    if (!classroomId) {
      setFormError("Please designate a classroom.");
      return;
    }
    if (!slotForm.effective_from) {
      setFormError("Effective start date is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        section_id: Number(sectionId),
        faculty_id: Number(facultyId),
        classroom_id: Number(classroomId),
        day_of_week: Number(slotForm.day_of_week),
        start_time:
          slotForm.start_time.length === 5
            ? `${slotForm.start_time}:00`
            : slotForm.start_time,
        end_time:
          slotForm.end_time.length === 5
            ? `${slotForm.end_time}:00`
            : slotForm.end_time,
        effective_from: slotForm.effective_from,
        effective_to: slotForm.effective_to ? slotForm.effective_to : null,
        is_active: Number(slotForm.is_active),
      };

      if (editingSlot) {
        await updateTimetableSlot(token, editingSlot.slot_id, payload);
        setActionSuccess("Timetable slot updated successfully.");
      } else {
        await createTimetableSlot(token, payload);
        setActionSuccess("Timetable slot allocated successfully.");
      }
      setIsSlotModalOpen(false);
      setEditingSlot(null);
      try {
        sessionStorage.removeItem("ju_academics_slot_modal_open");
        sessionStorage.removeItem("ju_academics_slot_form");
      } catch {
        // Ignore storage errors
      }
      setReloadTrigger((prev) => prev + 1);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setFormError(err.message || "Failed to allocate timetable slot.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = (row) => {
    const dayObj = DAYS_OF_WEEK.find((d) => d.id === Number(row.day_of_week));
    setConfirmDialog({
      isOpen: true,
      title: "Remove Timetable Slot",
      message: "Are you sure you want to deactivate this timetable slot? The slot will be retired while preserving historic attendance logs.",
      itemDetails: [
        { label: "Slot ID", value: `#${row.slot_id}` },
        { label: "Subject", value: `${row.subject_code} - ${row.subject_name}` },
        {
          label: "Schedule",
          value: `${dayObj ? dayObj.name : `Day ${row.day_of_week}`} ${row.start_time?.slice(0, 5)} - ${row.end_time?.slice(0, 5)}`,
        },
        {
          label: "Section / Room",
          value: `Sec ${row.section_code} • Room ${row.room_no || "TBD"}`,
        },
      ],
      confirmText: "Remove Slot",
      confirmVariant: "danger",
      onConfirm: async () => {
        await deleteTimetableSlot(token, row.slot_id);
        setActionSuccess("Timetable slot removed.");
        setReloadTrigger((prev) => prev + 1);
        setTimeout(() => setActionSuccess(""), 4000);
      },
    });
  };

  // -------------------------------------------------------------
  // Data Table Columns Definitions
  // -------------------------------------------------------------
  const schoolColumns = [
    {
      header: "Code",
      key: "code",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-green-800 bg-green-50 px-2 py-1 rounded">
          {row.code}
        </span>
      ),
    },
    {
      header: "School Name",
      key: "name",
      render: (row) => <span className="font-bold text-gray-900">{row.name}</span>,
    },
    {
      header: "Departments",
      key: "department_count",
      render: (row) => (
        <span className="text-xs text-gray-600 font-semibold">
          {row.department_count || 0} Departments
        </span>
      ),
    },
    {
      header: "Status",
      key: "is_active",
      render: (row) => <Badge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditSchool(row)}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-green-800"
            title="Edit School"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          {row.is_active === 1 && (
            <button
              type="button"
              onClick={() => handleDeleteSchool(row)}
              className="rounded-md p-1 text-gray-500 hover:bg-red-50 hover:text-red-700"
              title="Deactivate School"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const programColumns = [
    {
      header: "Code",
      key: "programme_code",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">
          {row.programme_code || "—"}
        </span>
      ),
    },
    {
      header: "Program Name",
      key: "name",
      render: (row) => (
        <div>
          <span className="font-bold text-gray-900">{row.name}</span>
          <div className="text-xs text-gray-500 font-medium">
            {row.degree_code ? `${row.degree_code} • ` : ""}
            {row.duration_years} Years ({row.partner_track})
          </div>
        </div>
      ),
    },
    {
      header: "School & Department",
      key: "hierarchy",
      render: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-gray-800">{row.school_name || row.school_code}</div>
          <div className="text-gray-500">{row.department_name || "Department Not Set"}</div>
        </div>
      ),
    },
    {
      header: "Batches",
      key: "batch_count",
      render: (row) => `${row.batch_count || 0} Batches`,
    },
    {
      header: "Status",
      key: "is_active",
      render: (row) => <Badge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditProgram(row)}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-green-800"
            title="Edit Program"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          {row.is_active === 1 && (
            <button
              type="button"
              onClick={() => handleDeleteProgram(row)}
              className="rounded-md p-1 text-gray-500 hover:bg-red-50 hover:text-red-700"
              title="Deactivate Program"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const batchColumns = [
    {
      header: "Batch Label",
      key: "label",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-green-900 bg-green-50 px-2 py-1 rounded">
          Batch {row.label}
        </span>
      ),
    },
    {
      header: "Academic Program",
      key: "programme_name",
      render: (row) => (
        <div>
          <span className="font-bold text-gray-900">{row.programme_name}</span>
          <div className="text-xs text-gray-500">
            {row.department_name ? `${row.department_name} • ` : ""}
            {row.school_name}
          </div>
        </div>
      ),
    },
    {
      header: "Start Academic Year",
      key: "start_year_label",
      render: (row) =>
        row.start_year_label ||
        academicYears.find((ay) => (ay.academic_year_id || ay.year_id) === row.start_year_id)?.year_label ||
        academicYears.find((ay) => (ay.academic_year_id || ay.year_id) === row.start_year_id)?.label ||
        "—",
    },
    {
      header: "Sections & Students",
      key: "counts",
      render: (row) => (
        <div className="text-xs font-medium text-gray-600">
          <span>{row.section_count || 0} Sections</span> •{" "}
          <span>{row.student_count || 0} Students</span>
        </div>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditBatch(row)}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-green-800"
            title="Edit Batch"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteBatch(row)}
            className="rounded-md p-1 text-gray-500 hover:bg-red-50 hover:text-red-700"
            title="Delete Batch"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const subjectColumns = [
    {
      header: "Code",
      key: "subject_code",
      render: (row) => {
        const style = deliveryStyleOf({ ...row, subject_name: row.subject_name || row.name });
        return (
          <span className={`font-mono text-xs font-bold px-2 py-1 rounded ${style.code}`}>
            {row.subject_code}
          </span>
        );
      },
    },
    {
      header: "Subject Name",
      key: "name",
      render: (row) => {
        const style = deliveryStyleOf({ ...row, subject_name: row.subject_name || row.name });
        return (
          <div>
            <span className="font-bold text-gray-900">{row.name}</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 font-medium">
              <span>Category: {row.course_category || "CORE"}</span>
              <span>•</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.chip}`}>
                {row.delivery_type || style.label}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Department",
      key: "department_name",
      render: (row) =>
        row.department_name ||
        departments.find(
          (d) => d.department_id === (row.department_id || row.owner_department_id),
        )?.name ||
        "—",
    },
    {
      header: "Credits",
      key: "credits",
      render: (row) => `${row.credits} Credits`,
    },
    {
      header: "Status",
      key: "is_active",
      render: (row) => <Badge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
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
      render: (row) => `#${row.offering_id}`,
    },
        {
      header: "Subject",
      key: "subject_name",
      render: (row) => {
        const style = deliveryStyleOf(row);
        return (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold ${style.code}`}>
                {row.subject_code}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.chip}`}>
                {style.label}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">{row.subject_name}</div>
          </div>
        );
      },
    },
    {
      header: "Academic Term",
      key: "term",
      render: (row) => {
        const term = academicTerms.find((t) => t.term_id === row.term_id);
        const yearLabel = row.academic_year_label || term?.year_label || term?.label || `Term #${row.term_id}`;
        const termType = row.term_type || term?.term_type || "";
        return (
          <div>
            <span className="font-semibold text-gray-800">{yearLabel}</span>
            {termType && <span className="text-xs text-gray-500 ml-1">({termType})</span>}
          </div>
        );
      },
    },
    {
      header: "Coordinator Faculty",
      key: "coordinator",
      render: (row) => row.coordinator_name || "Not Assigned",
    },
    {
      header: "Status",
      key: "is_active",
      render: (row) => <Badge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
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
        <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
          Section {row.section_code}
        </span>
      ),
    },
    {
      header: "Academic Batch & Program",
      key: "batch_program",
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">
            {row.batch_label ? `Batch ${row.batch_label}` : "No Batch Assigned"}
          </div>
          <div className="text-xs text-gray-600">
            {row.programme_name ? `${row.programme_name} • ` : ""}
            {row.department_name ? `${row.department_name} • ` : ""}
            {row.school_code || ""}
          </div>
        </div>
      ),
    },
        {
      header: "Subject / Offering",
      key: "subject",
      render: (row) => {
        const style = deliveryStyleOf(row);
        return (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {row.subject_code ? (
                <>
                  <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-bold ${style.code}`}>
                    {row.subject_code}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.chip}`}>
                    {style.label}
                  </span>
                </>
              ) : (
                <span className="font-bold text-gray-900">Course Offering</span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              {row.subject_name || `Offering #${row.offering_id}`}
            </div>
          </div>
        );
      },
    },
    {
      header: "Enrollment Capacity",
      key: "max_strength",
      render: (row) => (
        <span className="text-xs font-semibold text-gray-700">
          {row.enrolled_students_count || 0} / {row.max_strength || 60} Students
        </span>
      ),
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

  const slotColumns = [
    {
      header: "Day & Time",
      key: "schedule",
      className: "w-32",
      render: (row) => {
        const dayObj = DAYS_OF_WEEK.find((d) => d.id === Number(row.day_of_week));
        return (
          <div>
            <div className="font-bold text-gray-900">{dayObj ? dayObj.name : `Day ${row.day_of_week}`}</div>
            <div className="font-mono text-xs text-gray-500">
              {row.start_time?.slice(0, 5)} - {row.end_time?.slice(0, 5)}
            </div>
          </div>
        );
      },
    },
    {
      header: "Subject & Curriculum",
      key: "subject",
      wrap: true,
      className: "min-w-[180px] max-w-[260px]",
            render: (row) => {
        const style = deliveryStyleOf(row);
        return (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${style.code}`}>
                {row.subject_code}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.chip}`}>
                {style.label}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-gray-900 font-semibold">{row.subject_name}</div>
          </div>
        );
      },
    },
    {
      header: "Academic Hierarchy",
      key: "hierarchy",
      wrap: true,
      className: "min-w-[200px] max-w-[280px]",
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold text-gray-900">
            Section {row.section_code} • {row.batch_label ? `Batch ${row.batch_label}` : "General"}
          </div>
          <div className="text-gray-500">
            {row.programme_name ? `${row.programme_name} • ` : ""}
            {row.department_name || ""} ({row.school_code || ""})
          </div>
        </div>
      ),
    },
    {
      header: "Faculty & Classroom",
      key: "assigned",
      className: "min-w-[150px]",
      render: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-gray-800">{row.faculty_name}</div>
          <div className="text-gray-500">
            Room {row.room_no} {row.block_name ? `(${row.block_name})` : ""}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      key: "is_active",
      className: "w-24",
      render: (row) => <Badge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Actions",
      key: "actions",
      align: "right",
      className: "w-20 text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditSlot(row)}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-green-800"
            title="Edit Slot"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          {row.is_active === 1 && (
            <button
              type="button"
              onClick={() => handleDeleteSlot(row)}
              className="rounded-md p-1 text-gray-500 hover:bg-red-50 hover:text-red-700"
              title="Remove Slot"
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
      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {/* Main Navigation Tabs & Contextual Primary Action */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-gray-200 pb-2">
        <nav
          aria-label="Academic Management Tabs"
          className="flex overflow-x-auto gap-1 pb-1 lg:pb-0 scrollbar-none min-w-0 flex-1"
        >
          <button
            type="button"
            onClick={() => setActiveTab("timetable")}
            className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
              activeTab === "timetable"
                ? "border-green-800 text-green-800"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <CalendarDaysIcon className="h-4 w-4" />
            <span>Timetable Schedule</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === "timetable"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {timetableSlots.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sections")}
            className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
              activeTab === "sections"
                ? "border-green-800 text-green-800"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <UserGroupIcon className="h-4 w-4" />
            <span>Sections</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === "sections"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {sections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("offerings")}
            className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
              activeTab === "offerings"
                ? "border-green-800 text-green-800"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <AcademicCapIcon className="h-4 w-4" />
            <span>Course Offerings</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === "offerings"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {offerings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("subjects")}
            className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
              activeTab === "subjects"
                ? "border-green-800 text-green-800"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <BookOpenIcon className="h-4 w-4" />
            <span>Subjects</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === "subjects"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {subjects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("hierarchy")}
            className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
              activeTab === "hierarchy"
                ? "border-green-800 text-green-800"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <BuildingLibraryIcon className="h-4 w-4" />
            <span>Academic Structure</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === "hierarchy"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {schools.length + programs.length + batches.length}
            </span>
          </button>
        </nav>

        {/* Primary Contextual Action Button */}
        <div className="flex items-center gap-2 pt-1 lg:pt-0 shrink-0 self-end lg:self-center">
          {activeTab === "hierarchy" && hierarchySubTab === "schools" && (
            <button
              type="button"
              onClick={handleOpenCreateSchool}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
            >
              <PlusIcon className="h-4 w-4" /> Add School
            </button>
          )}

          {activeTab === "hierarchy" && hierarchySubTab === "programs" && (
            <button
              type="button"
              onClick={handleOpenCreateProgram}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
            >
              <PlusIcon className="h-4 w-4" /> Add Program
            </button>
          )}

          {activeTab === "hierarchy" && hierarchySubTab === "batches" && (
            <button
              type="button"
              onClick={handleOpenCreateBatch}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
            >
              <PlusIcon className="h-4 w-4" /> Create Batch
            </button>
          )}

          {activeTab === "subjects" && (
            <button
              type="button"
              onClick={handleOpenCreateSubject}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
            >
              <PlusIcon className="h-4 w-4" /> Add Subject
            </button>
          )}

          {activeTab === "offerings" && (
            <button
              type="button"
              onClick={handleOpenCreateOffering}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
            >
              <PlusIcon className="h-4 w-4" /> Create Offering
            </button>
          )}

          {activeTab === "sections" && (
            <button
              type="button"
              onClick={handleOpenCreateSection}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
            >
              <PlusIcon className="h-4 w-4" /> Add Section
            </button>
          )}

          {activeTab === "timetable" && (
            <button
              type="button"
              onClick={handleOpenCreateSlot}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
            >
              <PlusIcon className="h-4 w-4" /> Allocate Slot
            </button>
          )}
        </div>
      </div>
            {(activeTab === "timetable" ||
        activeTab === "sections" ||
        activeTab === "offerings" ||
        activeTab === "subjects") && (
        <div className="flex justify-end">
          <DeliveryLegend />
        </div>
      )}
      {/* Tab Panels */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner message="Loading hierarchical academic records..." />
          </div>
        ) : activeTab === "timetable" ? (
          <div>
            {/* Cascading 5-Tier Hierarchy Filter Header */}
            <div className="border-b border-gray-100 bg-gray-50/60 p-4">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
                  <FunnelIcon className="h-4 w-4 text-green-800" />
                  Hierarchical Academic Filters
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-green-800 hover:text-green-950"
                >
                  <ArrowPathIcon className="h-3.5 w-3.5" /> Reset All Filters
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {/* 1. School */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
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
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-green-600 focus:outline-none"
                  >
                    <option value="ALL">All Schools ({schools.length})</option>
                    {schools.map((s) => (
                      <option key={s.school_id} value={s.school_id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Department */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
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
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-green-600 focus:outline-none"
                  >
                    <option value="ALL">All Departments ({filteredDepartments.length})</option>
                    {filteredDepartments.map((d) => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.code ? `[${d.code}] ` : ""}
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Program */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    3. Program
                  </label>
                  <select
                    value={filterProgram}
                    onChange={(e) => {
                      setFilterProgram(e.target.value);
                      setFilterBatch("ALL");
                      setFilterSection("ALL");
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-green-600 focus:outline-none"
                  >
                    <option value="ALL">All Programs ({filteredPrograms.length})</option>
                    {filteredPrograms.map((p) => (
                      <option key={p.programme_id} value={p.programme_id}>
                        {p.programme_code ? `[${p.programme_code}] ` : ""}
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Batch */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    4. Batch
                  </label>
                  <select
                    value={filterBatch}
                    onChange={(e) => {
                      setFilterBatch(e.target.value);
                      setFilterSection("ALL");
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-green-600 focus:outline-none"
                  >
                    <option value="ALL">All Batches ({filteredBatches.length})</option>
                    {filteredBatches.map((b) => (
                      <option key={b.batch_id} value={b.batch_id}>
                        Batch {b.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Section */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    5. Section
                  </label>
                  <select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-green-600 focus:outline-none"
                  >
                    <option value="ALL">All Sections ({filteredSections.length})</option>
                    {filteredSections.map((s) => (
                      <option key={s.section_id} value={s.section_id}>
                        Sec {s.section_code} ({s.subject_code || `Off #${s.offering_id}`})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Day Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Day of Week
                  </label>
                  <select
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-green-600 focus:outline-none"
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

            {/* Timetable Table */}
            <DataTable
              key="academics-timetable-table"
              data={filteredTimetableSlots}
              columns={slotColumns}
              searchable
              searchPlaceholder="Search timetable slots by subject, room, faculty, or section..."
              emptyMessage="No timetable slots found matching the selected hierarchical filters."
              emptyAction={
                (filterSchool !== "ALL" ||
                  filterDepartment !== "ALL" ||
                  filterProgram !== "ALL" ||
                  filterBatch !== "ALL" ||
                  filterSection !== "ALL" ||
                  dayFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-green-800 bg-white px-3 py-1.5 text-xs font-semibold text-green-800 shadow-xs hover:bg-green-50 transition"
                  >
                    Reset Hierarchy Filters
                  </button>
                )
              }
            />
          </div>
        ) : activeTab === "sections" ? (
          <DataTable
            key="academics-sections-table"
            data={sections}
            columns={sectionColumns}
            searchable
            searchPlaceholder="Search sections by code, batch, or subject..."
            emptyMessage="No student course sections configured."
          />
        ) : activeTab === "offerings" ? (
          <DataTable
            key="academics-offerings-table"
            data={offerings}
            columns={offeringColumns}
            searchable
            searchPlaceholder="Search course offerings..."
            emptyMessage="No active course offerings."
          />
        ) : activeTab === "subjects" ? (
          <DataTable
            key="academics-subjects-table"
            data={subjects}
            columns={subjectColumns}
            searchable
            searchPlaceholder="Search subjects by code or name..."
            emptyMessage="No academic subjects configured."
          />
        ) : (
          /* Academic Structure Tab */
          <div>
            {/* Sub-tab segmented bar */}
            <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2">
              <button
                type="button"
                onClick={() => setHierarchySubTab("programs")}
                className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  hierarchySubTab === "programs"
                    ? "bg-green-800 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Academic Programs ({programs.length})
              </button>

              <button
                type="button"
                onClick={() => setHierarchySubTab("batches")}
                className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  hierarchySubTab === "batches"
                    ? "bg-green-800 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Program Batches ({batches.length})
              </button>

              <button
                type="button"
                onClick={() => setHierarchySubTab("schools")}
                className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  hierarchySubTab === "schools"
                    ? "bg-green-800 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Constituent Schools ({schools.length})
              </button>
            </div>

            {hierarchySubTab === "programs" ? (
              <DataTable
                key="hierarchy-programs-table"
                data={programs}
                columns={programColumns}
                searchable
                searchPlaceholder="Search programs by name, code, or department..."
                emptyMessage="No academic programs found."
              />
            ) : hierarchySubTab === "batches" ? (
              <DataTable
                key="hierarchy-batches-table"
                data={batches}
                columns={batchColumns}
                searchable
                searchPlaceholder="Search batches by label or program..."
                emptyMessage="No batches found."
              />
            ) : (
              <DataTable
                key="hierarchy-schools-table"
                data={schools}
                columns={schoolColumns}
                searchable
                searchPlaceholder="Search schools by code or name..."
                emptyMessage="No constituent schools found."
              />
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Modals                                                        */}
      {/* ------------------------------------------------------------- */}

      {/* School Modal */}
      <Modal
        isOpen={isSchoolModalOpen}
        onClose={() => setIsSchoolModalOpen(false)}
        title={editingSchool ? "Edit Constituent School" : "Add Constituent School"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveSchool} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              School Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={schoolForm.code}
              onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value.toUpperCase() })}
              placeholder="e.g. SOCI, SOET"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              School Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={schoolForm.name}
              onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
              placeholder="e.g. School of Computational Intelligence"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">Status</label>
            <select
              value={schoolForm.is_active}
              onChange={(e) => setSchoolForm({ ...schoolForm, is_active: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSchoolModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingSchool ? "Save Changes" : "Create School"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Program Modal */}
      <Modal
        isOpen={isProgramModalOpen}
        onClose={() => setIsProgramModalOpen(false)}
        title={editingProgram ? "Edit Academic Program" : "Add Academic Program"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveProgram} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Program Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={programForm.name}
              onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
              placeholder="e.g. Artificial Intelligence & Machine Learning"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Program Code
              </label>
              <input
                type="text"
                value={programForm.programme_code}
                onChange={(e) => setProgramForm({ ...programForm, programme_code: e.target.value.toUpperCase() })}
                placeholder="e.g. AIML, CSE"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Degree Level <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={programForm.degree_id}
                onChange={(e) => setProgramForm({ ...programForm, degree_id: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              >
                {degrees.map((deg) => (
                  <option key={deg.degree_id} value={deg.degree_id}>
                    {deg.code} - {deg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Constituent School <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={programForm.school_id}
                onChange={(e) => {
                  const sId = Number(e.target.value);
                  const firstDept = departments.find((d) => Number(d.school_id) === sId);
                  setProgramForm({
                    ...programForm,
                    school_id: sId,
                    department_id: firstDept ? firstDept.department_id : "",
                  });
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              >
                {schools.map((s) => (
                  <option key={s.school_id} value={s.school_id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Department
              </label>
              <select
                value={programForm.department_id}
                onChange={(e) => setProgramForm({ ...programForm, department_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {departments
                  .filter((d) => Number(d.school_id) === Number(programForm.school_id))
                  .map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Duration (Years)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="6"
                value={programForm.duration_years}
                onChange={(e) => setProgramForm({ ...programForm, duration_years: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Partner Track
              </label>
              <input
                type="text"
                value={programForm.partner_track}
                onChange={(e) => setProgramForm({ ...programForm, partner_track: e.target.value })}
                placeholder="STANDARD"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsProgramModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingProgram ? "Save Changes" : "Create Program"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title={editingBatch ? "Edit Academic Batch" : "Create Academic Batch"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveBatch} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Academic Program <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={batchForm.programme_id}
              onChange={(e) => setBatchForm({ ...batchForm, programme_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            >
              {programs.map((p) => (
                <option key={p.programme_id} value={p.programme_id}>
                  {p.name} ({p.programme_code || `ID #${p.programme_id}`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Batch Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={batchForm.label}
              onChange={(e) => setBatchForm({ ...batchForm, label: e.target.value })}
              placeholder="e.g. 2026-30"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Start Academic Year <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={batchForm.start_year_id}
              onChange={(e) => setBatchForm({ ...batchForm, start_year_id: e.target.value ? Number(e.target.value) : "" })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            >
              <option value="">Select Academic Year</option>
              {academicYears.map((ay) => {
                const ayId = ay.academic_year_id || ay.year_id;
                return (
                  <option key={ayId} value={ayId}>
                    {ay.year_label || ay.label} {ay.is_current ? "(Current)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingBatch ? "Save Changes" : "Create Batch"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubject ? "Edit Curriculum Subject" : "Add Curriculum Subject"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Subject Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subjectForm.subject_code}
              onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value.toUpperCase() })}
              placeholder="e.g. CS101, AIML201"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              placeholder="e.g. Data Structures and Algorithms"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Department
            </label>
            <select
              value={subjectForm.department_id || ""}
              onChange={(e) => setSubjectForm({ ...subjectForm, department_id: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            >
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">Credits</label>
              <input
                type="number"
                min="1"
                max="10"
                value={subjectForm.credits}
                onChange={(e) => setSubjectForm({ ...subjectForm, credits: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">Category</label>
              <select
                value={subjectForm.course_category}
                onChange={(e) => setSubjectForm({ ...subjectForm, course_category: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              >
                <option value="CORE">CORE</option>
                <option value="ELECTIVE">ELECTIVE</option>
                <option value="LAB">LAB</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">Delivery Type</label>
            <select
              value={subjectForm.delivery_type}
              onChange={(e) => setSubjectForm({ ...subjectForm, delivery_type: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            >
              <option value="THEORY">THEORY</option>
              <option value="LAB">LAB</option>
              <option value="PROJECT">PROJECT</option>
              <option value="INTERNSHIP">INTERNSHIP</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSubjectModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingSubject ? "Save Changes" : "Create Subject"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Course Offering Modal */}
      <Modal
        isOpen={isOfferingModalOpen}
        onClose={() => setIsOfferingModalOpen(false)}
        title={editingOffering ? "Edit Course Offering" : "Create Course Offering"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveOffering} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={offeringForm.subject_id}
              onChange={(e) => setOfferingForm({ ...offeringForm, subject_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            >
              {subjects.map((sub) => (
                <option key={sub.subject_id} value={sub.subject_id}>
                  {sub.subject_code} - {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Academic Term <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={offeringForm.term_id}
              onChange={(e) => setOfferingForm({ ...offeringForm, term_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            >
              <option value="">Select Academic Term</option>
              {academicTerms.map((term) => (
                <option key={term.term_id} value={term.term_id}>
                  {term.term_type} {term.year_label ? `(${term.year_label})` : ""} {term.is_current ? "— Current" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Coordinator Faculty
            </label>
            <select
              value={offeringForm.coordinator_faculty_id}
              onChange={(e) => setOfferingForm({ ...offeringForm, coordinator_faculty_id: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            >
              <option value="">Unassigned</option>
              {facultyList.map((f) => {
                const isInactive = f.is_active === 0 || f.is_active === false;
                return (
                  <option key={f.faculty_id} value={f.faculty_id} disabled={isInactive}>
                    {f.full_name} ({f.employee_code || `FAC#${f.faculty_id}`}){isInactive ? " — [Inactive / Resigned]" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOfferingModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingOffering ? "Save Changes" : "Create Offering"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Section Modal (With Batch Selection) */}
      <Modal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        title={editingSection ? "Edit Section" : "Add Student Section"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveSection} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Course Offering <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={sectionForm.offering_id}
              onChange={(e) => setSectionForm({ ...sectionForm, offering_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            >
              {offerings.map((off) => (
                <option key={off.offering_id} value={off.offering_id}>
                  {off.subject_code} - {off.subject_name} (Off #{off.offering_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Academic Batch <span className="text-green-800 font-bold">(Hierarchy Tier 4)</span>
            </label>
            <select
              value={sectionForm.batch_id}
              onChange={(e) => setSectionForm({ ...sectionForm, batch_id: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
            >
              <option value="">No Batch Assigned</option>
              {batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  Batch {b.label} • {b.programme_name || `Program #${b.programme_id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Section Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sectionForm.section_code}
                onChange={(e) => setSectionForm({ ...sectionForm, section_code: e.target.value.toUpperCase() })}
                placeholder="e.g. A, B, C"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Max Capacity
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={sectionForm.max_strength}
                onChange={(e) => setSectionForm({ ...sectionForm, max_strength: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSectionModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingSection ? "Save Changes" : "Create Section"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Timetable Slot Modal */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title={editingSlot ? "Edit Timetable Slot" : "Allocate Timetable Slot"}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          {/* Group 1: Target Course & Section */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-green-900">
              1. Academic Course & Section
            </h4>
            <div>
              <label className="block text-xs font-semibold text-gray-700">
                Student Section <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={slotForm.section_id || sections[0]?.section_id || ""}
                onChange={(e) => setSlotForm({ ...slotForm, section_id: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
              >
                {sections.map((sec) => (
                  <option key={sec.section_id} value={sec.section_id}>
                    Sec {sec.section_code} • {sec.subject_code} ({sec.subject_name || ""}) • {sec.batch_label ? `Batch ${sec.batch_label}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select the target student section for scheduled lectures.
              </p>
            </div>
          </div>

          {/* Group 2: Faculty & Venue Allocation */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-green-900">
              2. Instructor & Venue Allocation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Assigned Faculty <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={slotForm.faculty_id || facultyList[0]?.faculty_id || ""}
                  onChange={(e) => setSlotForm({ ...slotForm, faculty_id: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                >
                  {facultyList.map((f) => {
                    const isInactive = f.is_active === 0 || f.is_active === false;
                    return (
                      <option key={f.faculty_id} value={f.faculty_id} disabled={isInactive}>
                        {f.full_name} ({f.employee_code || `FAC#${f.faculty_id}`}){isInactive ? " — [Inactive / Resigned]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Designated Classroom <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={slotForm.classroom_id || classroomList[0]?.classroom_id || ""}
                  onChange={(e) => setSlotForm({ ...slotForm, classroom_id: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                >
                  {classroomList.map((c) => (
                    <option key={c.classroom_id} value={c.classroom_id}>
                      Room {c.room_no} ({c.block_name || `Block ${c.block_id}`})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Group 3: Schedule Timing */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-green-900">
              3. Weekly Schedule & Timing
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Day of Week <span className="text-red-500">*</span>
                </label>
                <select
                  value={slotForm.day_of_week}
                  onChange={(e) => setSlotForm({ ...slotForm, day_of_week: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  step="60"
                  required
                  value={slotForm.start_time}
                  onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  step="60"
                  required
                  value={slotForm.end_time}
                  onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Group 4: Term Validity Window */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-green-900">
              4. Term Validity Window
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Effective Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={slotForm.effective_from}
                  onChange={(e) => setSlotForm({ ...slotForm, effective_from: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Beginning date for this lecture timetable slot.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Effective End Date <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={slotForm.effective_to}
                  onChange={(e) => setSlotForm({ ...slotForm, effective_to: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank for whole semester duration.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCancelSlotModal}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-5 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50 focus:outline-none"
            >
              {submitting ? "Saving Slot..." : editingSlot ? "Save Changes" : "Allocate Slot"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Application Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, onConfirm: null }))
        }
        onConfirm={handleConfirmAction}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemDetails={confirmDialog.itemDetails}
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.confirmVariant}
        loading={confirmLoading}
      />
    </div>
  );
}

export default AcademicsManagementView;
