
import apiClient, { API_BASE_URL } from "./client";

/**
 * Fetch subjects:
 * - Admin: all subjects
 * - HOD: all subjects under their department
 * - Faculty: assigned subjects
 * - Student: enrolled subjects
 */
export async function fetchSubjects(token) {
  return apiClient("/academic/subjects", { token });
}

/**
 * Fetch topics for a subject
 */
export async function fetchSubjectTopics(token, subjectId) {
  return apiClient(`/academic/subjects/${subjectId}/topics`, { token });
}

/**
 * Create a new topic under a subject
 */
export async function createTopic(token, subjectId, topicData) {
  return apiClient(`/academic/subjects/${subjectId}/topics`, {
    method: "POST",
    token,
    body: {
      title: topicData.title,
      description: topicData.description || "",
      position: topicData.position || 1,
      quiz_enabled: topicData.quiz_enabled !== false ? 1 : 0,
    },
  });
}

/**
 * Update topic
 */
export async function updateTopic(token, topicId, topicData) {
  return apiClient(`/academic/topics/${topicId}`, {
    method: "PUT",
    token,
    body: topicData,
  });
}

/**
 * Delete topic
 */
export async function deleteTopic(token, topicId) {
  return apiClient(`/academic/topics/${topicId}`, {
    method: "DELETE",
    token,
  });
}

/**
 * Fetch study materials for a topic
 */
export async function fetchTopicMaterials(token, topicId) {
  return apiClient(`/academic/topics/${topicId}/materials`, { token });
}

/**
 * Create a study material.
 * Uses multipart FormData when a file is attached.
 */
export async function createMaterial(token, topicId, materialData) {
  let body;

  if (
    typeof FormData !== "undefined" &&
    materialData instanceof FormData
  ) {
    body = materialData;
  } else if (materialData.file) {
    const formData = new FormData();

    formData.append("title", materialData.title || "");
    formData.append("type", materialData.type || "PDF");
    formData.append("description", materialData.description || "");
    formData.append(
      "required_flag",
      materialData.required_flag ? "1" : "0"
    );
    formData.append("status", materialData.status || "Published");
    formData.append("file", materialData.file);

    if (materialData.notes_content) {
      formData.append("notes_content", materialData.notes_content);
    }

    body = formData;
  } else {
    body = {
      title: materialData.title || "",
      type: materialData.type || "PDF",
      description: materialData.description || "",
      required_flag: materialData.required_flag ? 1 : 0,
      status: materialData.status || "Published",
      notes_content: materialData.notes_content || "",
      link_url: materialData.link_url || materialData.file_ref || "",
    };
  }

  return apiClient(`/academic/topics/${topicId}/materials`, {
    method: "POST",
    token,
    body,
  });
}

/**
 * Wrapper used by FacultyAcademicManagerView.
 * The component sends content and url, while createMaterial
 * expects notes_content and link_url.
 */
export async function uploadMaterial(
  token,
  topicId,
  materialData,
  onProgress
) {
  if (!materialData) {
    throw new Error("Material information is missing.");
  }

  const normalizedData = {
    ...materialData,
    notes_content:
      materialData.content || materialData.notes_content || "",
    link_url:
      materialData.url || materialData.link_url || "",
  };

  // Upload progress callback is accepted for compatibility.
  // This implementation does not report live byte-level progress.
  return createMaterial(token, topicId, normalizedData);
}

/**
 * Toggle material published state
 */
export async function togglePublishMaterial(token, materialId, status) {
  return apiClient(`/academic/materials/${materialId}/publish`, {
    method: "POST",
    token,
    body: { status },
  });
}

/**
 * Delete material
 */
export async function deleteMaterial(token, materialId) {
  return apiClient(`/academic/materials/${materialId}`, {
    method: "DELETE",
    token,
  });
}

/**
 * Update material progress
 */
export async function updateMaterialProgress(
  token,
  materialId,
  percent = 100,
  status = "COMPLETED"
) {
  return apiClient(`/academic/materials/${materialId}/progress`, {
    method: "PUT",
    token,
    body: { percent, status },
  });
}

/**
 * Fetch material version history and details
 */
export async function fetchMaterialVersions(token, materialId) {
  const res = await apiClient(`/academic/materials/${materialId}`, {
    token,
  });

  return {
    success: true,
    data: res?.data?.versions || [],
  };
}

/**
 * Fetch Topic Quiz configuration
 */
export async function fetchTopicQuiz(token, topicId) {
  return apiClient(`/academic/topics/${topicId}/quiz`, { token });
}

/**
 * Update topic quiz configuration
 */
export async function updateTopicQuiz(token, topicId, quizData) {
  return apiClient(`/academic/topics/${topicId}/quiz`, {
    method: "PUT",
    token,
    body: {
      title: quizData.title,
      description: quizData.description,
      time_limit: quizData.time_limit,
      pass_mark: quizData.pass_mark,
      max_attempts: quizData.max_attempts,
      open_at: quizData.open_at,
      close_at: quizData.close_at,
      status: quizData.status,
      shuffle_questions: quizData.shuffle_questions,
      shuffle_options: quizData.shuffle_options,
      show_explanation: quizData.show_explanation,
    },
  });
}

