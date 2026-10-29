import { useState, useEffect } from "react";
import {
  getBlocks,
  createBlock,
  updateBlock,
  deleteBlock,
  getClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  getDepartments,
} from "../../api/admin";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const ROOM_TYPES = ["CLASSROOM", "SMART_CLASSROOM", "LAB", "SEMINAR_HALL", "OTHER"];

export function InfrastructureManagementView({ token }) {
  const [activeTab, setActiveTab] = useState("classrooms"); // "blocks" or "classrooms"
  const [blocks, setBlocks] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Modals
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [deletingBlock, setDeletingBlock] = useState(null);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Forms
  const [blockForm, setBlockForm] = useState({ code: "", name: "", is_active: 1 });
  const [roomForm, setRoomForm] = useState({
    block_id: "",
    department_id: "",
    room_no: "",
    room_type: "CLASSROOM",
    capacity: 60,
    is_active: 1,
  });

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadData() {
      try {
        setError("");
        const [blocksRes, roomsRes, deptsRes] = await Promise.all([
          getBlocks(token, controller.signal),
          getClassrooms(token, controller.signal),
          getDepartments(token, controller.signal),
        ]);

        setBlocks(Array.isArray(blocksRes?.data) ? blocksRes.data : []);
        setClassrooms(Array.isArray(roomsRes?.data) ? roomsRes.data : []);
        setDepartments(Array.isArray(deptsRes?.data) ? deptsRes.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load campus infrastructure.");
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

  // Block handlers
  const handleOpenCreateBlock = () => {
    setBlockForm({ code: "", name: "", is_active: 1 });
    setFormError("");
    setEditingBlock(null);
    setIsBlockModalOpen(true);
  };

  const handleOpenEditBlock = (block) => {
    setEditingBlock(block);
    setBlockForm({
      code: block.code || "",
      name: block.name || "",
      is_active: block.is_active ? 1 : 0,
    });
    setFormError("");
    setIsBlockModalOpen(true);
  };

  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (!blockForm.code.trim() || !blockForm.name.trim()) {
        throw new Error("Code and name are required.");
      }

      if (editingBlock) {
        await updateBlock(token, editingBlock.block_id, blockForm);
        setActionSuccess("Campus block updated successfully!");
      } else {
        await createBlock(token, blockForm);
        setActionSuccess("Campus block created successfully!");
      }

      setIsBlockModalOpen(false);
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlockDeleteConfirm = async () => {
    if (!deletingBlock) return;
    setSubmitting(true);
    try {
      await deleteBlock(token, deletingBlock.block_id);
      setDeletingBlock(null);
      setActionSuccess("Block deleted successfully.");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Cannot delete block referencing classrooms.");
      setDeletingBlock(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Classroom handlers
  const handleOpenCreateRoom = () => {
    setRoomForm({
      block_id: blocks[0]?.block_id || "",
      department_id: "",
      room_no: "",
      room_type: "CLASSROOM",
      capacity: 60,
      is_active: 1,
    });
    setFormError("");
    setEditingRoom(null);
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room) => {
    setEditingRoom(room);
    setRoomForm({
      block_id: room.block_id || blocks[0]?.block_id || "",
      department_id: room.department_id || "",
      room_no: room.room_no || "",
      room_type: room.room_type || "CLASSROOM",
      capacity: room.capacity || 60,
      is_active: room.is_active ? 1 : 0,
    });
    setFormError("");
    setIsRoomModalOpen(true);
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (!roomForm.room_no.trim()) {
        throw new Error("Room number is required.");
      }

      const payload = {
        ...roomForm,
        block_id: Number(roomForm.block_id),
        department_id: roomForm.department_id ? Number(roomForm.department_id) : null,
        capacity: Number(roomForm.capacity) || 60,
        is_active: Number(roomForm.is_active),
      };

      if (editingRoom) {
        await updateClassroom(token, editingRoom.classroom_id, payload);
        setActionSuccess("Classroom updated successfully!");
      } else {
        await createClassroom(token, payload);
        setActionSuccess("Classroom created successfully!");
      }

      setIsRoomModalOpen(false);
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoomDeleteConfirm = async () => {
    if (!deletingRoom) return;
    setSubmitting(true);
    try {
      await deleteClassroom(token, deletingRoom.classroom_id);
      setDeletingRoom(null);
      setActionSuccess("Classroom removed successfully.");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Cannot delete classroom.");
      setDeletingRoom(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Block table columns
  const blockColumns = [
    {
      header: "Block Code",
      key: "code",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-green-900 bg-green-50 px-2 py-1 rounded">
          {row.code}
        </span>
      ),
    },
    {
      header: "Building / Block Name",
      key: "name",
      render: (row) => <span className="font-bold text-gray-900">{row.name}</span>,
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
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditBlock(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-700 transition"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingBlock(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700 transition"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Classroom table columns
  const classroomColumns = [
    {
      header: "Room No",
      key: "room_no",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-green-950 bg-green-50 px-2.5 py-1 rounded border border-green-200">
          {row.room_no}
        </span>
      ),
    },
    {
      header: "Campus Block",
      key: "block_id",
      render: (row) => {
        const block = blocks.find((b) => b.block_id === row.block_id);
        return (
          <span className="font-semibold text-gray-900">
            {block ? `${block.name} (${block.code})` : `Block #${row.block_id}`}
          </span>
        );
      },
    },
    {
      header: "Department",
      key: "department_id",
      render: (row) => {
        if (row.department_name) {
          return (
            <span className="font-semibold text-gray-800">
              {row.department_name} ({row.department_code})
            </span>
          );
        }
        const dept = departments.find((d) => d.department_id === row.department_id);
        return (
          <span className="text-gray-500 text-xs">
            {dept ? `${dept.name} (${dept.code})` : "General / Campus-wide"}
          </span>
        );
      },
    },
    {
      header: "Room Type",
      key: "room_type",
      render: (row) => <Badge status={row.room_type} />,
    },
    {
      header: "Capacity",
      key: "capacity",
      render: (row) => (
        <span className="text-xs font-bold text-gray-700">{row.capacity ?? "—"} seats</span>
      ),
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
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditRoom(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-700 transition"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingRoom(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700 transition"
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

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("classrooms")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "classrooms"
                ? "bg-green-800 text-white shadow-xs"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <AcademicCapIcon className="h-4 w-4" />
            Classrooms & Labs ({classrooms.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("blocks")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "blocks"
                ? "bg-green-800 text-white shadow-xs"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <BuildingOfficeIcon className="h-4 w-4" />
            Campus Blocks ({blocks.length})
          </button>
        </div>

        {activeTab === "classrooms" ? (
          <button
            type="button"
            onClick={handleOpenCreateRoom}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
          >
            <PlusIcon className="h-4 w-4" />
            Add Classroom
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenCreateBlock}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
          >
            <PlusIcon className="h-4 w-4" />
            Add Block
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Fetching campus infrastructure details..." />
      ) : activeTab === "classrooms" ? (
        <DataTable
          key="infra-classrooms-table"
          columns={classroomColumns}
          data={classrooms}
          searchPlaceholder="Search classroom by room number..."
          pageSize={10}
          emptyMessage="No classrooms registered."
        />
      ) : (
        <DataTable
          key="infra-blocks-table"
          columns={blockColumns}
          data={blocks}
          searchPlaceholder="Search blocks by name or code..."
          pageSize={10}
          emptyMessage="No campus blocks registered."
        />
      )}

      {/* Block Create/Edit Modal */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        title={editingBlock ? "Edit Campus Block" : "Add Campus Block"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleBlockSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Block Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={blockForm.code}
              onChange={(e) => setBlockForm({ ...blockForm, code: e.target.value })}
              placeholder="e.g. BLK-A"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Block Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={blockForm.name}
              onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
              placeholder="e.g. Science & Technology Block"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Status
            </label>
            <select
              value={blockForm.is_active}
              onChange={(e) => setBlockForm({ ...blockForm, is_active: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setIsBlockModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingBlock ? "Save Changes" : "Create Block"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Classroom Create/Edit Modal */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title={editingRoom ? "Edit Classroom" : "Add Classroom"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRoomSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Campus Block <span className="text-red-500">*</span>
            </label>
            <select
              value={roomForm.block_id}
              onChange={(e) => setRoomForm({ ...roomForm, block_id: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              {blocks.map((b) => (
                <option key={b.block_id} value={b.block_id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Department (Optional)
            </label>
            <select
              value={roomForm.department_id}
              onChange={(e) => setRoomForm({ ...roomForm, department_id: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value="">General / Campus-Wide</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Room Number / Identifier <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={roomForm.room_no}
              onChange={(e) => setRoomForm({ ...roomForm, room_no: e.target.value })}
              placeholder="e.g. 101, LAB-3, AUDITORIUM"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Room Type
              </label>
              <select
                value={roomForm.room_type}
                onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {ROOM_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Seating Capacity
              </label>
              <input
                type="number"
                min="1"
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Status
            </label>
            <select
              value={roomForm.is_active}
              onChange={(e) => setRoomForm({ ...roomForm, is_active: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setIsRoomModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingRoom ? "Save Changes" : "Create Classroom"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modals */}
      <Modal
        isOpen={Boolean(deletingBlock)}
        onClose={() => setDeletingBlock(null)}
        title="Confirm Block Deletion"
        maxWidth="max-w-sm"
      >
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-600" />
          <h4 className="mt-3 text-base font-bold text-gray-900">
            Delete Block {deletingBlock?.name}?
          </h4>
          <p className="mt-2 text-xs text-gray-500">
            This block will be removed. Cannot delete if rooms belong to this block.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setDeletingBlock(null)}
              className="w-1/2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleBlockDeleteConfirm}
              className="w-1/2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deletingRoom)}
        onClose={() => setDeletingRoom(null)}
        title="Confirm Classroom Removal"
        maxWidth="max-w-sm"
      >
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-600" />
          <h4 className="mt-3 text-base font-bold text-gray-900">
            Remove Room {deletingRoom?.room_no}?
          </h4>
          <p className="mt-2 text-xs text-gray-500">
            This will deactivate room {deletingRoom?.room_no}.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setDeletingRoom(null)}
              className="w-1/2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleRoomDeleteConfirm}
              className="w-1/2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default InfrastructureManagementView;
