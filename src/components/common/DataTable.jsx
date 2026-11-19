import { useState, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// Whitelist of semantic string/text fields for intelligent searching
const SEMANTIC_TEXT_KEYS = new Set([
  "full_name",
  "name",
  "first_name",
  "last_name",
  "register_no",
  "reg_no",
  "roll_no",
  "email",
  "phone",
  "username",
  "code",
  "subject_code",
  "course_code",
  "subject_name",
  "title",
  "label",
  "description",
  "batch_label",
  "programme_name",
  "department_name",
  "school_name",
  "section_code",
  "room_number",
  "classroom_name",
  "block_name",
  "status",
  "role",
  "degree_name",
  "degree_code",
]);

export function DataTable({
  columns,
  data = [],
  searchKey = "",
  searchPlaceholder = "Search records...",
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  emptyMessage = "No records found.",
  emptyAction = null,
  actions = null,
  rowKey = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [effectivePageSize, setEffectivePageSize] = useState(pageSize || 10);
  const [jumpPageInput, setJumpPageInput] = useState("");
  const [isJumpInputFocused, setIsJumpInputFocused] = useState(false);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const terms = searchTerm.toLowerCase().trim().split(/\s+/);

    return data.filter((item) => {
      if (!item) return false;
      if (searchKey && item[searchKey] !== undefined) {
        const valStr = String(item[searchKey]).toLowerCase();
        return terms.every((t) => valStr.includes(t));
      }

      const allStrings = [];

      // 1. Extract values from column keys
      if (Array.isArray(columns)) {
        for (const col of columns) {
          const key = col.searchKey || col.key;
          if (key && item[key] !== undefined && item[key] !== null) {
            allStrings.push(String(item[key]).toLowerCase());
          }
        }
      }

      // 2. Extract values from semantic text fields
      for (const [k, v] of Object.entries(item)) {
        if (SEMANTIC_TEXT_KEYS.has(k) && v !== null && v !== undefined) {
          allStrings.push(String(v).toLowerCase());
        }
      }

      const combinedText = allStrings.join(" ");
      return terms.every((t) => combinedText.includes(t));
    });
  }, [data, searchTerm, searchKey, columns]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * effectivePageSize;
    return filteredData.slice(start, start + effectivePageSize);
  }, [filteredData, safeCurrentPage, effectivePageSize]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    setJumpPageInput("");
  };

  const handlePageSizeChange = (newSize) => {
    setEffectivePageSize(newSize);
    setCurrentPage(1);
    setJumpPageInput("");
  };

  const handleJumpPageSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
    setJumpPageInput("");
    setIsJumpInputFocused(false);
  };

  const resolveRowKey = (row, rowIdx) => {
    if (typeof rowKey === "function") return rowKey(row, rowIdx);
    if (typeof rowKey === "string" && row[rowKey] !== undefined && row[rowKey] !== null) {
      return String(row[rowKey]);
    }
    return (
      row.session_id ??
      row.attendance_id ??
      row.student_id ??
      row.enrollment_id ??
      row.topic_id ??
      row.material_id ??
      row.quiz_id ??
      row.slot_id ??
      row.faculty_id ??
      row.user_id ??
      row.offering_id ??
      row.subject_id ??
      row.section_id ??
      row.batch_id ??
      row.programme_id ??
      row.school_id ??
      row.department_id ??
      row.classroom_id ??
      row.block_id ??
      row.degree_id ??
      row.id ??
      row._id ??
      `row-${rowIdx}`
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-9 text-sm text-gray-900 placeholder-gray-400 shadow-xs focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="w-full min-w-max border-collapse text-left text-sm text-gray-600">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-900">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  scope="col"
                  className={`px-4 py-3 ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  } ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  <p className="text-base font-medium text-gray-900">{emptyMessage}</p>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setCurrentPage(1);
                      }}
                      className="mt-2 text-xs font-semibold text-green-700 hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                  {emptyAction && <div className="mt-4">{emptyAction}</div>}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const rowId = resolveRowKey(row, rowIdx);
                return (
                  <tr
                    key={rowId}
                    className="transition hover:bg-gray-50/80"
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.key || colIdx}
                        className={`px-4 py-3 text-sm text-gray-700 ${
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        } ${col.className || ""}`}
                      >
                        {col.render
                          ? col.render(row, (safeCurrentPage - 1) * effectivePageSize + rowIdx)
                          : row[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Count Controls */}
      {filteredData.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1 text-xs text-gray-500">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {(safeCurrentPage - 1) * effectivePageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-gray-700">
                {Math.min(safeCurrentPage * effectivePageSize, filteredData.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-700">
                {filteredData.length}
              </span>{" "}
              records
            </div>

            {/* Page Size Selector */}
            {pageSizeOptions && pageSizeOptions.length > 1 && (
              <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
                <span>Rows:</span>
                <select
                  value={effectivePageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="rounded-md border border-gray-300 bg-white py-1 px-1.5 text-xs font-semibold text-gray-700 shadow-2xs focus:border-green-600 focus:outline-none"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* First Page Button */}
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage(1)}
              aria-label="First page"
              title="First page"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronDoubleLeftIcon className="h-3.5 w-3.5" />
            </button>

            {/* Previous Page Button */}
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, Math.min(p, totalPages) - 1))}
              aria-label="Previous page"
              title="Previous page"
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" /> Prev
            </button>

            {/* Jump to Page Form */}
            <form onSubmit={handleJumpPageSubmit} className="flex items-center gap-1 mx-1">
              <span className="text-xs">Page</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={isJumpInputFocused ? jumpPageInput : safeCurrentPage}
                onFocus={() => {
                  setIsJumpInputFocused(true);
                  setJumpPageInput(String(safeCurrentPage));
                }}
                onChange={(e) => setJumpPageInput(e.target.value)}
                onBlur={handleJumpPageSubmit}
                aria-label="Current page number"
                className="w-14 rounded-md border border-gray-300 bg-white py-1 px-1.5 text-center text-xs font-bold text-gray-900 shadow-2xs focus:border-green-600 focus:outline-none"
              />
              <span className="text-xs">of {totalPages}</span>
            </form>

            {/* Next Page Button */}
            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, Math.max(1, p) + 1))}
              aria-label="Next page"
              title="Next page"
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              Next <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>

            {/* Last Page Button */}
            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              aria-label="Last page"
              title="Last page"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-1.5 text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronDoubleRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
