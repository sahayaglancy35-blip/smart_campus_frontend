import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchSubjects } from "../../api/academic";
import { getSchools, getDepartments, getPrograms } from "../../api/academics";
import { getFaculty } from "../../api/admin";
import {
  MagnifyingGlassIcon,
  AcademicCapIcon,
  BookOpenIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export function SubjectDiscoveryDashboard({
  token,
  user,
  onSelectSubject,
  activeSubjectId = null,
}) {
  const isFaculty = user?.role === "FACULTY";
  const isAdmin = user?.role === "ADMIN";
  const isHOD = Boolean(
    user?.is_hod ||
      /head\s+of\s+department|\bhod/i.test(user?.designation || "") ||
      /head\s+of\s+department|\bhod/i.test(user?.designation_name || "") ||
      /head\s+of\s+department|\bhod/i.test(user?.in_charge_class || "") ||
      /head\s+of\s+department|\bhod/i.test(user?.name || "") ||
      /head\s+of\s+department|\bhod/i.test(user?.registerNo || "")
  );

  // Filter State
  const [search, setSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");

  // Data State
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Metadata for filter dropdowns (Admin & HOD)
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  // Fetch filter metadata on mount (Admin and HOD)
  useEffect(() => {
    let active = true;

    async function loadFilterMetadata() {
      if (!token) return;

      try {
        if (isAdmin) {
          const [schoolsRes, deptsRes, progsRes, facRes] = await Promise.allSettled([
            getSchools(token),
            getDepartments(token),
            getPrograms(token),
            getFaculty(token),
          ]);

          if (!active) return;
          if (schoolsRes.status === "fulfilled" && schoolsRes.value?.data) {
            setSchools(Array.isArray(schoolsRes.value.data) ? schoolsRes.value.data : []);
          }
          if (deptsRes.status === "fulfilled" && deptsRes.value?.data) {
            setDepartments(Array.isArray(deptsRes.value.data) ? deptsRes.value.data : []);
          }
          if (progsRes.status === "fulfilled" && progsRes.value?.data) {
            setProgrammes(Array.isArray(progsRes.value.data) ? progsRes.value.data : []);
          }
          if (facRes.status === "fulfilled" && facRes.value?.data) {
            setFacultyList(Array.isArray(facRes.value.data) ? facRes.value.data : []);
          }
        } else if (isHOD) {
          // HOD gets department programmes and faculty
          const [progsRes, facRes] = await Promise.allSettled([
            getPrograms(token),
            getFaculty(token),
          ]);

          if (!active) return;
          if (progsRes.status === "fulfilled" && progsRes.value?.data) {
            setProgrammes(Array.isArray(progsRes.value.data) ? progsRes.value.data : []);
          }
          if (facRes.status === "fulfilled" && facRes.value?.data) {
            setFacultyList(Array.isArray(facRes.value.data) ? facRes.value.data : []);
          }
        }
      } catch (e) {
        console.warn("Could not load full discovery filter metadata:", e);
      }
    }

    loadFilterMetadata();
    return () => {
      active = false;
    };
  }, [token, isAdmin, isHOD]);

  // -------------------------------------------------------------
  // Filter Cascading Logic
  // -------------------------------------------------------------
  const filteredDepartments = useMemo(() => {
    if (!selectedSchool) return departments;
    return departments.filter((d) => Number(d.school_id) === Number(selectedSchool));
  }, [departments, selectedSchool]);

  const filteredProgrammes = useMemo(() => {
    let list = programmes;
    if (selectedSchool) {
      list = list.filter((p) => Number(p.school_id) === Number(selectedSchool));
    }
    if (selectedDepartment) {
      list = list.filter((p) => Number(p.department_id) === Number(selectedDepartment));
    }
    return list;
  }, [programmes, selectedSchool, selectedDepartment]);

  // Load Subjects from Backend API
  useEffect(() => {
    let active = true;

    async function loadSubjects() {
      setLoading(true);
      setError("");

      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (isAdmin && selectedDepartment) params.department_id = selectedDepartment;
        if (isAdmin && selectedSchool) params.school_id = selectedSchool;
        if (selectedProgram) params.programme_id = selectedProgram;
        if (selectedSemester) params.semester = selectedSemester;
        if ((isAdmin || isHOD) && selectedFaculty) params.faculty_id = selectedFaculty;

        const res = await fetchSubjects(token, params);
        if (!active) return;

        if (res?.success && Array.isArray(res?.data)) {
          setSubjects(res.data);
        } else {
          setSubjects([]);
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load subjects from academic registry");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSubjects();
    return () => {
      active = false;
    };
  }, [
    token,
    search,
    selectedSchool,
    selectedDepartment,
    selectedProgram,
    selectedSemester,
    selectedFaculty,
    isAdmin,
    isHOD,
    refreshKey,
  ]);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setSelectedSchool("");
    setSelectedDepartment("");
    setSelectedProgram("");
    setSelectedSemester("");
    setSelectedFaculty("");
  }, []);

  // Compute Aggregated KPIs
  const kpis = useMemo(() => {
    const total = subjects.length;
    const activeCourses = subjects.filter((s) => s.is_active).length;
    const totalUnits = subjects.reduce((sum, s) => sum + (parseInt(s.total_topics, 10) || 0), 0);
    const totalMaterials = subjects.reduce((sum, s) => sum + (parseInt(s.total_materials, 10) || 0), 0);
    const totalQuizzes = subjects.reduce((sum, s) => sum + (parseInt(s.total_quizzes, 10) || 0), 0);
    const totalQuestions = subjects.reduce((sum, s) => sum + (parseInt(s.total_questions, 10) || 0), 0);

    return { total, activeCourses, totalUnits, totalMaterials, totalQuizzes, totalQuestions };
  }, [subjects]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      selectedSchool ||
      selectedDepartment ||
      selectedProgram ||
      selectedSemester ||
      selectedFaculty
  );

  return (
    <div className="space-y-6">
      {/* Scope Header Banner */}
      <div className="rounded-2xl border border-emerald-100 bg-linear-to-r from-emerald-900 via-emerald-800 to-teal-900 p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/60 border border-emerald-500/40 text-emerald-100">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-300" />
                {isAdmin
                  ? "Administration Scope"
                  : isHOD
                    ? `Department Scope: ${user?.department_name || user?.department || "Department"}`
                    : "Faculty Courseware Scope"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isAdmin
                ? "Academic Subjects Discovery"
                : isHOD
                  ? "Department Course Catalog"
                  : "Assigned Academic Courses"}
            </h1>
            <p className="mt-1 text-sm text-emerald-100/90 max-w-3xl">
              {isAdmin
                ? "Filter and inspect active courses across all faculties, constituent schools, and programs."
                : isHOD
                  ? "Oversee departmental curriculum completeness and assign teaching staff."
                  : "Course units, learning materials, and assessments for your assigned classes."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition border border-white/20 shadow-xs"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Live Aggregated KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-emerald-700/50">
          <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-600/30">
            <p className="text-xs font-medium text-emerald-200/80">Total Subjects</p>
            <p className="text-xl font-bold text-white mt-0.5">{kpis.total}</p>
          </div>
          <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-600/30">
            <p className="text-xs font-medium text-emerald-200/80">Active Courses</p>
            <p className="text-xl font-bold text-emerald-300 mt-0.5">{kpis.activeCourses}</p>
          </div>
          <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-600/30">
            <p className="text-xs font-medium text-emerald-200/80">Course Units</p>
            <p className="text-xl font-bold text-white mt-0.5">{kpis.totalUnits}</p>
          </div>
          <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-600/30">
            <p className="text-xs font-medium text-emerald-200/80">Study Materials</p>
            <p className="text-xl font-bold text-white mt-0.5">{kpis.totalMaterials}</p>
          </div>
          <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-600/30">
            <p className="text-xs font-medium text-emerald-200/80">Active Quizzes</p>
            <p className="text-xl font-bold text-amber-300 mt-0.5">{kpis.totalQuizzes}</p>
          </div>
          <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-600/30">
            <p className="text-xs font-medium text-emerald-200/80">Question Bank</p>
            <p className="text-xl font-bold text-teal-300 mt-0.5">{kpis.totalQuestions}</p>
          </div>
        </div>
      </div>

      {/* Discovery & Search Filter Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by subject code (e.g. AIML101) or title..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-gray-50/50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <XMarkIcon className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>

          {/* Granular Filters Grid */}
          {(isAdmin || isHOD) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-gray-100">
              {/* School (Admin Only) */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    School
                  </label>
                  <select
                    value={selectedSchool}
                    onChange={(e) => {
                      const newSchool = e.target.value;
                      setSelectedSchool(newSchool);
                      if (selectedDepartment) {
                        const dept = departments.find(
                          (d) => String(d.department_id) === String(selectedDepartment)
                        );
                        if (dept && newSchool && Number(dept.school_id) !== Number(newSchool)) {
                          setSelectedDepartment("");
                        }
                      }
                      if (selectedProgram) {
                        const prog = programmes.find(
                          (p) => String(p.programme_id) === String(selectedProgram)
                        );
                        if (prog && newSchool && Number(prog.school_id) !== Number(newSchool)) {
                          setSelectedProgram("");
                        }
                      }
                    }}
                    className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="">All Schools</option>
                    {schools.map((s) => (
                      <option key={s.school_id} value={s.school_id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Department (Admin Only) */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Department {selectedSchool ? `(${filteredDepartments.length})` : ""}
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      setSelectedDepartment(newDept);
                      if (selectedProgram) {
                        const prog = programmes.find(
                          (p) => String(p.programme_id) === String(selectedProgram)
                        );
                        if (prog && newDept && Number(prog.department_id) !== Number(newDept)) {
                          setSelectedProgram("");
                        }
                      }
                    }}
                    className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="">All Departments</option>
                    {filteredDepartments.map((d) => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Programme Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Programme {selectedSchool || selectedDepartment ? `(${filteredProgrammes.length})` : ""}
                </label>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="">All Programmes</option>
                  {filteredProgrammes.map((p) => (
                    <option key={p.programme_id} value={p.programme_id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assigned Faculty
                </label>
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="">All Faculty</option>
                  {facultyList.map((f) => (
                    <option key={f.faculty_id} value={f.faculty_id}>
                      {f.full_name} ({f.employee_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-6 w-20 bg-gray-200 rounded-md"></div>
                <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-6 w-3/4 bg-gray-200 rounded-md"></div>
              <div className="h-4 w-1/2 bg-gray-100 rounded-md"></div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="h-10 bg-gray-100 rounded-lg"></div>
                <div className="h-10 bg-gray-100 rounded-lg"></div>
                <div className="h-10 bg-gray-100 rounded-lg"></div>
              </div>
              <div className="h-10 w-full bg-gray-200 rounded-xl"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && subjects.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-bold text-gray-900">
            No Academic Subjects Found
          </h3>
          <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
            {hasActiveFilters
              ? "No subjects matched your active filter criteria. Try adjusting your query or resetting all filters."
              : isFaculty
                ? "No academic subjects are currently assigned to your faculty profile. Please contact your Department HOD."
                : "No subjects exist in the academic catalog matching this query."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Subjects Cards Grid */}
      {!loading && subjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((sub) => {
            const isSelected = activeSubjectId && String(activeSubjectId) === String(sub.subject_id);

            return (
              <div
                key={sub.subject_id}
                className={`group rounded-2xl border transition-all duration-200 bg-white flex flex-col justify-between overflow-hidden ${
                  isSelected
                    ? "border-emerald-600 ring-2 ring-emerald-600/20 shadow-md"
                    : "border-gray-200 hover:border-emerald-400 hover:shadow-md"
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Badges Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 tracking-wider">
                      {sub.code || sub.subject_code}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {sub.credit_hours || sub.credits || "4.0"} Credits
                      </span>
                      {sub.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject Title */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-800 transition-colors line-clamp-2">
                      {sub.name}
                    </h3>

                    {/* Department / School Sub-labels */}
                    <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
                      {sub.department_name && (
                        <div className="flex items-center gap-1.5 truncate">
                          <BuildingOffice2Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{sub.department_name}</span>
                        </div>
                      )}
                      {sub.programme_name && (
                        <div className="flex items-center gap-1.5 truncate text-emerald-700 font-medium">
                          <AcademicCapIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            {sub.programme_name}
                            {sub.semester ? ` • Sem ${sub.semester}` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role Assignment Badge (If user is Faculty) */}
                  {isFaculty && (
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Your Assignment:</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-300">
                        <CheckBadgeIcon className="w-3.5 h-3.5 text-emerald-600" />
                        {sub.my_assignment_role || (isHOD ? "Department HOD" : "Assigned Staff")}
                      </span>
                    </div>
                  )}

                  {/* Resource Counts Metrics Grid */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-center">
                    <div className="bg-gray-50/80 rounded-xl p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-500 font-medium">Units</p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {sub.total_topics || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50/80 rounded-xl p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-500 font-medium">Materials</p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {sub.total_materials || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50/80 rounded-xl p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-500 font-medium">Quizzes</p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {sub.total_quizzes || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50/80 rounded-xl p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-500 font-medium">Faculty</p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {sub.assigned_faculty_count || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Action Button */}
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => onSelectSubject(sub)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition"
                  >
                    <span>Open Course Workspace</span>
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SubjectDiscoveryDashboard;
