import { useState } from "react";
import { useRouter } from "../../context/useRouter";
import SubjectDiscoveryDashboard from "../academic/SubjectDiscoveryDashboard";
import SubjectWorkspaceView from "../academic/SubjectWorkspaceView";

/**
 * FacultyAcademicManagerView
 * Modern university-grade Faculty & HOD Academic Workspace.
 * 
 * - When no subject is selected: displays the role-aware SubjectDiscoveryDashboard
 *   (Faculty sees only their assigned subjects; HOD sees all department subjects).
 * - When a subject is selected: displays the reusable 6-tab SubjectWorkspaceView
 *   (Overview, Course Units, Study Materials, Quiz Settings & Schedule, Question Bank, Teaching Staff).
 * - Synchronizes with browser URL paths:
 *   /faculty/academic/subjects/:subjectId and /hod/academic/subjects/:subjectId
 */
export default function FacultyAcademicManagerView({ token, user, initialSubjectId = null }) {
  const { currentPath, navigate } = useRouter();

  // Detect subject ID from path (e.g., /faculty/academic/subjects/2 or /hod/academic/subjects/2)
  const pathSubjectId = (() => {
    if (initialSubjectId) return String(initialSubjectId);
    const match = currentPath?.match(/\/academic\/subjects\/(\d+)/);
    return match ? match[1] : null;
  })();

  const [localSubjectId, setLocalSubjectId] = useState(null);

  // Effective selected subject ID
  const effectiveSubjectId = pathSubjectId
    ? parseInt(pathSubjectId, 10)
    : localSubjectId;

  const handleSelectSubject = (sub) => {
    setLocalSubjectId(sub.subject_id);
    const isHOD = Boolean(
      user?.is_hod ||
        /head\s+of\s+department|\bhod/i.test(user?.designation || "") ||
        /head\s+of\s+department|\bhod/i.test(user?.designation_name || "") ||
        /head\s+of\s+department|\bhod/i.test(user?.in_charge_class || "")
    );
    const basePath = isHOD ? "/hod/academic/subjects" : "/faculty/academic/subjects";
    navigate(`${basePath}/${sub.subject_id}`);
  };

  const handleBack = () => {
    setLocalSubjectId(null);
    navigate("/dashboard");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "#faculty-academics");
    }
  };

  if (effectiveSubjectId) {
    return (
      <SubjectWorkspaceView
        token={token}
        user={user}
        subjectId={effectiveSubjectId}
        onBack={handleBack}
      />
    );
  }

  return (
    <SubjectDiscoveryDashboard
      token={token}
      user={user}
      onSelectSubject={handleSelectSubject}
    />
  );
}