/**
 * Fetch Questions for a Topic
 */
export async function fetchTopicQuestions(token, topicId) {
  return apiClient(`/academic/topics/${topicId}/questions`, { token });
}

/**
 * Create a new Question in Topic Question Bank
 */
export async function createQuestion(token, topicId, questionData) {
  return apiClient(`/academic/topics/${topicId}/questions`, {
    method: "POST",
    token,
    body: {
      type: questionData.type || "MCQ",
      text: questionData.text,
      options: questionData.options || [],
      answer: questionData.answer,
      explanation: questionData.explanation || "",
      marks: parseFloat(questionData.marks) || 1.0,
      difficulty: questionData.difficulty || "Medium",
      source_ref: questionData.source_ref || "",
      status: questionData.status || "Approved",
      origin: "Manual",
    },
  });
}

/**
 * Update an existing Question
 */
export async function updateQuestion(token, questionId, questionData) {
  return apiClient(`/academic/questions/${questionId}`, {
    method: "PUT",
    token,
    body: questionData,
  });
}

/**
 * Delete Question
 */
export async function deleteQuestion(token, questionId) {
  return apiClient(`/academic/questions/${questionId}`, {
    method: "DELETE",
    token,
  });
}

/**
 * Preview Quiz (Faculty View)
 */
export async function previewQuiz(token, topicId) {
  return apiClient(`/academic/topics/${topicId}/quiz/preview`, {
    token,
  });
}

/**
 * Start or resume a Student Quiz Attempt
 */
export async function startQuizAttempt(token, quizId) {
  return apiClient(`/academic/quizzes/${quizId}/attempts`, {
    method: "POST",
    token,
  });
}

/**
 * Autosave answers during active sitting
 */
export async function autosaveAttemptAnswers(token, attemptId, answers) {
  return apiClient(`/academic/attempts/${attemptId}/answers`, {
    method: "PUT",
    token,
    body: { answers },
  });
}

/**
 * Submit quiz attempt
 */
export async function submitQuizAttempt(
  token,
  attemptId,
  payload = {}
) {
  return apiClient(`/academic/attempts/${attemptId}/submit`, {
    method: "POST",
    token,
    body: payload,
  });
}

/**
 * Fetch attempt details by ID
 */
export async function getAttemptById(token, attemptId) {
  return apiClient(`/academic/attempts/${attemptId}`, { token });
}

/**
 * Fetch student's latest attempt for a quiz
 */
export async function fetchMyAttemptResult(token, quizId) {
  return apiClient(`/academic/quizzes/${quizId}/my-attempt`, {
    token,
  });
}

/**
 * Report anti-cheat violation during active sitting
 */
export async function reportQuizViolation(
  token,
  attemptId,
  violationReason = "Integrity violation"
) {
  return apiClient(`/academic/attempts/${attemptId}/violation`, {
    method: "POST",
    token,
    body: { reason: violationReason },
  });
}

/**
 * Toggle student cheating flag
 */
export async function toggleCheatingFlag(
  token,
  attemptId,
  isCheating,
  reason = ""
) {
  return apiClient(`/academic/attempts/${attemptId}/score-correction`, {
    method: "POST",
    token,
    body: {
      new_score: isCheating ? 0 : null,
      reason_code: isCheating ? "CHEATING_FLAG" : "UNFLAG",
      justification:
        reason ||
        (isCheating ? "Flagged for cheating" : "Flag removed"),
    },
  });
}

/**
 * Faculty Quiz Analytics and Summary
 */
export async function fetchSubjectResults(token, subjectId) {
  return apiClient(`/academic/subjects/${subjectId}/results`, {
    token,
  });
}

/**
 * Export results CSV directly from backend
 */
export async function exportResultsCsv(token, subjectId) {
  const downloadUrl =
    `${API_BASE_URL}/academic/subjects/${subjectId}/results/export`;

  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to export results CSV");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute(
    "download",
    `subject_${subjectId}_quiz_results.csv`
  );

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true };
}

/**
 * Faculty Action: Manual Score Correction
 */
export async function correctAttemptScore(
  token,
  attemptId,
  newScore,
  reasonCode,
  justification
) {
  return apiClient(`/academic/attempts/${attemptId}/score-correction`, {
    method: "POST",
    token,
    body: {
      new_score: parseFloat(newScore),
      reason_code: reasonCode || "CORRECTION",
      justification: justification || "Manual score adjustment",
    },
  });
}

/**
 * Admin Action: College-wide Academic Oversight
 */
export async function fetchAdminAcademicOversight(
  token,
  filters = {}
) {
  const query = new URLSearchParams();

  if (filters.department_id) {
    query.append("department_id", filters.department_id);
  }

  if (filters.search) {
    query.append("search", filters.search);
  }

  const qs = query.toString();

  return apiClient(
    `/academic/admin/oversight${qs ? `?${qs}` : ""}`,
    { token }
  );
}

export { API_BASE_URL };
