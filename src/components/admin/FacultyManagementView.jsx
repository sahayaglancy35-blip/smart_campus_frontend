import { useState, useEffect, useMemo } from "react";
import {
  getFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getDepartments,
  getDesignations,
} from "../../api/admin";
import { getSchools } from "../../api/academics";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  UserIcon,
  IdentificationIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export function FacultyManagementView({ token }) {
  const [facultyList, setFacultyList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [deactivatingFaculty, setDeactivatingFaculty] = useState(null);
  const [viewingFaculty, setViewingFaculty] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    employee_code: "",
    full_name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    blood_group: "",
    joining_year: "",
    in_charge_class: "",
    school_id: "",
    department_id: "",
    designation_id: "",
    is_active: 1,
    username: "",
    password: "",
  });

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadData() {
      try {
        setError("");
        const [facRes, deptRes, desigRes, schoolRes] = await Promise.all([
          getFaculty(token, controller.signal),
          getDepartments(token, controller.signal).catch(() => ({ data: [] })),
          getDesignations(token, controller.signal).catch(() => ({ data: [] })),
          getSchools(token, null, controller.signal).catch(() => ({ data: [] })),
        ]);

        setFacultyList(Array.isArray(facRes?.data) ? facRes.data : []);
        setDepartments(Array.isArray(deptRes?.data) ? deptRes.data : []);
        setDesignations(Array.isArray(desigRes?.data) ? desigRes.data : []);
        setSchools(Array.isArray(schoolRes?.data) ? schoolRes.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load faculty records.");
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

  const filteredDepartments = useMemo(() => {
    if (!formData.school_id) return departments;
    return departments.filter((d) => Number(d.school_id) === Number(formData.school_id));
  }, [departments, formData.school_id]);

  const getDesignationName = (row) => {
    if (!row) return "—";
    if (row.designation_name) return row.designation_name;
    const found = designations.find((d) => d.designation_id === row.designation_id);
    return found ? found.name : "—";
  };

  const getDepartmentName = (row) => {
    if (!row) return "—";
    if (row.department_name) return row.department_name;
    const found = departments.find((d) => d.department_id === row.department_id);
    return found ? found.name : `Dept #${row.department_id || "—"}`;
  };

  const getSchoolName = (row) => {
    if (!row) return "—";
    if (row.school_name) return row.school_name;
    if (row.school_code) return row.school_code;
    const found = schools.find((s) => s.school_id === row.school_id);
    return found ? found.name : "—";
  };

  const handleSchoolChange = (schoolId) => {
    setFormData((prev) => ({
      ...prev,
      school_id: schoolId,
      department_id: "",
    }));
  };

  const handleDepartmentChange = (deptId) => {
    const selectedId = Number(deptId);
    const selectedDept = departments.find((d) => d.department_id === selectedId);
    setFormData((prev) => ({
      ...prev,
      department_id: deptId,
      school_id: selectedDept?.school_id ? String(selectedDept.school_id) : prev.school_id,
    }));
  };

  const handleOpenCreate = () => {
    const defaultSchool = schools[0];
    const defaultDept = departments.find((d) => d.school_id === defaultSchool?.school_id) || departments[0];
    const defaultDesg = designations[0];

    setFormData({
      employee_code: "",
      full_name: "",
      email: "",
      phone: "",
      gender: "",
      date_of_birth: "",
      blood_group: "",
      joining_year: new Date().getFullYear(),
      in_charge_class: "",
      school_id: defaultSchool?.school_id ? String(defaultSchool.school_id) : "",
      department_id: defaultDept?.department_id ? String(defaultDept.department_id) : "",
      designation_id: defaultDesg?.designation_id ? String(defaultDesg.designation_id) : "",
      is_active: 1,
      username: "",
      password: "",
    });
    setFormError("");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (faculty) => {
    setEditingFaculty(faculty);
    const facultyDept = departments.find((d) => d.department_id === faculty.department_id);
    setFormData({
      employee_code: faculty.employee_code || "",
      full_name: faculty.full_name || "",
      email: faculty.email || "",
      phone: faculty.phone || "",
      gender: faculty.gender || "",
      date_of_birth: faculty.date_of_birth ? faculty.date_of_birth.substring(0, 10) : "",
      blood_group: faculty.blood_group || "",
      joining_year: faculty.joining_year || "",
      in_charge_class: faculty.in_charge_class || "",
      school_id: faculty.school_id ? String(faculty.school_id) : (facultyDept?.school_id ? String(facultyDept.school_id) : ""),
      department_id: faculty.department_id ? String(faculty.department_id) : "",
      designation_id: faculty.designation_id ? String(faculty.designation_id) : "",
      is_active: faculty.is_active ? 1 : 0,
      username: faculty.username || faculty.employee_code || "",
      password: "",
    });
    setFormError("");
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (!formData.employee_code.trim() || !formData.full_name.trim()) {
        throw new Error("Employee code and full name are required.");
      }
      if (!formData.school_id) {
        throw new Error("Please select an institutional School of Study.");
      }

      await createFaculty(token, {
        employee_code: formData.employee_code.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        blood_group: formData.blood_group || null,
        joining_year: formData.joining_year ? Number(formData.joining_year) : null,
        in_charge_class: formData.in_charge_class.trim() || null,
        school_id: Number(formData.school_id),
        department_id: formData.department_id ? Number(formData.department_id) : null,
        designation_id: formData.designation_id ? Number(formData.designation_id) : null,
        is_active: Number(formData.is_active),
        username: formData.username.trim() || undefined,
        password: formData.password || undefined,
      });

      setIsCreateOpen(false);
      setActionSuccess("Faculty member profile created successfully!");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to create faculty member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingFaculty) return;
    setFormError("");
    setSubmitting(true);

    try {
      if (!formData.employee_code.trim() || !formData.full_name.trim()) {
        throw new Error("Employee code and full name are required.");
      }
      if (!formData.school_id) {
        throw new Error("Please select an institutional School of Study.");
      }

      await updateFaculty(token, editingFaculty.faculty_id, {
        employee_code: formData.employee_code.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        blood_group: formData.blood_group || null,
        joining_year: formData.joining_year ? Number(formData.joining_year) : null,
        in_charge_class: formData.in_charge_class.trim() || null,
        school_id: Number(formData.school_id),
        department_id: formData.department_id ? Number(formData.department_id) : null,
        designation_id: formData.designation_id ? Number(formData.designation_id) : null,
        is_active: Number(formData.is_active),
        username: formData.username.trim() || undefined,
      });

      setEditingFaculty(null);
      setActionSuccess("Faculty details updated successfully!");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to update faculty member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivatingFaculty) return;
    setSubmitting(true);

    try {
      await deleteFaculty(token, deactivatingFaculty.faculty_id);
      setDeactivatingFaculty(null);
      setActionSuccess("Faculty member deactivated successfully.");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to deactivate faculty profile.");
      setDeactivatingFaculty(null);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Code",
      key: "employee_code",
      render: (row) => (
        <button
          type="button"
          onClick={() => setViewingFaculty(row)}
          className="font-mono text-xs font-bold text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition text-left cursor-pointer"
          title="Click to view full faculty profile"
        >
          {row.employee_code || "—"}
        </button>
      ),
    },
    {
      header: "Faculty Member",
      key: "full_name",
      render: (row) => (
        <div>
          <button
            type="button"
            onClick={() => setViewingFaculty(row)}
            className="font-bold text-gray-900 hover:text-green-800 text-left transition cursor-pointer"
          >
            {row.full_name}
          </button>
          <p className="text-xs text-gray-400">{row.email || "No email"}</p>
        </div>
      ),
    },
    {
      header: "Designation & Dept",
      key: "designation_id",
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-800 text-xs">{getDesignationName(row)}</p>
          <p className="text-[11px] text-gray-500">{getDepartmentName(row)}</p>
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
      key: "is_active",
      render: (row) => <Badge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setViewingFaculty(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-700 transition"
            title="Edit Faculty"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          {row.is_active ? (
            <button
              type="button"
              onClick={() => setDeactivatingFaculty(row)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700 transition"
              title="Deactivate Faculty"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {loading ? (
        <LoadingSpinner message="Fetching faculty and staff directory..." />
      ) : (
        <DataTable
          columns={columns}
          data={facultyList}
          searchPlaceholder="Search faculty by name, employee code, department..."
          pageSize={10}
          emptyMessage="No faculty records found."
          actions={
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition cursor-pointer"
            >
              <PlusIcon className="h-4 w-4" />
              Add Faculty Profile
            </button>
          }
        />
      )}

      {/* View Profile Details Modal */}
      <Modal
        isOpen={Boolean(viewingFaculty)}
        onClose={() => setViewingFaculty(null)}
        title="Faculty Member Profile & Credentials"
        maxWidth="max-w-2xl"
      >
        {viewingFaculty && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-800">
                  <AcademicCapIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">
                    {viewingFaculty.full_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-semibold text-green-800 bg-green-50 px-2 py-0.5 rounded">
                      {viewingFaculty.employee_code || "—"}
                    </span>
                    <span className="text-xs text-gray-400">
                      ID #{viewingFaculty.faculty_id}
                    </span>
                  </div>
                </div>
              </div>
              <Badge status={viewingFaculty.is_active ? "ACTIVE" : "INACTIVE"} />
            </div>

            {/* Academic Assignment Card */}
            <div className="rounded-xl border border-green-100 bg-green-50/40 p-4 space-y-3">
              <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-900">
                <BuildingLibraryIcon className="h-4 w-4 text-green-800" />
                Academic Designation & Affiliation
              </h5>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 font-medium">Designation</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {getDesignationName(viewingFaculty)}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 font-medium">Department</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {getDepartmentName(viewingFaculty)}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 font-medium">School of Study</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {getSchoolName(viewingFaculty)}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 font-medium">In-Charge Class</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewingFaculty.in_charge_class || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 font-medium">Joining Year</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewingFaculty.joining_year || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-500 font-medium">Profile Created</span>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {viewingFaculty.created_at
                      ? new Date(viewingFaculty.created_at).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Details & Contact Card */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
              <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                <IdentificationIcon className="h-4 w-4 text-gray-500" />
                Contact & Demographics
              </h5>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <EnvelopeIcon className="h-3 w-3" /> Email Address
                  </span>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {viewingFaculty.email || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <PhoneIcon className="h-3 w-3" /> Phone Number
                  </span>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {viewingFaculty.phone || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium">Gender</span>
                  <p className="mt-0.5 font-semibold text-gray-800 capitalize">
                    {viewingFaculty.gender || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <CalendarDaysIcon className="h-3 w-3" /> Date of Birth
                  </span>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {viewingFaculty.date_of_birth
                      ? new Date(viewingFaculty.date_of_birth).toLocaleDateString()
                      : "—"}
                  </p>
                </div>

                <div>
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <Squares2X2Icon className="h-3 w-3" /> Blood Group
                  </span>
                  <p className="mt-0.5 font-semibold text-gray-800">
                    {viewingFaculty.blood_group || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setViewingFaculty(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewingFaculty;
                  setViewingFaculty(null);
                  handleOpenEdit(target);
                }}
                className="rounded-lg bg-green-800 px-4 py-2 text-xs font-semibold text-white hover:bg-green-900 cursor-pointer"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Faculty Member"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          {/* Section 1: Academic Affiliation */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-3">
            <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-900">
              <BuildingLibraryIcon className="h-4 w-4" />
              Academic Department & Designation
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  School of Study <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.school_id}
                  onChange={(e) => handleSchoolChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                >
                  <option value="">Select School</option>
                  {schools.map((s) => (
                    <option key={s.school_id} value={s.school_id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Department
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                >
                  <option value="">All / Unassigned Department</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.name} {d.code ? `(${d.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Designation
                </label>
                <select
                  value={formData.designation_id}
                  onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                >
                  <option value="">Select Designation</option>
                  {designations.map((d) => (
                    <option key={d.designation_id} value={d.designation_id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  In-Charge Class
                </label>
                <input
                  type="text"
                  value={formData.in_charge_class}
                  onChange={(e) => setFormData({ ...formData, in_charge_class: e.target.value })}
                  placeholder="e.g. CSE-AIML Sec A"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Identity & Contact */}
          <div className="space-y-3">
            <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
              <UserIcon className="h-4 w-4" />
              Identity & Contact Details
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700">
                  Employee Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.employee_code}
                  onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                  placeholder="e.g. FAC-CS-004"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700">
                  Institutional Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rajesh.kumar@joyuniversity.edu.in"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Demographics & Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
              >
                <option value="">Unspecified</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Blood Group
              </label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Joining Year
              </label>
              <input
                type="number"
                min="1980"
                max="2100"
                value={formData.joining_year}
                onChange={(e) => setFormData({ ...formData, joining_year: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
              />
            </div>
          </div>

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
              {submitting ? "Saving..." : "Create Profile"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={Boolean(editingFaculty)}
        onClose={() => setEditingFaculty(null)}
        title="Edit Faculty Member Profile"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          {/* Section 1: Academic Affiliation */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 space-y-3">
            <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-900">
              <BuildingLibraryIcon className="h-4 w-4" />
              Academic Department & Designation
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  School of Study <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.school_id}
                  onChange={(e) => handleSchoolChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                >
                  <option value="">Select School</option>
                  {schools.map((s) => (
                    <option key={s.school_id} value={s.school_id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Department
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                >
                  <option value="">All / Unassigned Department</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.name} {d.code ? `(${d.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Designation
                </label>
                <select
                  value={formData.designation_id}
                  onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                >
                  <option value="">Select Designation</option>
                  {designations.map((d) => (
                    <option key={d.designation_id} value={d.designation_id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  In-Charge Class
                </label>
                <input
                  type="text"
                  value={formData.in_charge_class}
                  onChange={(e) => setFormData({ ...formData, in_charge_class: e.target.value })}
                  placeholder="e.g. CSE-AIML Sec A"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Identity & Contact */}
          <div className="space-y-3">
            <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
              <UserIcon className="h-4 w-4" />
              Identity & Contact Details
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700">
                  Employee Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.employee_code}
                  onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700">
                  Institutional Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Demographics & Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
              >
                <option value="">Unspecified</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Blood Group
              </label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Status
              </label>
              <select
                value={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-green-600 focus:outline-none"
              >
                <option value={1}>ACTIVE</option>
                <option value={0}>INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setEditingFaculty(null)}
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

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={Boolean(deactivatingFaculty)}
        onClose={() => setDeactivatingFaculty(null)}
        title="Confirm Faculty Deactivation"
        maxWidth="max-w-sm"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-base font-bold text-gray-900">
            Deactivate {deactivatingFaculty?.full_name}?
          </h4>
          <p className="mt-2 text-xs text-gray-500">
            This will mark faculty member {deactivatingFaculty?.employee_code} as inactive.
            Historical timetable assignments, sessions, and attendance history will be preserved.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setDeactivatingFaculty(null)}
              className="w-1/2 rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeactivateConfirm}
              className="w-1/2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Deactivating..." : "Deactivate"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default FacultyManagementView;
