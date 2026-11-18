import { useState, useEffect, useMemo } from "react";
import {
  fetchSubjectDetails,
  fetchSubjectTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  reorderTopics,
  fetchTopicMaterials,
  createMaterial,
  togglePublishMaterial,
  deleteMaterial,
  fetchMaterialVersions,
  fetchSignedDownloadUrl,
  fetchTopicQuiz,
  updateTopicQuiz,
  fetchTopicQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  previewQuiz,
  generateQuestionsJob,
  fetchJobStatus,
  assignStaff,
  removeStaffAssignment,
} from "../../api/academic";
import { getFaculty } from "../../api/admin";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import MaterialViewerModal from "./MaterialViewerModal";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  EyeIcon,
  AcademicCapIcon,
  BookOpenIcon,
  DocumentTextIcon,
  UserGroupIcon,
  SparklesIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarDaysIcon,
  PlayIcon,
  PresentationChartBarIcon,
  BuildingOffice2Icon,
  QuestionMarkCircleIcon,
  DocumentPlusIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

function toLocalDatetimeInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function fromLocalDatetimeInput(localStr) {
  if (!localStr) return null;
  const d = new Date(localStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function getMaterialTypeBadge(type) {
  switch (type) {
    case "PDF":
      return {
        icon: DocumentTextIcon,
        color: "text-rose-600 bg-rose-50 border-rose-200",
        label: "PDF Document",
      };
    case "Video":
      return {
        icon: PlayIcon,
        color: "text-indigo-600 bg-indigo-50 border-indigo-200",
        label: "Video Lecture",
      };
    case "Slide":
      return {
        icon: PresentationChartBarIcon,
        color: "text-amber-600 bg-amber-50 border-amber-200",
        label: "Slide Deck (PPT)",
      };
    case "Notes":
      return {
        icon: BookOpenIcon,
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        label: "Lecture Notes",
      };
    default:
      return {
        icon: DocumentTextIcon,
        color: "text-gray-600 bg-gray-50 border-gray-200",
        label: type || "Document",
      };
  }
}

export function SubjectWorkspaceView({ token, user, subjectId, onBack }) {
  const isAdmin = user?.role === "ADMIN";
  const isHOD = Boolean(
    user?.is_hod ||
    /head\s+of\s+department|\bhod/i.test(user?.designation || "") ||
    /head\s+of\s+department|\bhod/i.test(user?.designation_name || "") ||
    /head\s+of\s+department|\bhod/i.test(user?.in_charge_class || "") ||
    /head\s+of\s+department|\bhod/i.test(user?.name || "") ||
    /head\s+of\s+department|\bhod/i.test(user?.registerNo || ""),
  );

  // Tab State: 'overview' | 'units' | 'materials' | 'quiz' | 'questions' | 'staff'
  const [activeTab, setActiveTab] = useState("overview");

  // Core Data
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [facultyCatalog, setFacultyCatalog] = useState([]);

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicForm, setTopicForm] = useState({ title: "", description: "" });

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [materialForm, setMaterialForm] = useState({
    title: "",
    type: "PDF",
    description: "",
    required_flag: false,
    status: "Published",
    file: null,
    notes_content: "",
  });

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    text: "",
    type: "MCQ",
    difficulty: "Medium",
    marks: 1,
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A",
    explanation: "",
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    faculty_id: "",
    role: "Subject Staff",
  });

  const [showAiGenModal, setShowAiGenModal] = useState(false);
  const [aiGenForm, setAiGenForm] = useState({
    count: 5,
    difficulty: "Medium",
  });
  const [aiJobStatus, setAiJobStatus] = useState("idle");
  const [aiDraftQuestions, setAiDraftQuestions] = useState([]);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [versionSnapshots, setVersionSnapshots] = useState([]);
  const [inspectingMaterial, setInspectingMaterial] = useState(null);
  const [viewingMaterial, setViewingMaterial] = useState(null);

  // Question Filters
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionDiffFilter, setQuestionDiffFilter] = useState("ALL");
  const [questionTypeFilter, setQuestionTypeFilter] = useState("ALL");

  // Determine Staff Management Authority (Admin or HOD of this subject's department)
  const canManageStaff = Boolean(
    isAdmin ||
    (isHOD &&
      subjectDetails &&
      parseInt(user?.department_id, 10) ===
        parseInt(subjectDetails.owner_department_id, 10)),
  );

  // 1. Fetch Subject Details and Staff
  useEffect(() => {
    let active = true;

    async function loadDetails() {
      if (!subjectId) return;
      try {
        setLoading(true);
        const res = await fetchSubjectDetails(token, subjectId);
        if (!active) return;
        if (res?.success && res.data) {
          setSubjectDetails(res.data);
          if (Array.isArray(res.data.staff)) {
            setStaffList(res.data.staff);
          }
        }
      } catch (err) {
        if (!active) return;
        setFeedback({
          type: "error",
          message: err.message || "Could not load subject details",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDetails();
    return () => {
      active = false;
    };
  }, [token, subjectId, refreshKey]);

  // 2. Fetch Topics for Subject
  useEffect(() => {
    let active = true;

    async function loadTopics() {
      if (!subjectId) return;
      try {
        const res = await fetchSubjectTopics(token, subjectId);
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setTopics(list);
        if (list.length > 0) {
          setSelectedTopic((prev) =>
            prev
              ? list.find((t) => t.topic_id === prev.topic_id) || list[0]
              : list[0],
          );
        }
      } catch (err) {
        console.warn("Could not load topics:", err);
      }
    }

    loadTopics();
    return () => {
      active = false;
    };
  }, [token, subjectId, refreshKey]);

  // 3. Fetch Details for Selected Topic (Materials, Quiz, Questions)
  useEffect(() => {
    let active = true;

    async function loadTopicDetails() {
      if (!selectedTopic?.topic_id) {
        return;
      }

      const topicId = selectedTopic.topic_id;
      try {
        const [matRes, quizRes, qRes] = await Promise.allSettled([
          fetchTopicMaterials(token, topicId),
          fetchTopicQuiz(token, topicId),
          fetchTopicQuestions(token, topicId),
        ]);

        if (!active) return;

        setMaterials(
          matRes.status === "fulfilled" && Array.isArray(matRes.value?.data)
            ? matRes.value.data
            : [],
        );

        setQuiz(
          quizRes.status === "fulfilled" && quizRes.value?.data
            ? quizRes.value.data
            : null,
        );

        setQuestions(
          qRes.status === "fulfilled" && Array.isArray(qRes.value?.data)
            ? qRes.value.data
            : [],
        );
      } catch (err) {
        console.warn("Failed loading topic details:", err);
      }
    }

    loadTopicDetails();
    return () => {
      active = false;
    };
  }, [token, selectedTopic?.topic_id, refreshKey]);

  // 4. Fetch Faculty Catalog if HOD or Admin
  useEffect(() => {
    if (!canManageStaff || facultyCatalog.length > 0) return;

    let active = true;
    getFaculty(token)
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res?.data)) {
          setFacultyCatalog(res.data);
        }
      })
      .catch((e) => console.warn("Could not load faculty directory:", e));

    return () => {
      active = false;
    };
  }, [token, canManageStaff, facultyCatalog.length]);

  // -------------------------------------------------------------
  // Actions: Topic Management
  // -------------------------------------------------------------
  const handleSaveTopic = async (e) => {
    e.preventDefault();
    if (!topicForm.title.trim()) return;

    try {
      if (editingTopic) {
        await updateTopic(token, editingTopic.topic_id, topicForm);
        setFeedback({ type: "success", message: "Unit updated successfully" });
      } else {
        await createTopic(token, subjectId, topicForm);
        setFeedback({ type: "success", message: "New course unit created" });
      }
      setShowTopicModal(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to save topic unit",
      });
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (
      !window.confirm(
        "Delete this unit? All materials and quizzes in it will be removed.",
      )
    )
      return;
    try {
      await deleteTopic(token, topicId);
      setFeedback({ type: "success", message: "Topic unit deleted" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to delete topic",
      });
    }
  };

  const handleMoveTopic = async (topicId, direction) => {
    const idx = topics.findIndex((t) => t.topic_id === topicId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === topics.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const newTopics = [...topics];
    const temp = newTopics[idx];
    newTopics[idx] = newTopics[targetIdx];
    newTopics[targetIdx] = temp;

    const payload = newTopics.map((t, i) => ({
      topic_id: t.topic_id,
      position: i + 1,
    }));
    setTopics(newTopics.map((t, i) => ({ ...t, position: i + 1 })));

    try {
      await reorderTopics(token, subjectId, payload);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to reorder topics",
      });
      setRefreshKey((k) => k + 1);
    }
  };

  // -------------------------------------------------------------
  // Actions: Study Materials
  // -------------------------------------------------------------
  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.title.trim()) {
      alert("Please specify a title");
      return;
    }
    if (!selectedTopic?.topic_id) {
      alert("Please select a unit first");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(25);

      const interval = setInterval(() => {
        setUploadProgress((p) => (p >= 85 ? 90 : p + 20));
      }, 150);

      await createMaterial(token, selectedTopic.topic_id, {
        title: materialForm.title,
        type: materialForm.type,
        description: materialForm.description,
        required_flag: materialForm.required_flag ? 1 : 0,
        status: materialForm.status,
        file: materialForm.file,
        notes_content: materialForm.notes_content,
        link_url: materialForm.file ? materialForm.file.name : "",
      });

      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setShowMaterialModal(false);
        setFeedback({
          type: "success",
          message: "Study material added to course unit",
        });
        setRefreshKey((k) => k + 1);
      }, 400);
    } catch (err) {
      setIsUploading(false);
      setFeedback({
        type: "error",
        message: err.message || "Failed to upload material",
      });
    }
  };

  const handleTogglePublish = async (materialId, currentStatus) => {
    const nextStatus = currentStatus === "Published" ? "Draft" : "Published";
    try {
      await togglePublishMaterial(token, materialId, nextStatus);
      setFeedback({
        type: "success",
        message: `Material ${nextStatus.toLowerCase()}`,
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to update material",
      });
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm("Are you sure you want to delete this study material?"))
      return;
    try {
      await deleteMaterial(token, materialId);
      setFeedback({ type: "success", message: "Material deleted" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to delete material",
      });
    }
  };

  const handleInspectVersions = async (mat) => {
    setInspectingMaterial(mat);
    try {
      const res = await fetchMaterialVersions(token, mat.material_id);
      if (res?.success && Array.isArray(res?.data)) {
        setVersionSnapshots(res.data);
      } else {
        setVersionSnapshots([]);
      }
      setShowVersionsModal(true);
    } catch {
      setFeedback({
        type: "error",
        message: "Could not load material version history",
      });
    }
  };

  const handleSignedDownload = async (mat) => {
    try {
      const res = await fetchSignedDownloadUrl(token, mat.material_id);
      if (res?.success && res?.download_url) {
        window.open(res.download_url, "_blank", "noopener,noreferrer");
      } else {
        alert("Download URL could not be generated");
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to generate signed download link",
      });
    }
  };

  // -------------------------------------------------------------
  // Actions: Quiz Settings
  // -------------------------------------------------------------
  const handleSaveQuizSettings = async (e) => {
    e.preventDefault();
    if (!quiz?.quiz_id) return;

    try {
      await updateTopicQuiz(token, quiz.quiz_id, {
        title: quiz.title,
        status: quiz.status,
        time_limit: parseInt(quiz.time_limit, 10) || 30,
        pass_mark: parseFloat(quiz.pass_mark) || 50,
        max_attempts: parseInt(quiz.max_attempts, 10) || 3,
        available_from: quiz.available_from,
        due_date: quiz.due_date,
        questions_to_draw: quiz.questions_to_draw
          ? parseInt(quiz.questions_to_draw, 10)
          : null,
        shuffle_questions: quiz.shuffle_questions ? 1 : 0,
        shuffle_options: quiz.shuffle_options ? 1 : 0,
      });
      setFeedback({
        type: "success",
        message: "Quiz settings & schedule saved",
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to update quiz settings",
      });
    }
  };

  // -------------------------------------------------------------
  // Actions: Question Bank
  // -------------------------------------------------------------
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        !questionSearch.trim() ||
        q.text.toLowerCase().includes(questionSearch.toLowerCase());
      const matchesDiff =
        questionDiffFilter === "ALL" || q.difficulty === questionDiffFilter;
      const matchesType =
        questionTypeFilter === "ALL" || q.type === questionTypeFilter;
      return matchesSearch && matchesDiff && matchesType;
    });
  }, [questions, questionSearch, questionDiffFilter, questionTypeFilter]);

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.text.trim()) return;
    if (!selectedTopic?.topic_id) return;

    let normalizedType = questionForm.type;
    if (normalizedType === "True/False") normalizedType = "TrueFalse";
    if (normalizedType === "Short Answer") normalizedType = "ShortAnswer";

    let options;
    let answer;

    if (normalizedType === "MCQ") {
      options = [
        { key: "A", text: questionForm.option_a },
        { key: "B", text: questionForm.option_b },
        { key: "C", text: questionForm.option_c },
        { key: "D", text: questionForm.option_d },
      ];
      answer = questionForm.correct_option || "A";
    } else if (normalizedType === "TrueFalse") {
      options = ["True", "False"];
      answer = questionForm.correct_option === "False" ? "False" : "True";
    } else {
      options = [];
      answer = String(questionForm.correct_option || "").trim();
      if (!answer) {
        setFeedback({
          type: "error",
          message: "Please enter the expected correct answer for this Short Answer question.",
        });
        return;
      }
    }

    const payload = {
      text: questionForm.text.trim(),
      type: normalizedType,
      difficulty: questionForm.difficulty,
      marks: parseInt(questionForm.marks, 10) || 1,
      explanation: questionForm.explanation,
      options,
      answer,
      correct_answer: answer,
      correct_option: answer,
    };

    try {
      if (editingQuestion) {
        await updateQuestion(token, editingQuestion.question_id, payload);
        setFeedback({ type: "success", message: "Question updated" });
      } else {
        await createQuestion(token, selectedTopic.topic_id, payload);
        setFeedback({
          type: "success",
          message: "Question created in question bank",
        });
      }
      setShowQuestionModal(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to save question",
      });
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm("Archive this question from the question bank?"))
      return;
    try {
      await deleteQuestion(token, qId);
      setFeedback({ type: "success", message: "Question removed" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to delete question",
      });
    }
  };

  // -------------------------------------------------------------
  // Actions: ML Question Generation Bridge
  // -------------------------------------------------------------
  const handleTriggerAiJob = async (e) => {
    e.preventDefault();
    if (!selectedTopic?.topic_id) return;

    try {
      setAiJobStatus("polling");
      const res = await generateQuestionsJob(token, selectedTopic.topic_id, {
        count: aiGenForm.count,
        difficulty: aiGenForm.difficulty,
      });

      if (res?.success && res.job_id) {
        // Poll job status every 1.5s
        const pollInterval = setInterval(async () => {
          try {
            const jobRes = await fetchJobStatus(token, res.job_id);
            if (jobRes?.data?.status === "COMPLETED") {
              clearInterval(pollInterval);
              setAiJobStatus("completed");
              setAiDraftQuestions(
                Array.isArray(jobRes.data.draft_questions)
                  ? jobRes.data.draft_questions
                  : [],
              );
            } else if (jobRes?.data?.status === "FAILED") {
              clearInterval(pollInterval);
              setAiJobStatus("failed");
            }
          } catch {
            clearInterval(pollInterval);
            setAiJobStatus("failed");
          }
        }, 1500);
      } else {
        setAiJobStatus("failed");
      }
    } catch (err) {
      setAiJobStatus("failed");
      setFeedback({
        type: "error",
        message: err.message || "AI job initiation failed",
      });
    }
  };

  const handleImportDraftQuestion = async (draft) => {
    try {
      const answer =
        draft.answer || draft.correct_answer || draft.correct_option || "A";
      await createQuestion(token, selectedTopic.topic_id, {
        text: draft.text,
        type: draft.type || "MCQ",
        difficulty: draft.difficulty || "Medium",
        marks: draft.marks || 1,
        options: draft.options,
        answer,
        correct_answer: answer,
        correct_option: answer,
        explanation: draft.explanation,
      });
      setAiDraftQuestions((prev) => prev.filter((d) => d !== draft));
      setFeedback({
        type: "success",
        message: "Draft imported to question bank",
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed importing question",
      });
    }
  };

  // -------------------------------------------------------------
  // Actions: Staff Assignment (HOD & Admin)
  // -------------------------------------------------------------
  const handleAssignStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.faculty_id) {
      alert("Please select a faculty member");
      return;
    }

    try {
      await assignStaff(token, subjectId, {
        faculty_id: parseInt(staffForm.faculty_id, 10),
        role: staffForm.role,
      });
      setFeedback({
        type: "success",
        message: "Faculty member assigned to course",
      });
      setShowStaffModal(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to assign staff member",
      });
    }
  };

  const handleRemoveStaff = async (assignmentId) => {
    if (
      !window.confirm(
        "Remove this faculty member's assignment from the course?",
      )
    )
      return;
    try {
      await removeStaffAssignment(token, subjectId, assignmentId);
      setFeedback({ type: "success", message: "Faculty assignment removed" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to remove staff assignment",
      });
    }
  };

  // -------------------------------------------------------------
  // Actions: Student View Preview
  // -------------------------------------------------------------
  const handleOpenStudentPreview = async () => {
    if (!quiz?.quiz_id) {
      alert("No quiz configured for current unit to preview.");
      return;
    }
    try {
      const res = await previewQuiz(token, quiz.quiz_id);
      if (res?.success && res.data) {
        setPreviewData(res.data);
        setShowPreviewModal(true);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed loading student preview",
      });
    }
  };

  if (loading && !subjectDetails) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
        <LoadingSpinner message="Loading course workspace..." size="lg" />
      </div>
    );
  }

  const sub = subjectDetails || {};

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Top Navigation & Workspace Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
        {/* Breadcrumb & Back Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-900 transition"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Back to Subjects</span>
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-400">Course Workspace</span>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-800">
              {sub.code || sub.subject_code}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {quiz && (
              <button
                type="button"
                onClick={handleOpenStudentPreview}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition shadow-xs"
              >
                <EyeIcon className="w-4 h-4 text-emerald-600" />
                <span>Student Preview</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition"
              title="Refresh course data"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Course Identity Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-2 border-t border-gray-100">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 tracking-wider">
                {sub.code || sub.subject_code}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                {sub.credits || sub.credit_hours || "4.0"} Academic Credits
              </span>
              {sub.is_active ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Active Curriculum
                </span>
              ) : (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  Inactive
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {sub.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
              {sub.department_name && (
                <div className="flex items-center gap-1.5">
                  <BuildingOffice2Icon className="w-4 h-4 text-gray-400" />
                  <span>{sub.department_name}</span>
                </div>
              )}
              {sub.programme_name && (
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <AcademicCapIcon className="w-4 h-4 text-emerald-600" />
                  <span>
                    {sub.programme_name}
                    {sub.semester ? ` • Semester ${sub.semester}` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center shrink-0">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 min-w-[90px]">
              <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                Units
              </p>
              <p className="text-lg font-bold text-emerald-900 mt-0.5">
                {sub.total_topics || topics.length}
              </p>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 min-w-[90px]">
              <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                Materials
              </p>
              <p className="text-lg font-bold text-emerald-900 mt-0.5">
                {sub.total_materials || 0}
              </p>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 min-w-[90px]">
              <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                Quizzes
              </p>
              <p className="text-lg font-bold text-emerald-900 mt-0.5">
                {sub.total_quizzes || 0}
              </p>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 min-w-[90px]">
              <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                Faculty
              </p>
              <p className="text-lg font-bold text-emerald-900 mt-0.5">
                {staffList.length}
              </p>
            </div>
          </div>
        </div>

        {/* 6 Tabs Navigation Bar */}
        <div className="border-t border-gray-100 pt-4">
          <nav className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: "overview", label: "Overview", icon: BookOpenIcon },
              {
                id: "units",
                label: `Course Units (${topics.length})`,
                icon: DocumentTextIcon,
              },
              {
                id: "materials",
                label: `Study Materials (${materials.length})`,
                icon: DocumentPlusIcon,
              },
              {
                id: "quiz",
                label: "Quiz Settings & Schedule",
                icon: CalendarDaysIcon,
              },
              {
                id: "questions",
                label: `Question Bank (${questions.length})`,
                icon: QuestionMarkCircleIcon,
              },
              {
                id: "staff",
                label: `Teaching Staff (${staffList.length})`,
                icon: UserGroupIcon,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: OVERVIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Course Structure & Units List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-emerald-700" />
                    <span>Curriculum Units Breakdown</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("units")}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    Manage Units →
                  </button>
                </div>

                {topics.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-4">
                    No curriculum units have been defined for this course yet.
                    Switch to the Course Units tab to add the first unit.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {topics.map((t, idx) => (
                      <div
                        key={t.topic_id}
                        className="py-3 flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Unit {String(idx + 1).padStart(2, "0")}
                            </span>
                            <h4 className="text-sm font-semibold text-gray-900">
                              {t.title}
                            </h4>
                          </div>
                          {t.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {t.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs shrink-0">
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded-md border border-gray-200">
                            {t.total_materials || 0} Materials
                          </span>
                          {t.quiz_id ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200 font-medium">
                              Quiz Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">
                              No Quiz
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Teaching Team Summary */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5 text-emerald-700" />
                    <span>Teaching Faculty Team</span>
                  </h3>
                  {canManageStaff && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("staff")}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                    >
                      Manage Staff →
                    </button>
                  )}
                </div>

                {staffList.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-4">
                    No faculty members are currently assigned to this course.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {staffList.map((st) => (
                      <div
                        key={st.assignment_id || st.faculty_id}
                        className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-900">
                            {st.full_name}
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {st.role || "Subject Staff"}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {st.designation_name || "Faculty Member"} •{" "}
                          {st.employee_code}
                        </p>
                        {st.email && (
                          <p className="text-[11px] text-emerald-700 truncate">
                            {st.email}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: COURSE UNITS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "units" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Syllabus Course Units
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Organize learning topics in sequential curriculum units. Each
                unit holds materials, quizzes, and questions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingTopic(null);
                setTopicForm({ title: "", description: "" });
                setShowTopicModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition shadow-xs self-start sm:self-auto"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Course Unit</span>
            </button>
          </div>

          {topics.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <DocumentTextIcon className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700 mt-2">
                No units yet
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Click "Add Course Unit" above to create Unit 01.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topics.map((t, idx) => {
                const isSelected = selectedTopic?.topic_id === t.topic_id;

                return (
                  <div
                    key={t.topic_id}
                    className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-600/20"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300">
                          Unit {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900">
                          {t.title}
                        </h4>
                        {isSelected && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Active in Workspace
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-gray-600 max-w-xl">
                          {t.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
                        <span>{t.total_materials || 0} Materials</span>
                        <span>•</span>
                        <span>{t.approved_questions || 0} Questions</span>
                        <span>•</span>
                        <span>
                          {t.quiz_id
                            ? `Quiz Pass Mark: ${t.quiz_pass_mark || 50}%`
                            : "No Quiz"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedTopic(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? "bg-emerald-700 text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {isSelected ? "Active Unit" : "Select Unit"}
                      </button>

                      {/* Reorder Up */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveTopic(t.topic_id, "up")}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                        title="Move up"
                      >
                        <ArrowUpIcon className="w-3.5 h-3.5" />
                      </button>

                      {/* Reorder Down */}
                      <button
                        type="button"
                        disabled={idx === topics.length - 1}
                        onClick={() => handleMoveTopic(t.topic_id, "down")}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                        title="Move down"
                      >
                        <ArrowDownIcon className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTopic(t);
                          setTopicForm({
                            title: t.title,
                            description: t.description || "",
                          });
                          setShowTopicModal(true);
                        }}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
                        title="Edit unit details"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteTopic(t.topic_id)}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Delete unit"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: STUDY MATERIALS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "materials" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
          {/* Unit Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Active Curriculum Unit:
              </label>
              <select
                value={selectedTopic?.topic_id || ""}
                onChange={(e) => {
                  const found = topics.find(
                    (t) => String(t.topic_id) === String(e.target.value),
                  );
                  if (found) setSelectedTopic(found);
                }}
                className="py-1.5 px-3 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              >
                {topics.map((t, i) => (
                  <option key={t.topic_id} value={t.topic_id}>
                    Unit {String(i + 1).padStart(2, "0")}: {t.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={!selectedTopic}
              onClick={() => {
                setMaterialForm({
                  title: "",
                  type: "PDF",
                  description: "",
                  required_flag: false,
                  status: "Published",
                  file: null,
                  notes_content: "",
                });
                setShowMaterialModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition shadow-xs disabled:opacity-50"
            >
              <DocumentPlusIcon className="w-4 h-4" />
              <span>Upload Study Material</span>
            </button>
          </div>

          {/* Materials Cards List */}
          {materials.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <DocumentTextIcon className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700 mt-2">
                No study materials in this unit
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Upload slides, documents, or lecture notes for students.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map((mat) => {
                const badge = getMaterialTypeBadge(mat.type);
                const BadgeIcon = badge.icon;

                return (
                  <div
                    key={mat.material_id}
                    className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col justify-between hover:border-gray-300 shadow-xs space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}
                        >
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {mat.required_flag ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                              Prerequisite for Quiz
                            </span>
                          ) : null}

                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              mat.status === "Published"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {mat.status}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 line-clamp-2">
                        {mat.title}
                      </h4>
                      {mat.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                          {mat.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {/* View In-App */}
                        <button
                          type="button"
                          onClick={() => setViewingMaterial(mat)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                          title="Preview study material"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {/* Download File */}
                        <button
                          type="button"
                          onClick={() => handleSignedDownload(mat)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                          title="Download study material"
                        >
                          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>

                        {/* Version History */}
                        <button
                          type="button"
                          onClick={() => handleInspectVersions(mat)}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                          title="View revision versions"
                        >
                          Versions
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Publish/Unpublish Toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            handleTogglePublish(mat.material_id, mat.status)
                          }
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                            mat.status === "Published"
                              ? "text-amber-800 bg-amber-50 hover:bg-amber-100"
                              : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                          }`}
                        >
                          {mat.status === "Published" ? "Unpublish" : "Publish"}
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(mat.material_id)}
                          className="p-1 text-gray-400 hover:text-rose-700 transition"
                          title="Delete material"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: QUIZ SETTINGS & SCHEDULE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "quiz" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Unit Proctored Quiz Configuration
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure evaluation window, time limit, pass percentage, and
                anti-cheat randomization.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700">
                Unit:
              </label>
              <select
                value={selectedTopic?.topic_id || ""}
                onChange={(e) => {
                  const found = topics.find(
                    (t) => String(t.topic_id) === String(e.target.value),
                  );
                  if (found) setSelectedTopic(found);
                }}
                className="py-1 px-2.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white"
              >
                {topics.map((t, i) => (
                  <option key={t.topic_id} value={t.topic_id}>
                    Unit {String(i + 1).padStart(2, "0")}: {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!quiz ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <CalendarDaysIcon className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700 mt-2">
                No quiz initialized for this unit
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Please ensure curriculum units have quiz authoring enabled.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSaveQuizSettings}
              className="space-y-6 max-w-2xl"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    value={quiz.title || ""}
                    onChange={(e) =>
                      setQuiz({ ...quiz, title: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Time Limit (Minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="180"
                      value={quiz.time_limit || 30}
                      onChange={(e) =>
                        setQuiz({ ...quiz, time_limit: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Pass Mark (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={quiz.pass_mark || 50}
                      onChange={(e) =>
                        setQuiz({ ...quiz, pass_mark: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Max Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={quiz.max_attempts || 3}
                      onChange={(e) =>
                        setQuiz({ ...quiz, max_attempts: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Available From
                    </label>
                    <input
                      type="datetime-local"
                      value={toLocalDatetimeInput(quiz.available_from)}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          available_from: fromLocalDatetimeInput(
                            e.target.value,
                          ),
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Due Date / Closes At
                    </label>
                    <input
                      type="datetime-local"
                      value={toLocalDatetimeInput(quiz.due_date)}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          due_date: fromLocalDatetimeInput(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Random Question Draw Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 5 (Leave blank for all)"
                      value={quiz.questions_to_draw || ""}
                      onChange={(e) =>
                        setQuiz({ ...quiz, questions_to_draw: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Anti-collusion randomization: randomly selects N questions from the pool for each student sitting (e.g. 10 out of 25). Leave blank to draw all questions.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Quiz Status
                    </label>
                    <select
                      value={quiz.status || "Draft"}
                      onChange={(e) =>
                        setQuiz({ ...quiz, status: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300"
                    >
                      <option value="Draft">
                        Draft (Hidden from students)
                      </option>
                      <option value="Published">
                        Published (Active evaluation)
                      </option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Anti-cheat Toggles */}
                <div className="pt-2 flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(quiz.shuffle_questions)}
                      onChange={(e) =>
                        setQuiz({
                          ...quiz,
                          shuffle_questions: e.target.checked,
                        })
                      }
                      className="rounded-sm border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Shuffle questions sequence per candidate</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(quiz.shuffle_options)}
                      onChange={(e) =>
                        setQuiz({ ...quiz, shuffle_options: e.target.checked })
                      }
                      className="rounded-sm border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Shuffle multiple-choice option keys (A-D)</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition"
              >
                Save Quiz Configuration
              </button>
            </form>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: QUESTION BANK */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "questions" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
          {/* Header & AI Generate Bridge Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Unit Question Bank
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Author manual questions or trigger the AI machine learning
                bridge to generate questions from curriculum notes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAiJobStatus("idle");
                  setAiDraftQuestions([]);
                  setShowAiGenModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition shadow-xs"
              >
                <SparklesIcon className="w-4 h-4 text-indigo-600" />
                <span>AI Question Generator</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setQuestionForm({
                    text: "",
                    type: "MCQ",
                    difficulty: "Medium",
                    marks: 1,
                    option_a: "",
                    option_b: "",
                    option_c: "",
                    option_d: "",
                    correct_option: "A",
                    explanation: "",
                  });
                  setShowQuestionModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition shadow-xs"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
              placeholder="Search questions..."
              className="flex-1 w-full px-3 py-2 text-xs rounded-lg border border-gray-300"
            />

            <select
              value={questionDiffFilter}
              onChange={(e) => setQuestionDiffFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-gray-300 bg-white"
            >
              <option value="ALL">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select
              value={questionTypeFilter}
              onChange={(e) => setQuestionTypeFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-gray-300 bg-white"
            >
              <option value="ALL">All Question Types</option>
              <option value="MCQ">Multiple Choice (MCQ)</option>
              <option value="True/False">True / False</option>
              <option value="Short Answer">Short Answer</option>
            </select>
          </div>

          {/* Questions List */}
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <QuestionMarkCircleIcon className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700 mt-2">
                No questions found
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Use the "Add Question" button or generate questions with AI.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => (
                <div
                  key={q.question_id}
                  className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 hover:border-gray-300 transition shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">
                        #{idx + 1}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          q.difficulty === "Easy"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : q.difficulty === "Hard"
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {q.type} • {q.marks || 1} Mark
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.question_id)}
                        className="p-1 text-gray-400 hover:text-rose-700 transition"
                        title="Delete question"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-gray-900">
                    {q.text}
                  </p>

                  {/* Options Display */}
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt, optIdx) => {
                        const optKey =
                          typeof opt === "object" && opt !== null
                            ? opt.key
                            : ["A", "B", "C", "D"][optIdx] ||
                              String(optIdx + 1);
                        const optText =
                          typeof opt === "object" && opt !== null
                            ? opt.text
                            : opt;
                        const correctVal = q.correct_answer || q.answer || "";
                        const isCorrect =
                          (optKey &&
                            String(optKey).toUpperCase() ===
                              String(correctVal).toUpperCase()) ||
                          (optText &&
                            String(optText).trim().toLowerCase() ===
                              String(correctVal).trim().toLowerCase());
                        return (
                          <div
                            key={optKey || `opt_${optIdx}`}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                              isCorrect
                                ? "bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold"
                                : "bg-gray-50 text-gray-700 border border-gray-200"
                            }`}
                          >
                            <span>
                              <span className="font-bold mr-1.5">
                                {optKey}.
                              </span>
                              {optText}
                            </span>
                            {isCorrect && (
                              <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.explanation && (
                    <p className="text-xs text-gray-500 italic pt-1">
                      Explanation: {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: TEACHING STAFF ASSIGNMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "staff" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Teaching Staff Allocation & Responsibilities
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {canManageStaff
                  ? "Assign or adjust teaching faculty responsibilities (Primary Instructor, Co-Teacher, Lab Assistant, Coordinator)."
                  : "Teaching faculty allocated to deliver this curriculum course. Staff allocations are managed by the HOD and University Administration."}
              </p>
            </div>

            {canManageStaff && (
              <button
                type="button"
                onClick={() => {
                  setStaffForm({ faculty_id: "", role: "Subject Staff" });
                  setShowStaffModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition shadow-xs self-start sm:self-auto"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Assign Teaching Staff</span>
              </button>
            )}
          </div>

          {!canManageStaff && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800 flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
              <span>
                Staff assignments for this subject are managed by the Department
                Head ({sub.department_name || "CIS"}) and University
                Administration.
              </span>
            </div>
          )}

          {staffList.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <UserGroupIcon className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700 mt-2">
                No faculty assigned
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Use "Assign Teaching Staff" above to allocate instructors.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((st) => (
                <div
                  key={st.assignment_id || st.faculty_id}
                  className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-xs hover:border-gray-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        {st.full_name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {st.employee_code}
                      </p>
                    </div>

                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {st.role}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1 pt-1">
                    <p>Designation: {st.designation_name || "Faculty"}</p>
                    {st.email && (
                      <p className="truncate text-emerald-700">{st.email}</p>
                    )}
                    {st.created_at && (
                      <p className="text-[10px] text-gray-400">
                        Assigned on:{" "}
                        {new Date(st.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {canManageStaff && (
                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(st.assignment_id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        <span>Remove Assignment</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT TOPIC UNIT */}
      {/* ------------------------------------------------------------- */}
      {showTopicModal && (
        <Modal
          isOpen={showTopicModal}
          onClose={() => setShowTopicModal(false)}
          title={editingTopic ? "Edit Course Unit" : "Add New Course Unit"}
        >
          <form onSubmit={handleSaveTopic} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Unit Title
              </label>
              <input
                type="text"
                value={topicForm.title}
                onChange={(e) =>
                  setTopicForm({ ...topicForm, title: e.target.value })
                }
                placeholder="e.g. Unit 01: Introduction to Problem Solving"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Syllabus Description / Learning Objectives
              </label>
              <textarea
                rows="3"
                value={topicForm.description}
                onChange={(e) =>
                  setTopicForm({ ...topicForm, description: e.target.value })
                }
                placeholder="Key concepts, syllabus scope, and course outcomes..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTopicModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
              >
                {editingTopic ? "Update Unit" : "Create Unit"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: UPLOAD STUDY MATERIAL */}
      {/* ------------------------------------------------------------- */}
      {showMaterialModal && (
        <Modal
          isOpen={showMaterialModal}
          onClose={() => !isUploading && setShowMaterialModal(false)}
          title="Upload Study Material to Unit"
        >
          <form onSubmit={handleUploadMaterial} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Resource Title
              </label>
              <input
                type="text"
                value={materialForm.title}
                onChange={(e) =>
                  setMaterialForm({ ...materialForm, title: e.target.value })
                }
                placeholder="e.g. Lecture 02 - Syntax, Variables and Scope"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Material Type
                </label>
                <select
                  value={materialForm.type}
                  onChange={(e) =>
                    setMaterialForm({ ...materialForm, type: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                >
                  <option value="PDF">PDF Document</option>
                  <option value="Slide">Slide Deck (PPT/PDF)</option>
                  <option value="Video">Video Lecture URL</option>
                  <option value="Notes">Lecture Notes (Rich Text)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Publish Status
                </label>
                <select
                  value={materialForm.status}
                  onChange={(e) =>
                    setMaterialForm({ ...materialForm, status: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                >
                  <option value="Published">Published (Available)</option>
                  <option value="Draft">Draft (Hidden)</option>
                </select>
              </div>
            </div>

            {materialForm.type === "Notes" ? (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lecture Notes Content
                </label>
                <textarea
                  rows="4"
                  value={materialForm.notes_content}
                  onChange={(e) =>
                    setMaterialForm({
                      ...materialForm,
                      notes_content: e.target.value,
                    })
                  }
                  placeholder="Paste Markdown or text notes..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  File Attachment
                </label>
                <input
                  type="file"
                  onChange={(e) =>
                    setMaterialForm({
                      ...materialForm,
                      file: e.target.files[0],
                    })
                  }
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows="2"
                value={materialForm.description}
                onChange={(e) =>
                  setMaterialForm({
                    ...materialForm,
                    description: e.target.value,
                  })
                }
                placeholder="Brief summary of content..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={materialForm.required_flag}
                onChange={(e) =>
                  setMaterialForm({
                    ...materialForm,
                    required_flag: e.target.checked,
                  })
                }
                className="rounded-sm border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                Mark as Mandatory Prerequisite (Required before Quiz can be
                unlocked)
              </span>
            </label>

            {isUploading && (
              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Uploading securely...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setShowMaterialModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
              >
                {isUploading ? "Uploading..." : "Upload Material"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT QUESTION */}
      {/* ------------------------------------------------------------- */}
      {showQuestionModal && (
        <Modal
          isOpen={showQuestionModal}
          onClose={() => setShowQuestionModal(false)}
          title={editingQuestion ? "Edit Question" : "Add Question to Bank"}
        >
          <form onSubmit={handleSaveQuestion} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Question Text
              </label>
              <textarea
                rows="2"
                value={questionForm.text}
                onChange={(e) =>
                  setQuestionForm({ ...questionForm, text: e.target.value })
                }
                placeholder="State the question clearly..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={questionForm.type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    let defOption = "A";
                    if (nextType === "TrueFalse" || nextType === "True/False") defOption = "True";
                    if (nextType === "ShortAnswer" || nextType === "Short Answer") defOption = "";
                    setQuestionForm({
                      ...questionForm,
                      type: nextType,
                      correct_option: defOption,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                >
                  <option value="MCQ">Multiple Choice</option>
                  <option value="TrueFalse">True / False</option>
                  <option value="ShortAnswer">Short Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  value={questionForm.difficulty}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      difficulty: e.target.value,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Marks
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={questionForm.marks}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, marks: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300"
                />
              </div>
            </div>

            {questionForm.type === "MCQ" && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700">
                  Options (A - D)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">A.</span>
                    <input
                      type="text"
                      value={questionForm.option_a}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          option_a: e.target.value,
                        })
                      }
                      placeholder="Option A text"
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-gray-300"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">B.</span>
                    <input
                      type="text"
                      value={questionForm.option_b}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          option_b: e.target.value,
                        })
                      }
                      placeholder="Option B text"
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-gray-300"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">C.</span>
                    <input
                      type="text"
                      value={questionForm.option_c}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          option_c: e.target.value,
                        })
                      }
                      placeholder="Option C text"
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-gray-300"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">D.</span>
                    <input
                      type="text"
                      value={questionForm.option_d}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          option_d: e.target.value,
                        })
                      }
                      placeholder="Option D text"
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-gray-300"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Correct Option
                  </label>
                  <select
                    value={questionForm.correct_option}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        correct_option: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
              </div>
            )}

            {(questionForm.type === "TrueFalse" ||
              questionForm.type === "True/False") && (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Select Correct Answer
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setQuestionForm({
                        ...questionForm,
                        correct_option: "True",
                      })
                    }
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      questionForm.correct_option === "True"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    ✓ True
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setQuestionForm({
                        ...questionForm,
                        correct_option: "False",
                      })
                    }
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      questionForm.correct_option === "False"
                        ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    ✗ False
                  </button>
                </div>
              </div>
            )}

            {(questionForm.type === "ShortAnswer" ||
              questionForm.type === "Short Answer") && (
              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Expected Answer / Key Phrase
                </label>
                <input
                  type="text"
                  value={questionForm.correct_option || ""}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      correct_option: e.target.value,
                    })
                  }
                  placeholder="Enter the expected answer key phrase..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300"
                  required
                />
                <p className="text-[11px] text-gray-500">
                  Student submissions will be verified against this answer key.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Explanation (Shown during remediation review)
              </label>
              <textarea
                rows="2"
                value={questionForm.explanation}
                onChange={(e) =>
                  setQuestionForm({
                    ...questionForm,
                    explanation: e.target.value,
                  })
                }
                placeholder="Why is this answer correct? References..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
              >
                Save Question
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: AI QUESTION GENERATION BRIDGE */}
      {/* ------------------------------------------------------------- */}
      {showAiGenModal && (
        <Modal
          isOpen={showAiGenModal}
          onClose={() => setShowAiGenModal(false)}
          title="AI Machine Learning Question Generator"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Generates rigorous curriculum questions from course notes and
              topics using the background ML worker bridge.
            </p>

            <form
              onSubmit={handleTriggerAiJob}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Draft Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={aiGenForm.count}
                  onChange={(e) =>
                    setAiGenForm({ ...aiGenForm, count: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  value={aiGenForm.difficulty}
                  onChange={(e) =>
                    setAiGenForm({ ...aiGenForm, difficulty: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="col-span-2">
                <button
                  type="submit"
                  disabled={aiJobStatus === "polling"}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  <SparklesIcon className="w-4 h-4" />
                  <span>
                    {aiJobStatus === "polling"
                      ? "Generating in Background..."
                      : "Trigger ML Generation"}
                  </span>
                </button>
              </div>
            </form>

            {aiJobStatus === "polling" && (
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-center space-y-2">
                <LoadingSpinner
                  message="Polling ML worker status..."
                  size="sm"
                />
                <p className="text-[11px] text-indigo-700">
                  Synthesizing questions from course curriculum. This typically
                  takes 2-4 seconds.
                </p>
              </div>
            )}

            {aiJobStatus === "completed" && aiDraftQuestions.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-gray-100 max-h-60 overflow-y-auto">
                <p className="text-xs font-bold text-gray-900">
                  Generated Drafts ({aiDraftQuestions.length})
                </p>
                {aiDraftQuestions.map((draft, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 line-clamp-1">
                        {draft.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleImportDraftQuestion(draft)}
                        className="px-2 py-1 rounded-md bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800 shrink-0 ml-2"
                      >
                        Import
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Answer: {draft.correct_answer} • Difficulty:{" "}
                      {draft.difficulty || "Medium"}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {aiJobStatus === "completed" && aiDraftQuestions.length === 0 && (
              <p className="text-xs text-emerald-700 text-center font-medium">
                All generated drafts have been imported!
              </p>
            )}

            {aiJobStatus === "failed" && (
              <p className="text-xs text-rose-700 text-center">
                ML generation job could not be completed. Please try again.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ASSIGN TEACHING STAFF */}
      {/* ------------------------------------------------------------- */}
      {showStaffModal && (
        <Modal
          isOpen={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          title="Assign Teaching Staff to Course"
        >
          <form onSubmit={handleAssignStaff} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Faculty Member
              </label>
              <select
                value={staffForm.faculty_id}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, faculty_id: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                required
              >
                <option value="">Select Faculty...</option>
                {facultyCatalog.map((f) => (
                  <option key={f.faculty_id} value={f.faculty_id}>
                    {f.full_name} ({f.employee_code}) -{" "}
                    {f.designation_name || "Faculty"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Teaching Responsibility / Role
              </label>
              <select
                value={staffForm.role}
                onChange={(e) =>
                  setStaffForm({ ...staffForm, role: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
              >
                <option value="Primary Instructor">
                  Primary Instructor (Lead)
                </option>
                <option value="Co-Teacher">Co-Teacher</option>
                <option value="Course Coordinator">Course Coordinator</option>
                <option value="Lab Assistant">Lab Assistant</option>
                <option value="Subject Staff">Subject Staff</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
              >
                Confirm Assignment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: STUDENT CANDIDATE PREVIEW */}
      {/* ------------------------------------------------------------- */}
      {showPreviewModal && previewData && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title={`Candidate Preview: ${previewData.quiz?.title || "Unit Quiz"}`}
        >
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              <span className="font-bold">Student Viewport Simulation:</span>{" "}
              This preview renders questions and options exactly as a student
              sees during an active attempt.
            </div>

            <div className="space-y-4">
              {(previewData.questions || []).map((q, idx) => (
                <div
                  key={q.question_id || `preview_q_${idx}`}
                  className="p-3 border border-gray-200 rounded-xl space-y-2 text-xs"
                >
                  <p className="font-bold text-gray-900">
                    Q{idx + 1}. {q.text}
                  </p>
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="space-y-1.5 pl-2">
                      {q.options.map((opt, optIndex) => {
                        const optKey =
                          typeof opt === "object" && opt !== null
                            ? opt.key
                            : ["A", "B", "C", "D"][optIndex] || String(optIndex + 1);
                        const optText =
                          typeof opt === "object" && opt !== null ? opt.text : opt;
                        return (
                          <div
                            key={optKey || `opt_${optIndex}`}
                            className="flex items-center gap-2 text-gray-700"
                          >
                            <span className="font-bold text-gray-500">
                              {optKey}.
                            </span>
                            <span>{optText}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: VERSION HISTORY SNAPSHOTS */}
      {/* ------------------------------------------------------------- */}
      {showVersionsModal && (
        <Modal
          isOpen={showVersionsModal}
          onClose={() => setShowVersionsModal(false)}
          title={`Version Snapshots: ${inspectingMaterial?.title || "Material"}`}
        >
          <div className="space-y-3">
            {versionSnapshots.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                No archived revision snapshots. This resource is at its initial
                revision (v1).
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {versionSnapshots.map((v) => (
                  <div
                    key={v.version_id}
                    className="p-3 rounded-xl border border-gray-200 bg-gray-50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-gray-900">
                      <span>Version {v.version_number}</span>
                      <span className="text-[10px] text-gray-500 font-normal">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-600 line-clamp-1">{v.title}</p>
                    {v.change_summary && (
                      <p className="text-gray-500 italic text-[11px]">
                        Change: {v.change_summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: STUDY MATERIAL IN-APP VIEWER */}
      {/* ------------------------------------------------------------- */}
      <MaterialViewerModal
        isOpen={Boolean(viewingMaterial)}
        onClose={() => setViewingMaterial(null)}
        material={viewingMaterial}
        token={token}
      />
    </div>
  );
}

export default SubjectWorkspaceView;
