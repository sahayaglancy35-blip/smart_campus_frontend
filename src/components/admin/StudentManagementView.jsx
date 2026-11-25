import { useState, useEffect, useMemo } from "react";
import {
  getStudents,
  createStudentWithPhoto,
  updateStudent,
  deleteStudent,
  uploadStudentPhoto,
  deleteStudentPhoto,
} from "../../api/admin";
import {
  getSchools,
  getDepartments,
  getPrograms,
  getBatches,
  getSections,
} from "../../api/academics";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import Avatar from "../common/Avatar";
import PhotoUpload from "../common/PhotoUpload";
import { getPhotoPath } from "../../utils/photo";
import IdCardActions, { IdCardPreviewModal } from "./IdCardActions";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  UserIcon,
  IdentificationIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

const STUDENT_STATUSES = [
  "ACTIVE",
  "SEMESTER_WITHDRAWAL",
  "INTERNSHIP_BREAK",
  "DISCIPLINARY_WITHDRAWAL",
  "TERMINATED",
  "GRADUATED",
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none";
const SELECT_CLASS = `${INPUT_CLASS} bg-white`;

const EMPTY_FORM = {
  register_no: "",
  full_name: "",
  email: "",
  phone: "",
  gender: "",
  date_of_birth: "",
  blood_group: "",
  status: "ACTIVE",
  // Academic hierarchy selections
  school_id: "",
  department_id: "",
  programme_id: "",
  batch_id: "",
  section_id: "",
  // Credentials
  username: "",
  password: "",
};

function FormField({ label, required = false, upper = false, className = "", children }) {
  return (
    <div className={className}>
      <label
        className={`block text-xs font-semibold text-gray-700 ${upper ? "uppercase" : ""}`}
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

export function StudentManagementView({ token }) {
  // Main data states
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Reference catalog states for dynamic cascading dropdowns
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [idCardRecord, setIdCardRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Photo state (selected file / removal flag for the open form)
  const [photoFile, setPhotoFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  // Form state
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Load students and academic reference catalogs
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function fetchData() {
      try {
        setError("");
        const [studentRes, schoolRes, deptRes, progRes, batchRes, secRes] =
          await Promise.all([
            getStudents(token, controller.signal),
            getSchools(token, null, controller.signal).catch(() => ({ data: [] })),
            getDepartments(token, null, controller.signal).catch(() => ({ data: [] })),
            getPrograms(token, null, controller.signal).catch(() => ({ data: [] })),
            getBatches(token, null, controller.signal).catch(() => ({ data: [] })),
            getSections(token, null, controller.signal).catch(() => ({ data: [] })),
          ]);

        setStudents(Array.isArray(studentRes?.data) ? studentRes.data : []);
        setSchools(Array.isArray(schoolRes?.data) ? schoolRes.data : []);
        setDepartments(Array.isArray(deptRes?.data) ? deptRes.data : []);
        setPrograms(Array.isArray(progRes?.data) ? progRes.data : []);
        setBatches(Array.isArray(batchRes?.data) ? batchRes.data : []);
        setSections(Array.isArray(secRes?.data) ? secRes.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load students and academic hierarchy.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => controller.abort();
  }, [token, reloadTrigger]);

  // Cascading dropdown filters
  const filteredDepartments = useMemo(() => {
    if (!formData.school_id) return departments;
    return departments.filter((d) => Number(d.school_id) === Number(formData.school_id));
  }, [departments, formData.school_id]);

  const filteredPrograms = useMemo(() => {
    let progs = programs;
    if (formData.school_id) {
      progs = progs.filter((p) => Number(p.school_id) === Number(formData.school_id));
    }
    if (formData.department_id) {
      progs = progs.filter((p) => Number(p.department_id) === Number(formData.department_id));
    }
    return progs;
  }, [programs, formData.school_id, formData.department_id]);

  const filteredBatches = useMemo(() => {
    if (!formData.programme_id) return batches;
    return batches.filter((b) => Number(b.programme_id) === Number(formData.programme_id));
  }, [batches, formData.programme_id]);

  const filteredSections = useMemo(() => {
    if (!formData.batch_id) return sections;
    return sections.filter((s) => Number(s.batch_id) === Number(formData.batch_id));
  }, [sections, formData.batch_id]);

  // Cascading change handlers
  const handleSchoolChange = (schoolId) => {
    setFormData((prev) => ({
      ...prev,
      school_id: schoolId,
      department_id: "",
      programme_id: "",
      batch_id: "",
      section_id: "",
    }));
  };

  const handleDepartmentChange = (deptId) => {
    const dept = departments.find((d) => Number(d.department_id) === Number(deptId));
    setFormData((prev) => ({
      ...prev,
      department_id: deptId,
      school_id: dept?.school_id ? String(dept.school_id) : prev.school_id,
      programme_id: "",
      batch_id: "",
      section_id: "",
    }));
  };

  const handleProgrammeChange = (progId) => {
    const prog = programs.find((p) => Number(p.programme_id) === Number(progId));
    setFormData((prev) => ({
      ...prev,
      programme_id: progId,
      department_id: prog?.department_id ? String(prog.department_id) : prev.department_id,
      school_id: prog?.school_id ? String(prog.school_id) : prev.school_id,
      batch_id: "",
      section_id: "",
    }));
  };

  const handleBatchChange = (batchId) => {
    const batch = batches.find((b) => Number(b.batch_id) === Number(batchId));
    const prog = batch
      ? programs.find((p) => Number(p.programme_id) === Number(batch.programme_id))
      : null;

    setFormData((prev) => ({
      ...prev,
      batch_id: batchId,
      programme_id: batch?.programme_id ? String(batch.programme_id) : prev.programme_id,
      department_id: prog?.department_id ? String(prog.department_id) : prev.department_id,
      school_id: prog?.school_id ? String(prog.school_id) : prev.school_id,
      section_id: "",
    }));
  };

  const setField = (key) => (e) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const handlePhotoChange = ({ file, remove }) => {
    setPhotoFile(file);
    setRemovePhoto(remove);
  };

  const handleOpenCreate = () => {
    setFormData({
      ...EMPTY_FORM,
      school_id: schools[0]?.school_id ? String(schools[0].school_id) : "",
    });
    setPhotoFile(null);
    setRemovePhoto(false);
    setFormError("");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      register_no: student.register_no || "",
      full_name: student.full_name || "",
      email: student.email || "",
      phone: student.phone || "",
      gender: student.gender || "",
      date_of_birth: student.date_of_birth ? student.date_of_birth.substring(0, 10) : "",
      blood_group: student.blood_group || "",
      status: student.status || "ACTIVE",
      school_id: student.school_id ? String(student.school_id) : "",
      department_id: student.department_id ? String(student.department_id) : "",
      programme_id: student.programme_id ? String(student.programme_id) : "",
      batch_id: student.batch_id ? String(student.batch_id) : "",
      section_id: student.section_id ? String(student.section_id) : "",
      username: student.username || student.register_no || "",
      password: "",
    });
    setPhotoFile(null);
    setRemovePhoto(false);
    setFormError("");
  };

  const buildPayload = () => ({
    register_no: formData.register_no.trim(),
    full_name: formData.full_name.trim(),
    email: formData.email.trim() || null,
    phone: formData.phone.trim() || null,
    gender: formData.gender || null,
    date_of_birth: formData.date_of_birth || null,
    blood_group: formData.blood_group || null,
    status: formData.status,
    batch_id: Number(formData.batch_id),
    school_id: formData.school_id ? Number(formData.school_id) : undefined,
    department_id: formData.department_id ? Number(formData.department_id) : undefined,
    programme_id: formData.programme_id ? Number(formData.programme_id) : undefined,
    section_id: formData.section_id ? Number(formData.section_id) : undefined,
    username: formData.username.trim() || undefined,
  });

  const validateForm = () => {
    if (!formData.register_no.trim() || !formData.full_name.trim()) {
      throw new Error("Register number and full name are required.");
    }
    if (!formData.batch_id) {
      throw new Error("Please select an academic batch cohort.");
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      validateForm();

      const { photoError } = await createStudentWithPhoto(
        token,
        { ...buildPayload(), password: formData.password || undefined },
        photoFile,
      );

      setIsCreateOpen(false);
      if (photoError) {
        setError(
          `Student registered, but the photo was not saved: ${photoError.message} Open Edit to try again.`,
        );
      } else {
        setActionSuccess("Student registered successfully with complete academic records!");
        setTimeout(() => setActionSuccess(""), 4000);
      }
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to create student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setFormError("");
    setSubmitting(true);

    try {
      validateForm();

      await updateStudent(token, editingStudent.student_id, buildPayload());

      // Photo uses its own upload/delete route
      let photoError = null;
      try {
        if (photoFile) {
          await uploadStudentPhoto(token, editingStudent.student_id, photoFile);
        } else if (removePhoto) {
          await deleteStudentPhoto(token, editingStudent.student_id);
        }
      } catch (err) {
        photoError = err;
      }

      setEditingStudent(null);
      if (photoError) {
        setError(`Details saved, but the photo change failed: ${photoError.message}`);
      } else {
        setActionSuccess("Student academic profile updated successfully!");
        setTimeout(() => setActionSuccess(""), 4000);
      }
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to update student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    setSubmitting(true);

    try {
      await deleteStudent(token, deletingStudent.student_id);
      setDeletingStudent(null);
      setActionSuccess("Student deleted successfully.");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(
        err.message ||
          "Cannot delete student with associated enrollment or attendance records.",
      );
      setDeletingStudent(null);
    } finally {
      setSubmitting(false);
    }
  };

  /* Shared form body used by both the Register and Edit modals */
  const renderFormFields = () => (
    <>
      {/* Section 1: Academic placement */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-3">
        <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-900">
          <AcademicCapIcon className="h-4 w-4" />
          Academic Hierarchy & Placement
        </h5>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="School of Study">
            <select
              value={formData.school_id}
              onChange={(e) => handleSchoolChange(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">All / Unspecified School</option>
              {schools.map((s) => (
                <option key={s.school_id} value={s.school_id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Academic Department">
            <select
              value={formData.department_id}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">All / Unspecified Department</option>
              {filteredDepartments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name} {d.code ? `(${d.code})` : ""}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Degree Programme" className="md:col-span-2">
            <select
              value={formData.programme_id}
              onChange={(e) => handleProgrammeChange(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Select an Academic Programme</option>
              {filteredPrograms.map((p) => (
                <option key={p.programme_id} value={p.programme_id}>
                  {p.name} {p.degree_code ? `[${p.degree_code}]` : ""}{" "}
                  {p.duration_years ? `— ${p.duration_years} yrs` : ""}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Batch Cohort" required>
            <select
              required
              value={formData.batch_id}
              onChange={(e) => handleBatchChange(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Select Academic Batch</option>
              {filteredBatches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  Batch {b.label || `#${b.batch_id}`}{" "}
                  {b.programme_name ? `(${b.programme_name})` : ""}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Class Section (Optional)">
            <select
              value={formData.section_id}
              onChange={setField("section_id")}
              className={SELECT_CLASS}
            >
              <option value="">Unassigned Section</option>
              {filteredSections.map((s) => (
                <option key={s.section_id} value={s.section_id}>
                  Section {s.section_code} {s.subject_code ? `— ${s.subject_code}` : ""} (Max:{" "}
                  {s.max_strength || 60})
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      {/* Section 2: Identity & contact */}
      <div className="space-y-3">
        <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
          <UserIcon className="h-4 w-4" />
          Identity & Contact Information
        </h5>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="Register Number" required upper>
            <input
              type="text"
              required
              value={formData.register_no}
              onChange={setField("register_no")}
              placeholder="e.g. 2024CS0101"
              className={INPUT_CLASS}
            />
          </FormField>

          <FormField label="Full Name" required upper>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={setField("full_name")}
              placeholder="e.g. Aarav Kumar"
              className={INPUT_CLASS}
            />
          </FormField>

          <FormField label="Email Address" upper>
            <input
              type="email"
              value={formData.email}
              onChange={setField("email")}
              placeholder="aarav@joy.edu.in"
              className={INPUT_CLASS}
            />
          </FormField>

          <FormField label="Phone Number" upper>
            <input
              type="text"
              value={formData.phone}
              onChange={setField("phone")}
              placeholder="+91 9876543210"
              className={INPUT_CLASS}
            />
          </FormField>
        </div>
      </div>

      {/* Section 3: Demographics & status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <FormField label="Gender" upper>
          <select
            value={formData.gender}
            onChange={setField("gender")}
            className={SELECT_CLASS}
          >
            <option value="">Unspecified</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Date of Birth" upper>
          <input
            type="date"
            value={formData.date_of_birth}
            onChange={setField("date_of_birth")}
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField label="Blood Group" upper>
          <select
            value={formData.blood_group}
            onChange={setField("blood_group")}
            className={SELECT_CLASS}
          >
            <option value="">Select Blood Group</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Academic Status" upper>
          <select
            value={formData.status}
            onChange={setField("status")}
            className={SELECT_CLASS}
          >
            {STUDENT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </>
  );

  const columns = [
    {
      header: "Reg No",
      key: "register_no",
      render: (row) => (
        <button
          type="button"
          onClick={() => setViewingStudent(row)}
          className="font-mono text-xs font-bold text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition text-left cursor-pointer"
          title="Click to view full student details"
        >
          {row.register_no}
        </button>
      ),
    },
    {
      header: "Student Name",
      key: "full_name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar src={getPhotoPath(row)} name={row.full_name} size="sm" />
          <div>
            <button
              type="button"
              onClick={() => setViewingStudent(row)}
              className="font-bold text-gray-900 hover:text-green-800 text-left transition cursor-pointer"
            >
              {row.full_name}
            </button>
            <p className="text-xs text-gray-400">{row.email || "No email registered"}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Academic Programme",
      key: "programme_name",
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-gray-800">
            {row.programme_name ||
              (row.programme_id ? `Programme #${row.programme_id}` : "Unassigned")}
          </p>
          <p className="text-[11px] text-gray-400">
            {row.department_name ? `${row.department_name}` : ""}
          </p>
        </div>
      ),
    },
    {
      header: "Academic Year",
      key: "academic_year_label",
    },
    {
      header: "Batch & Section",
      key: "batch_id",
      render: (row) => (
        <div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700">
            {row.batch_label || `Batch #${row.batch_id}`}
          </span>
          {row.section_code ? (
            <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
              Sec {row.section_code}
            </span>
          ) : (
            <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
              No Sec
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Contact",
      key: "phone",
      render: (row) => <span className="text-xs text-gray-600">{row.phone || "—"}</span>,
    },
    {
      header: "Status",
      key: "status",
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setViewingStudent(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-700 transition"
            title="Edit Student Record"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <IdCardActions
            onClick={() => setIdCardRecord(row)}
            cardType="student"
          />
          <button
            type="button"
            onClick={() => setDeletingStudent(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700 transition"
            title="Delete Student"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {loading ? (
        <LoadingSpinner message="Fetching students and academic hierarchy from database..." />
      ) : (
        <DataTable
          columns={columns}
          data={students}
          rowKey="student_id"
          searchPlaceholder="Search by name, register number, programme, department, or year..."
          pageSize={10}
          emptyMessage="No students found matching your criteria."
          actions={
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition cursor-pointer"
            >
              <PlusIcon className="h-4 w-4" />
              Register Student
            </button>
          }
        />
      )}

      <IdCardPreviewModal
        record={idCardRecord}
        cardType="student"
        onClose={() => setIdCardRecord(null)}
      />

      {/* Register New Student Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Student"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <PhotoUpload
            name={formData.full_name}
            file={photoFile}
            removed={removePhoto}
            disabled={submitting}
            onChange={handlePhotoChange}
          />

          {renderFormFields()}

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-xs font-semibold text-white hover:bg-green-900 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Registering..." : "Create Student"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        title="Edit Student Academic Record"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <PhotoUpload
            currentUrl={getPhotoPath(editingStudent)}
            name={formData.full_name}
            file={photoFile}
            removed={removePhoto}
            disabled={submitting}
            onChange={handlePhotoChange}
          />

          {renderFormFields()}

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setEditingStudent(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-xs font-semibold text-white hover:bg-green-900 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Student Details Modal */}
      <Modal
        isOpen={Boolean(viewingStudent)}
        onClose={() => setViewingStudent(null)}
        title="Student Profile & Academic Details"
        maxWidth="max-w-2xl"
      >
        {viewingStudent && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3.5">
                <Avatar
                  src={getPhotoPath(viewingStudent)}
                  name={viewingStudent.full_name}
                  size="md"
                  className="ring-2 ring-green-600/20"
                />
                <div>
                  <h4 className="text-base font-bold text-gray-900">
                    {viewingStudent.full_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-semibold text-green-800 bg-green-50 px-2 py-0.5 rounded">
                      {viewingStudent.register_no}
                    </span>
                    <span className="text-xs text-gray-400">
                      ID #{viewingStudent.student_id}
                    </span>
                  </div>
                </div>
              </div>
              <Badge status={viewingStudent.status} />
            </div>

            {/* Academic Placement Card */}
            <div className="rounded-xl border border-green-100 bg-green-50/40 p-4 space-y-3">
              <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-900">
                <BuildingLibraryIcon className="h-4 w-4 text-green-800" />
                Academic Hierarchy & Enrolled Offering
              </h5>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 font-medium">School</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewingStudent.school_name || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 font-medium">Department</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewingStudent.department_name || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 font-medium">Degree Level</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewingStudent.degree_name
                      ? `${viewingStudent.degree_name} (${viewingStudent.degree_level || "UG"})`
                      : "—"}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-gray-500 font-medium">Academic Programme</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewingStudent.programme_name ||
                      (viewingStudent.programme_id
                        ? `Programme #${viewingStudent.programme_id}`
                        : "—")}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 font-medium">Batch Cohort</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewingStudent.batch_label || `Batch #${viewingStudent.batch_id}`}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 font-medium">Academic Year</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewingStudent.academic_year_label || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 font-medium">Class Section</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewingStudent.section_code
                      ? `Section ${viewingStudent.section_code}`
                      : "Unassigned"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 font-medium">Programme Duration</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewingStudent.duration_years
                      ? `${viewingStudent.duration_years} Years`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Demographics & Contact Card */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
              <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                <IdentificationIcon className="h-4 w-4 text-gray-500" />
                Personal Details & Contact
              </h5>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <EnvelopeIcon className="h-3 w-3" /> Email Address
                  </span>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {viewingStudent.email || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <PhoneIcon className="h-3 w-3" /> Contact Phone
                  </span>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {viewingStudent.phone || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">Gender</span>
                  <p className="mt-0.5 font-semibold text-gray-800 capitalize">
                    {viewingStudent.gender || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <CalendarDaysIcon className="h-3 w-3" /> Date of Birth
                  </span>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {viewingStudent.date_of_birth
                      ? new Date(viewingStudent.date_of_birth).toLocaleDateString()
                      : "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <Squares2X2Icon className="h-3 w-3" /> Blood Group
                  </span>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {viewingStudent.blood_group || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">Registered Date</span>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {viewingStudent.created_at
                      ? new Date(viewingStudent.created_at).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const st = viewingStudent;
                  setViewingStudent(null);
                  handleOpenEdit(st);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-800 px-4 py-2 text-xs font-semibold text-white hover:bg-green-900 cursor-pointer"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit Student
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingStudent)}
        onClose={() => setDeletingStudent(null)}
        title="Confirm Student Deletion"
        maxWidth="max-w-sm"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-base font-bold text-gray-900">
            Delete {deletingStudent?.full_name}?
          </h4>
          <p className="mt-2 text-xs text-gray-500">
            This will permanently remove student {deletingStudent?.register_no} and their
            authentication account. Database foreign key safeguards will prevent deletion if
            active enrollment or attendance history exists.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setDeletingStudent(null)}
              className="w-1/2 rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeleteConfirm}
              className="w-1/2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default StudentManagementView;