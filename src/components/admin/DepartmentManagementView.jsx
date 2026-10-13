import { useState, useEffect } from "react";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
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
  ExclamationTriangleIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";

export function DepartmentManagementView({ token }) {
  const [departments, setDepartments] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState("ALL");
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deletingDept, setDeletingDept] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    school_id: "",
    is_active: 1,
  });

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadData() {
      try {
        setError("");
        const [deptRes, schoolRes] = await Promise.all([
          getDepartments(token, controller.signal),
          getSchools(token, null, controller.signal).catch(() => ({ data: [] })),
        ]);
        setDepartments(Array.isArray(deptRes?.data) ? deptRes.data : []);
        setSchools(Array.isArray(schoolRes?.data) ? schoolRes.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load departments.");
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
    setFormData({
      name: "",
      code: "",
      school_id: schools[0]?.school_id || 1,
      is_active: 1,
    });
    setFormError("");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name || "",
      code: dept.code || "",
      school_id: dept.school_id || (schools[0]?.school_id || 1),
      is_active: dept.is_active ? 1 : 0,
    });
    setFormError("");
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (!formData.name.trim()) {
        throw new Error("Department name is required.");
      }
      if (!formData.school_id) {
        throw new Error("Please select a valid school.");
      }

      await createDepartment(token, {
        ...formData,
        school_id: Number(formData.school_id),
        is_active: Number(formData.is_active),
      });

      setIsCreateOpen(false);
      setActionSuccess("Department created successfully!");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to create department.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDept) return;
    setFormError("");
    setSubmitting(true);

    try {
      if (!formData.name.trim()) {
        throw new Error("Department name is required.");
      }

      await updateDepartment(token, editingDept.department_id, {
        ...formData,
        school_id: Number(formData.school_id),
        is_active: Number(formData.is_active),
      });

      setEditingDept(null);
      setActionSuccess("Department updated successfully!");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to update department.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;
    setSubmitting(true);

    try {
      await deleteDepartment(token, deletingDept.department_id);
      setActionSuccess("Department deactivated successfully.");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
      setDeletingDept(null);
    } catch (err) {
      setError(err.message || "Failed to deactivate department.");
      setTimeout(() => setError(""), 5000);
      setDeletingDept(null);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDepartments = departments.filter((d) => {
    if (selectedSchoolFilter === "ALL") return true;
    return Number(d.school_id) === Number(selectedSchoolFilter);
  });

  const columns = [
    {
      header: "Code",
      key: "code",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-green-800 bg-green-50 px-2 py-1 rounded">
          {row.code || "—"}
        </span>
      ),
    },
    {
      header: "Department Name",
      key: "name",
      render: (row) => (
        <span className="font-bold text-gray-900">{row.name}</span>
      ),
    },
    {
      header: "School",
      key: "school",
      render: (row) => (
        <div>
          <span className="font-semibold text-gray-800">
            {row.school_name || `School #${row.school_id}`}
          </span>
          {row.school_code && (
            <span className="ml-1 text-xs text-gray-500 font-mono">
              ({row.school_code})
            </span>
          )}
        </div>
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
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-700 transition"
            title="Edit Department"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingDept(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700 transition"
            title="Delete Department"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* School Filter and Action Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <BuildingLibraryIcon className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Filter by School:</span>
          <select
            value={selectedSchoolFilter}
            onChange={(e) => setSelectedSchoolFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="ALL">All Schools ({schools.length})</option>
            {schools.map((s) => (
              <option key={s.school_id} value={s.school_id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          New Department
        </button>
      </div>

      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {loading ? (
        <LoadingSpinner message="Loading academic departments from MySQL..." />
      ) : (
        <DataTable
          columns={columns}
          data={filteredDepartments}
          searchPlaceholder="Search department by name or code..."
          pageSize={10}
          emptyMessage="No departments found matching the selected school filter."
          emptyAction={
            selectedSchoolFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedSchoolFilter("ALL")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-green-800 bg-white px-3 py-1.5 text-xs font-semibold text-green-800 shadow-xs hover:bg-green-50 transition"
              >
                Reset School Filter
              </button>
            )
          }
        />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Academic Department"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Computer Science and Engineering"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Department Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g. CSE"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Parent School <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.school_id}
              onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
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
              Status
            </label>
            <select
              value={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              {submitting ? "Saving..." : "Create Department"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={Boolean(editingDept)}
        onClose={() => setEditingDept(null)}
        title="Edit Academic Department"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Department Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Parent School <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.school_id}
              onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
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
              Status
            </label>
            <select
              value={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingDept(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Confirmation */}
      <Modal
        isOpen={Boolean(deletingDept)}
        onClose={() => setDeletingDept(null)}
        title="Deactivate Department"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
            <p className="text-sm font-medium text-gray-800">
              Are you sure you want to deactivate{" "}
              <strong>{deletingDept?.name}</strong>?
            </p>
          </div>
          <p className="text-xs text-gray-500">
            Deactivating a department flags it as inactive while preserving historical curriculum and attendance records.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeletingDept(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? "Deactivating..." : "Deactivate"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default DepartmentManagementView;
