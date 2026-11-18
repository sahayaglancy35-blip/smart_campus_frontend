import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Mirror pure normalization and formatting logic from QuizAttemptView & QuizResultView
 */
function normalizeQuestionOptions(options) {
  if (!options) return [];
  let parsed = options;
  if (typeof options === "string") {
    try {
      parsed = JSON.parse(options);
    } catch {
      return [{ key: "A", text: options, original: options }];
    }
  }
  if (!Array.isArray(parsed)) {
    if (typeof parsed === "object" && parsed !== null) {
      return Object.entries(parsed).map(([k, val], idx) => ({
        key: k || String.fromCharCode(65 + idx),
        text: typeof val === "object" && val !== null ? (val.text || val.label || JSON.stringify(val)) : String(val),
        original: val,
      }));
    }
    return [{ key: "A", text: String(parsed), original: parsed }];
  }

  return parsed.map((opt, idx) => {
    const defaultKey = String.fromCharCode(65 + idx);
    if (typeof opt === "object" && opt !== null) {
      const key = opt.key || opt.value || opt.id || defaultKey;
      const text = opt.text || opt.label || opt.option || (typeof opt.value === "string" ? opt.value : "");
      return {
        key: String(key).trim(),
        text: String(text || key).trim(),
        original: opt,
      };
    }
    const str = String(opt ?? "").trim();
    return {
      key: defaultKey,
      text: str,
      original: opt,
    };
  });
}

function getOptionValue(opt) {
  if (typeof opt.original === "object" && opt.original !== null) {
    return opt.original.key || opt.key || opt.original.text || opt.text;
  }
  return typeof opt.original === "string" ? opt.original : (opt.text || opt.key);
}

function isOptionChecked(savedAnswer, opt) {
  if (savedAnswer === undefined || savedAnswer === null) return false;
  const str = String(savedAnswer).trim().toLowerCase();
  if (!str) return false;
  const keyMatch = String(opt.key).trim().toLowerCase() === str;
  const textMatch = String(opt.text).trim().toLowerCase() === str;
  const origMatch = typeof opt.original === "string" && opt.original.trim().toLowerCase() === str;
  return Boolean(keyMatch || textMatch || origMatch);
}

function formatAnswer(val) {
  if (val === null || val === undefined || val === "") return "(No answer provided)";
  if (typeof val === "object") {
    if (val.key && val.text) return `${val.key}. ${val.text}`;
    if (val.text) return String(val.text);
    if (val.key) return String(val.key);
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

describe("Quiz Attempt & Question Option Parsing Robustness", () => {
  it("should normalize array of option objects without throwing or passing objects as React children", () => {
    const rawOptions = [
      { key: "A", text: "Bubble Sort" },
      { key: "B", text: "Quick Sort" },
      { key: "C", text: "Merge Sort" },
    ];

    const normalized = normalizeQuestionOptions(rawOptions);
    assert.equal(normalized.length, 3);
    assert.equal(typeof normalized[0].key, "string");
    assert.equal(typeof normalized[0].text, "string");
    assert.equal(normalized[0].key, "A");
    assert.equal(normalized[0].text, "Bubble Sort");

    // Must yield a string option value suitable for HTML inputs
    const optVal = getOptionValue(normalized[0]);
    assert.equal(typeof optVal, "string");
    assert.equal(optVal, "A");
  });

  it("should normalize array of plain strings from seed data", () => {
    const rawOptions = ["Linear Search", "Binary Search", "Jump Search"];
    const normalized = normalizeQuestionOptions(rawOptions);

    assert.equal(normalized.length, 3);
    assert.equal(normalized[0].key, "A");
    assert.equal(normalized[0].text, "Linear Search");

    const optVal = getOptionValue(normalized[0]);
    assert.equal(optVal, "Linear Search");
  });

  it("should normalize stringified JSON options", () => {
    const jsonOptions = JSON.stringify([
      { key: "A", text: "Depth First Search" },
      { key: "B", text: "Breadth First Search" },
    ]);
    const normalized = normalizeQuestionOptions(jsonOptions);

    assert.equal(normalized.length, 2);
    assert.equal(normalized[0].key, "A");
    assert.equal(normalized[0].text, "Depth First Search");
  });

  it("should match option selection correctly for both key-based and text-based answers", () => {
    const options = normalizeQuestionOptions([
      { key: "A", text: "Binary Tree" },
      { key: "B", text: "Red-Black Tree" },
    ]);

    // Student has saved answer as "A"
    assert.equal(isOptionChecked("A", options[0]), true);
    assert.equal(isOptionChecked("B", options[0]), false);

    // Student has saved answer as full text "Binary Tree"
    assert.equal(isOptionChecked("Binary Tree", options[0]), true);
    assert.equal(isOptionChecked("Red-Black Tree", options[0]), false);

    // Case insensitivity
    assert.equal(isOptionChecked("a", options[0]), true);
    assert.equal(isOptionChecked("binary tree", options[0]), true);
  });

  it("should safely format student and correct answers in results view without rendering [object Object]", () => {
    assert.equal(formatAnswer(null), "(No answer provided)");
    assert.equal(formatAnswer(""), "(No answer provided)");
    assert.equal(formatAnswer("A"), "A");
    assert.equal(formatAnswer("Merge Sort"), "Merge Sort");
    assert.equal(
      formatAnswer({ key: "A", text: "Merge Sort" }),
      "A. Merge Sort"
    );
    assert.equal(
      formatAnswer({ text: "Heap Sort" }),
      "Heap Sort"
    );
  });

  it("should handle empty questions array and null options gracefully", () => {
    assert.deepEqual(normalizeQuestionOptions(null), []);
    assert.deepEqual(normalizeQuestionOptions([]), []);
    assert.deepEqual(normalizeQuestionOptions(undefined), []);
  });
});
