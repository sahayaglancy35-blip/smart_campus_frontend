import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createIdCardsPdf,
  createStudentQrSvg,
  getIdCardIdentifier,
  idCardFilename,
  openIdCardPrintWindow,
} from "../components/admin/studentIdCardUtils.js";

describe("student ID card utilities", () => {
  it("creates a QR SVG with finder patterns and the supplied register number", () => {
    const svg = createStudentQrSvg("REG-2026-001-123456789012");
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /viewBox="-4 -4 37 37"/);
    assert.match(svg, /width="256" height="256"/);
    assert.ok((svg.match(/<rect /g) || []).length > 100);
  });

  it("uses a safe register-number-specific PDF filename", () => {
    assert.equal(idCardFilename("REG/2026:01"), "StudentID_REG_2026_01.pdf");
    assert.equal(idCardFilename("FAC/2026:01", "faculty"), "FacultyID_FAC_2026_01.pdf");
    assert.equal(idCardFilename(""), "StudentID_Record.pdf");
  });

  it("creates portrait-size multi-page PDFs without requiring student photos", async () => {
    const pdf = await createIdCardsPdf([
      { student_id: 1, register_no: "REG-01", full_name: "Student One" },
      { student_id: 2, register_no: "REG-02", full_name: "Student Two" },
    ]);
    const contents = new TextDecoder("latin1").decode(await pdf.arrayBuffer());
    assert.equal(pdf.type, "application/pdf");
    assert.match(contents, /\/Count 4/);
    assert.match(contents, /\/MediaBox \[0 0 153\.071 242\.646\]/);
    assert.match(contents, /PROPERTY OF JOY UNIVERSITY - TIRUNELVELI/);
    assert.match(contents, /0\.04 0\.31 0\.16 rg/);
    assert.match(contents, /\/Root 1 0 R/);
    const xrefOffset = Number(contents.match(/startxref\n(\d+)/)[1]);
    assert.equal(contents.slice(xrefOffset, xrefOffset + 4), "xref");
  });

  it("uses an employee identifier for faculty QR codes and PDFs", async () => {
    const faculty = {
      faculty_id: 8,
      employee_code: "FAC-008",
      full_name: "Faculty Member",
      designation_name: "Lecturer",
    };
    assert.equal(getIdCardIdentifier(faculty, "faculty"), "FAC-008");
    const pdf = await createIdCardsPdf([faculty], "faculty");
    const contents = new TextDecoder("latin1").decode(await pdf.arrayBuffer());
    assert.match(contents, /EMPLOYEE ID/);
    assert.match(contents, /DESIGNATION/);
    assert.match(contents, /TIRUNELVELI, TAMIL NADU/);
    assert.match(contents, /\/Count 2/);
    assert.match(contents, /\/MediaBox \[0 0 153\.071 242\.646\]/);
  });

  it("rejects records without unique identifiers instead of creating generic ID cards", async () => {
    assert.equal(getIdCardIdentifier({ full_name: "No ID" }), "");
    await assert.rejects(
      createIdCardsPdf([{ full_name: "No ID" }]),
      /register number/,
    );
  });

  it("prepares front and back print faces at the physical card size", () => {
    let markup = "";
    openIdCardPrintWindow(
      { register_no: "REG-01", full_name: "Student One" },
      {
        document: {
          open() {},
          write(value) {
            markup = value;
          },
          close() {},
        },
      },
    );
    assert.match(markup, /class="card front"/);
    assert.match(markup, /class="card back"/);
    assert.match(markup, /@page \{ size: 54mm 85\.6mm; margin: 0; \}/);
    assert.match(markup, /linear-gradient\(135deg,#4ade80/);
    assert.doesNotMatch(markup, /side-accent/);
    assert.match(markup, /TIRUNELVELI, TAMIL NADU/);
  });
});
