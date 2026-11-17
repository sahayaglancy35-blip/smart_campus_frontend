import { useState, useEffect, useCallback } from "react";
import {
  fetchSubjectTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  fetchTopicMaterials,
  uploadMaterial,
  togglePublishMaterial,
  deleteMaterial,
  fetchMaterialVersions,
  fetchTopicQuiz,
  updateTopicQuiz,
  fetchTopicQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  previewQuiz,
} from "../../api/academic";
import { CoursePicker, TopicList, TopicHeader } from "../academic/AcademicShared";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  DocumentPlusIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ClockIcon,
  CalendarDaysIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  PlayIcon,
  PresentationChartBarIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

// datetime-local works in LOCAL time; the API stores UTC ISO strings.
function toLocalDatetimeInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetimeInput(localStr) {
  if (!localStr) return null;
  const d = new Date(localStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

const ACCEPT = { PDF: ".pdf", Slide: ".ppt,.pptx", Video: "video/mp4" };
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const EMPTY_MATERIAL = {
  title: "",
  type: "PDF",
  description: "",
  required_flag: true,
  status: "Published",
  file: null,
  notes_content: "",
  video_url: "",
};

const EMPTY_QUESTION = {
  type: "MCQ",
  text: "",
  options: ["", "", "", ""],
  answer: "",
  explanation: "",
  marks: 1.0,
  difficulty: "Medium",
  source_ref: "",
};

function FacultyCourseWorkspace({ token, user, subject, header }) {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Tab mode on selected topic: "materials" | "quiz" | "questions"
  const [activeTab, setActiveTab] = useState("materials");

  // Modals
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicForm, setTopicForm] = useState({ title: "", description: "", position: 1 });

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL);

  const [versionHistoryMat, setVersionHistoryMat] = useState(null);
  const [versionList, setVersionList] = useState([]);

  // Question Editor Modal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION);

  // Quiz Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Load topics
  const loadTopics = useCallback(async () => {
    if (!subject) return;
    try {
      const res = await fetchSubjectTopics(token, subject.subject_id);
      const list = Array.isArray(res?.data) ? res.data : [];
      setTopics(list);
      if (list.length > 0) {
        setSelectedTopic(list[0]);
      } else {
        setSelectedTopic(null);
        setMaterials([]);
        setQuiz(null);
        setQuestions([]);
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to load topics" });
    } finally {
      setLoading(false);
    }
  }, [token, subject]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // Load topic details (materials, quiz, questions)
  const loadTopicDetails = useCallback(async () => {
    if (!selectedTopic) return;
    try {
      const [matRes, quizRes, qRes] = await Promise.all([
        fetchTopicMaterials(token, selectedTopic.topic_id),
        fetchTopicQuiz(token, selectedTopic.topic_id),
        fetchTopicQuestions(token, selectedTopic.topic_id),
      ]);
      setMaterials(Array.isArray(matRes?.data) ? matRes.data : []);
      // A topic with no quiz yet gets an editable draft so the Quiz tab is never blank
      setQuiz(
        quizRes?.data || {
          quiz_id: null,
          topic_id: selectedTopic.topic_id,
          title: `${selectedTopic.title} Quiz`,
          status: "Draft",
          time_limit: 15,
          pass_mark: 60,
          max_attempts: 1,
          open_at: null,
          close_at: null,
          shuffle_questions: 1,
          shuffle_options: 1,
          show_explanation: 1,
        }
      );
      setQuestions(Array.isArray(qRes?.data) ? qRes.data : []);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to load topic details" });
    }
  }, [token, selectedTopic]);

  useEffect(() => {
    loadTopicDetails();
  }, [loadTopicDetails]);

  // Topic save
  const handleSaveTopic = async (e) => {
    e.preventDefault();
    try {
      if (editingTopic) {
        await updateTopic(token, editingTopic.topic_id, topicForm);
        setFeedback({ type: "success", message: "Topic updated successfully" });
      } else {
        await createTopic(token, subject.subject_id, topicForm);
        setFeedback({ type: "success", message: "New topic unit created" });
      }
      setShowTopicModal(false);
      loadTopics();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to save topic" });
    }
  };

  // Material upload: sends the REAL file (multipart) with real progress
  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    const f = materialForm.file;
    const fail = (message) => setFeedback({ type: "error", message });

    if (!materialForm.title.trim()) return fail("Please enter a title");
    if (materialForm.type === "Notes" && !materialForm.notes_content.trim()) {
      return fail("Write the notes text");
    }
    if (["PDF", "Slide"].includes(materialForm.type) && !f) {
      return fail("Choose or drop a file first");
    }
    if (materialForm.type === "Video" && !f && !materialForm.video_url.trim()) {
      return fail("Upload an MP4 or paste a video link");
    }
    if (f) {
      const ok = { PDF: /\.pdf$/i, Slide: /\.pptx?$/i, Video: /\.mp4$/i }[materialForm.type];
      if (ok && !ok.test(f.name)) {
        return fail(`This type accepts ${ACCEPT[materialForm.type]} files only`);
      }
      if (f.size > MAX_UPLOAD_BYTES) return fail("File is larger than 50 MB");
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      await uploadMaterial(
        token,
        selectedTopic.topic_id,
        {
          title: materialForm.title,
          type: materialForm.type,
          description: materialForm.description,
          required_flag: materialForm.required_flag ? 1 : 0,
          status: materialForm.status,
          content: materialForm.notes_content,
          url: materialForm.video_url,
          file: f || undefined,
        },
        setUploadProgress
      );
      setShowMaterialModal(false);
      setFeedback({ type: "success", message: "Study material uploaded" });
      loadTopicDetails();
    } catch (err) {
      fail(err.message || "Failed to upload material");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Material publish toggle
  const handleTogglePublish = async (materialId, currentStatus) => {
    try {
      const nextStatus = currentStatus === "Published" ? "Draft" : "Published";
      await togglePublishMaterial(token, materialId, nextStatus);
      loadTopicDetails();
      setFeedback({ type: "success", message: `Material status changed to ${nextStatus}` });
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Material version history
  const handleViewVersions = async (mat) => {
    setVersionHistoryMat(mat);
    setVersionList([]);
    try {
      const res = await fetchMaterialVersions(token, mat.material_id);
      setVersionList(res.data || []);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Could not load version history" });
    }
  };

  // Quiz settings save (schedule, rules, publish)
  const handleSaveQuizSettings = async (e) => {
    e.preventDefault();
    if (quiz.open_at && quiz.close_at && new Date(quiz.close_at) <= new Date(quiz.open_at)) {
      return setFeedback({ type: "error", message: "Close time must be after the open time" });
    }
    if (quiz.status === "Published" && questions.length === 0) {
      return setFeedback({ type: "error", message: "Add at least one question before publishing" });
    }
    try {
      await updateTopicQuiz(token, selectedTopic.topic_id, quiz);
      setFeedback({ type: "success", message: "Quiz settings & schedule updated successfully" });
      loadTopicDetails();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to update quiz settings" });
    }
  };

  const openNewQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({ ...EMPTY_QUESTION, options: ["", "", "", ""] });
    setShowQuestionModal(true);
  };

  // Question save (add / edit)
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    try {
      const options =
        questionForm.type === "MCQ"
          ? questionForm.options.filter((o) => o.trim())
          : questionForm.type === "TrueFalse"
          ? ["True", "False"]
          : [];

      const payload = {
        type: questionForm.type,
        text: questionForm.text,
        options,
        answer: questionForm.answer,
        explanation: questionForm.explanation,
        marks: parseFloat(questionForm.marks) || 1.0,
        difficulty: questionForm.difficulty,
        source_ref: questionForm.source_ref,
        status: "Approved",
      };

      if (editingQuestion) {
        await updateQuestion(token, editingQuestion.question_id, payload);
        setFeedback({ type: "success", message: "Question modified in question bank" });
      } else {
        await createQuestion(token, selectedTopic.topic_id, payload);
        setFeedback({ type: "success", message: "Question added to topic assessment bank" });
      }

      setShowQuestionModal(false);
      loadTopicDetails();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Delete question
  const handleDeleteQuestion = async (qId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteQuestion(token, qId);
      loadTopicDetails();
      setFeedback({ type: "success", message: "Question removed from question bank" });
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Preview quiz
  const handleOpenPreview = async () => {
    try {
      const res = await previewQuiz(token, selectedTopic.topic_id);
      setPreviewData(res.data);
      setShowPreviewModal(true);
    } catch (err) {
      setFeedback({ type: "error", message: "Preview error: " + err.message });
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading course curriculum & quiz editor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {feedback.message && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback({ type: "", message: "" })}
        />
      )}

      {/* HOD Department Oversight Banner */}
      {user?.is_hod && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              HOD
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Department Head Oversight & Management
              </h3>
              <p className="text-xs text-indigo-700 mt-0.5">
                Logged in as Faculty with HOD Department Authority. You can see all courses, study materials, and
                quizzes across the faculties in your department.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block rounded-full bg-indigo-100 border border-indigo-300 px-3 py-1 text-xs font-bold text-indigo-800 shrink-0">
            {user?.department_name || user?.department || "Department Oversight"}
          </span>
        </div>
      )}

      {/* The opened course header (only this course is shown) */}
      {header}

      {/* ================= Main Management Grid ================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Topics List */}
        <div className="lg:col-span-1">
          <TopicList
            topics={topics}
            selectedId={selectedTopic?.topic_id}
            onSelect={setSelectedTopic}
            onEdit={(t) => {
              setEditingTopic(t);
              setTopicForm({ title: t.title, description: t.description || "", position: t.position });
              setShowTopicModal(true);
            }}
            onDelete={(t) => {
              if (confirm(`Delete topic "${t.title}" and all its materials?`)) {
                deleteTopic(token, t.topic_id)
                  .then(loadTopics)
                  .catch((err) => setFeedback({ type: "error", message: err.message }));
              }
            }}
            action={
              <button
                type="button"
                onClick={() => {
                  setEditingTopic(null);
                  setTopicForm({ title: "", description: "", position: topics.length + 1 });
                  setShowTopicModal(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-800"
              >
                <PlusIcon className="h-3.5 w-3.5" /> Add
              </button>
            }
          />
        </div>

        {/* Right Stage: Topic Workspace */}
        <div className="lg:col-span-3 space-y-6">
          {selectedTopic ? (
            <div className="space-y-6">
              {/* Topic Header & Tab Bar */}
              <TopicHeader
                topic={selectedTopic}
                aside={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenPreview}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
                    >
                      <EyeIcon className="h-4 w-4 text-emerald-700" /> Student Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("questions");
                        openNewQuestion();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800"
                    >
                      <PlusIcon className="h-4 w-4" /> Add Question
                    </button>
                  </div>
                }
                footer={
                  <div className="flex space-x-6 border-b border-slate-200 text-xs font-bold">
                    {[
                      ["materials", `Study Materials (${materials.length})`],
                      ["quiz", "Quiz Settings & Schedule"],
                      ["questions", `Question Bank (${questions.length})`],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`border-b-2 pb-3 transition ${
                          activeTab === key
                            ? "border-emerald-700 text-emerald-800"
                            : "border-transparent text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                }
              />

              {/* ================= TAB 1: Study Materials Manager ================= */}
              {activeTab === "materials" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Unit Courseware Files</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setMaterialForm({ ...EMPTY_MATERIAL });
                        setShowMaterialModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-black transition"
                    >
                      <DocumentPlusIcon className="h-4 w-4" /> Upload Material
                    </button>
                  </div>

                  {materials.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                      <CloudArrowUpIcon className="mx-auto h-12 w-12 text-slate-400" />
                      <h4 className="mt-2 text-sm font-bold text-slate-900">No study materials uploaded yet</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Upload lecture slides (PPTX), document notes (PDF), or recorded videos.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {materials.map((mat) => {
                        let Icon = DocumentTextIcon;
                        if (mat.type === "Video") Icon = PlayIcon;
                        if (mat.type === "Slide") Icon = PresentationChartBarIcon;

                        return (
                          <div
                            key={mat.material_id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      mat.status === "Published"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-slate-200 text-slate-700"
                                    }`}
                                  >
                                    {mat.status}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      mat.required_flag
                                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {mat.required_flag ? "Required" : "Optional"}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono">v{mat.version}</span>
                                  {mat.uploaded_by && (
                                    <span className="text-[11px] text-slate-400">by {mat.uploaded_by}</span>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 mt-1">{mat.title}</h4>
                                <p className="text-xs text-slate-500 line-clamp-1">{mat.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:self-center">
                              <button
                                type="button"
                                onClick={() => handleTogglePublish(mat.material_id, mat.status)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${
                                  mat.status === "Published"
                                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                    : "border-emerald-600 bg-emerald-600 text-white"
                                }`}
                              >
                                {mat.status === "Published" ? "Unpublish" : "Publish"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewVersions(mat)}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                History
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Delete this material?")) {
                                    deleteMaterial(token, mat.material_id)
                                      .then(loadTopicDetails)
                                      .catch((err) => setFeedback({ type: "error", message: err.message }));
                                  }
                                }}
                                className="rounded-xl p-1.5 text-red-600 hover:bg-red-50"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB 2: Quiz Settings & Schedule ================= */}
              {activeTab === "quiz" && quiz && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <form onSubmit={handleSaveQuizSettings} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Quiz Scheduling & Parameters</h3>
                        <p className="text-xs text-slate-500">
                          Set the date/time examination window, time limits, and attempt rules.
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        Status: {quiz.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Quiz Title</label>
                        <input
                          type="text"
                          value={quiz.title || ""}
                          onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Publication Status</label>
                        <select
                          value={quiz.status || "Draft"}
                          onChange={(e) => setQuiz({ ...quiz, status: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                        >
                          <option value="Draft">Draft (Invisible to students)</option>
                          <option value="Published">Published (Assigned to students)</option>
                        </select>
                      </div>

                      {/* Scheduled Time Window */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <CalendarDaysIcon className="h-4 w-4 text-emerald-700" /> Open Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={toLocalDatetimeInput(quiz.open_at)}
                          onChange={(e) => setQuiz({ ...quiz, open_at: fromLocalDatetimeInput(e.target.value) })}
                          className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <ClockIcon className="h-4 w-4 text-rose-700" /> Close / Expiration Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={toLocalDatetimeInput(quiz.close_at)}
                          onChange={(e) => setQuiz({ ...quiz, close_at: fromLocalDatetimeInput(e.target.value) })}
                          className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Time Limit (Minutes)</label>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={quiz.time_limit || 15}
                          onChange={(e) => setQuiz({ ...quiz, time_limit: parseInt(e.target.value, 10) })}
                          className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Pass Mark Cutoff (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={quiz.pass_mark || 60}
                          onChange={(e) => setQuiz({ ...quiz, pass_mark: parseFloat(e.target.value) })}
                          className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Max Attempts (1 = Single Sitting)</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={quiz.max_attempts || 1}
                          onChange={(e) => setQuiz({ ...quiz, max_attempts: parseInt(e.target.value, 10) })}
                          className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* Shuffle & Display Toggles */}
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <label className="flex items-center space-x-2 font-medium text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(quiz.shuffle_questions)}
                          onChange={(e) => setQuiz({ ...quiz, shuffle_questions: e.target.checked ? 1 : 0 })}
                          className="h-4 w-4 accent-emerald-700 rounded"
                        />
                        <span>Shuffle Question Order</span>
                      </label>

                      <label className="flex items-center space-x-2 font-medium text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(quiz.shuffle_options)}
                          onChange={(e) => setQuiz({ ...quiz, shuffle_options: e.target.checked ? 1 : 0 })}
                          className="h-4 w-4 accent-emerald-700 rounded"
                        />
                        <span>Shuffle Option Choices</span>
                      </label>

                      <label className="flex items-center space-x-2 font-medium text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(quiz.show_explanation)}
                          onChange={(e) => setQuiz({ ...quiz, show_explanation: e.target.checked ? 1 : 0 })}
                          className="h-4 w-4 accent-emerald-700 rounded"
                        />
                        <span>Show Answer Explanations</span>
                      </label>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
                      >
                        Save Quiz Configuration
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ================= TAB 3: Question Bank Editor ================= */}
              {activeTab === "questions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Hosted Topic Questions</h3>
                      <p className="text-xs text-slate-500">
                        Add, edit, or remove questions drawn for the topic assessment.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openNewQuestion}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-800 transition shadow-xs"
                    >
                      <PlusIcon className="h-4 w-4" /> Add Manual Question
                    </button>
                  </div>

                  {questions.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500">
                      No questions in bank yet. Click "Add Manual Question" above to create assessment questions.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((q, idx) => (
                        <div
                          key={q.question_id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-[11px] font-bold text-emerald-800">
                                {idx + 1}
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 font-bold">
                                {q.type}
                              </span>
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  q.difficulty === "Easy"
                                    ? "bg-green-100 text-green-800"
                                    : q.difficulty === "Hard"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {q.difficulty}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">Marks: {q.marks || 1}</span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingQuestion(q);
                                  setQuestionForm({
                                    type: q.type,
                                    text: q.text,
                                    options:
                                      Array.isArray(q.options) && q.options.length > 0
                                        ? [...q.options]
                                        : ["", "", "", ""],
                                    answer: q.answer,
                                    explanation: q.explanation || "",
                                    marks: q.marks || 1.0,
                                    difficulty: q.difficulty || "Medium",
                                    source_ref: q.source_ref || "",
                                  });
                                  setShowQuestionModal(true);
                                }}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                                title="Edit Question"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.question_id)}
                                className="rounded p-1 text-red-500 hover:bg-red-50"
                                title="Delete Question"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <h4 className="mt-2 text-sm font-bold text-slate-900 font-serif leading-snug">{q.text}</h4>

                          <div className="mt-2 text-xs text-emerald-800 font-medium">
                            <span className="font-bold text-slate-500 mr-1">Correct Answer:</span>
                            {q.answer}
                          </div>

                          {q.explanation && (
                            <p className="mt-1 text-[11px] text-slate-500 italic">{q.explanation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 text-sm">
              Please select or create a topic unit to manage courseware and quizzes.
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: Topic Add / Edit ================= */}
      <Modal
        isOpen={showTopicModal}
        onClose={() => setShowTopicModal(false)}
        title={editingTopic ? "Edit Topic Unit" : "Create New Topic Unit"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveTopic} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Topic Title</label>
            <input
              type="text"
              value={topicForm.title}
              onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
              placeholder="e.g. Unit 3: Dynamic Programming"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Description / Unit Scope</label>
            <textarea
              rows={3}
              value={topicForm.description}
              onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
              placeholder="Brief summary of concepts and learning outcomes covered in this unit."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Order / Position</label>
            <input
              type="number"
              min="1"
              value={topicForm.position}
              onChange={(e) => setTopicForm({ ...topicForm, position: parseInt(e.target.value, 10) })}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowTopicModal(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
            >
              Save Topic
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: Drag & Drop Study Material Uploader ================= */}
      <Modal
        isOpen={showMaterialModal}
        onClose={() => !isUploading && setShowMaterialModal(false)}
        title="Upload Topic Study Material"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleUploadMaterial} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Material Title</label>
            <input
              type="text"
              value={materialForm.title}
              onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
              placeholder="e.g. Lecture 4: Red-Black Tree Balancing"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Resource Type</label>
              <select
                value={materialForm.type}
                onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value, file: null })}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
              >
                <option value="PDF">PDF Document</option>
                <option value="Slide">Presentation Slides (PPT / PPTX)</option>
                <option value="Video">Video (MP4 or link)</option>
                <option value="Notes">Lecture Notes (text)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Prerequisite Flag</label>
              <select
                value={materialForm.required_flag ? "1" : "0"}
                onChange={(e) => setMaterialForm({ ...materialForm, required_flag: e.target.value === "1" })}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
              >
                <option value="1">Required (Must complete to unlock Quiz)</option>
                <option value="0">Optional Reference Material</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Description</label>
            <input
              type="text"
              value={materialForm.description}
              onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
              placeholder="Short summary shown to students"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Visibility</label>
            <select
              value={materialForm.status}
              onChange={(e) => setMaterialForm({ ...materialForm, status: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
            >
              <option value="Published">Published (students can see it)</option>
              <option value="Draft">Draft (hidden from students)</option>
            </select>
          </div>

          {/* Drag & Drop Zone */}
          {materialForm.type !== "Notes" ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                File Attachment ({ACCEPT[materialForm.type]})
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setMaterialForm({ ...materialForm, file: e.dataTransfer.files[0] });
                  }
                }}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-6 text-center hover:bg-emerald-50/70 transition cursor-pointer"
                onClick={() => document.getElementById("hiddenFileInput")?.click()}
              >
                <CloudArrowUpIcon className="h-10 w-10 text-emerald-700" />
                <p className="mt-2 text-xs font-bold text-slate-800">
                  {materialForm.file ? materialForm.file.name : "Drag & drop a file here, or click to browse"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Maximum file size: 50MB</p>
                <input
                  id="hiddenFileInput"
                  type="file"
                  accept={ACCEPT[materialForm.type]}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setMaterialForm({ ...materialForm, file: e.target.files[0] });
                    }
                  }}
                />
              </div>

              {materialForm.type === "Video" && (
                <input
                  type="url"
                  value={materialForm.video_url}
                  onChange={(e) => setMaterialForm({ ...materialForm, video_url: e.target.value })}
                  placeholder="or paste a video link (https://...)"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                />
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Lecture Notes Text</label>
              <textarea
                rows={4}
                value={materialForm.notes_content}
                onChange={(e) => setMaterialForm({ ...materialForm, notes_content: e.target.value })}
                placeholder="Type or paste comprehensive study notes here..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono"
              />
            </div>
          )}

          {/* Real upload progress */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Uploading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-emerald-600 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => setShowMaterialModal(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: Version History ================= */}
      <Modal
        isOpen={Boolean(versionHistoryMat)}
        onClose={() => setVersionHistoryMat(null)}
        title="Material Version History"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Audit history of all uploaded revisions for "{versionHistoryMat?.title}":
          </p>

          <div className="space-y-2">
            {versionList.length === 0 && <p className="text-xs text-slate-400">No earlier versions recorded.</p>}
            {versionList.map((ver) => (
              <div key={ver.version_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800">Revision Version {ver.version}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(ver.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{ver.change_summary || "Published update"}</p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">File: {ver.file_ref}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: Manual Question Editor ================= */}
      <Modal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        title={editingQuestion ? "Edit Question" : "Add Question to Bank"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Question Type</label>
              <select
                value={questionForm.type}
                onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value, answer: "" })}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
              >
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="TrueFalse">True / False</option>
                <option value="ShortAnswer">Short Answer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Difficulty</label>
              <select
                value={questionForm.difficulty}
                onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Marks</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={questionForm.marks}
                onChange={(e) => setQuestionForm({ ...questionForm, marks: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Question Text / Stem</label>
            <textarea
              rows={3}
              value={questionForm.text}
              onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
              placeholder="State the problem clearly..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
              required
            />
          </div>

          {/* Options for MCQ */}
          {questionForm.type === "MCQ" && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Answer Options (MCQ)</label>
              <div className="grid grid-cols-2 gap-2">
                {questionForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-500">{String.fromCharCode(65 + i)}:</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...questionForm.options];
                        next[i] = e.target.value;
                        setQuestionForm({ ...questionForm, options: next });
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Authoritative Correct Answer</label>
            {questionForm.type === "TrueFalse" ? (
              <select
                value={questionForm.answer}
                onChange={(e) => setQuestionForm({ ...questionForm, answer: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                required
              >
                <option value="">Select True or False</option>
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            ) : questionForm.type === "MCQ" ? (
              <select
                value={questionForm.answer}
                onChange={(e) => setQuestionForm({ ...questionForm, answer: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                required
              >
                <option value="">Select the correct option</option>
                {questionForm.options
                  .filter((o) => o.trim())
                  .map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type="text"
                value={questionForm.answer}
                onChange={(e) => setQuestionForm({ ...questionForm, answer: e.target.value })}
                placeholder="Exact expected answer string"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                required
              />
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Pedagogical Explanation</label>
            <textarea
              rows={2}
              value={questionForm.explanation}
              onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
              placeholder="Why this answer is correct (shown to students after they submit)"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Courseware Source Reference</label>
            <input
              type="text"
              value={questionForm.source_ref}
              onChange={(e) => setQuestionForm({ ...questionForm, source_ref: e.target.value })}
              placeholder="e.g. Slide 14: Master Theorem Proof"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowQuestionModal(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
            >
              Save to Question Bank
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: Student Preview ================= */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Student Quiz Simulation Preview"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 p-4 text-white flex items-center justify-between text-xs">
            <div>
              <span className="text-emerald-400 font-bold uppercase tracking-wider block">
                Candidate Viewport Preview
              </span>
              <span className="text-slate-300 font-semibold">{previewData?.title}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <ClockIcon className="h-4 w-4 text-amber-400" />
              <span>{previewData?.time_limit} mins</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {(previewData?.questions || []).map((q, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Question {idx + 1} ({q.marks} mark)
                </span>
                <h4 className="mt-1 text-sm font-bold text-slate-900 font-serif">{q.text}</h4>
                <div className="mt-3 space-y-1.5">
                  {(q.options || []).map((opt, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-2 text-xs text-slate-700">
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white"
            >
              Close Preview
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function FacultyAcademicManagerView({ token, user }) {
  return (
    <CoursePicker
      token={token}
      heading={user?.is_hod ? "Department Courses" : "My Courses"}
      subheading="Choose a course to manage its topics, study materials and quiz."
      emptyText="No courses are assigned to you yet."
    >
      {(subject, header) => (
        <FacultyCourseWorkspace key={subject.subject_id} token={token} user={user} subject={subject} header={header} />
      )}
    </CoursePicker>
  );
}