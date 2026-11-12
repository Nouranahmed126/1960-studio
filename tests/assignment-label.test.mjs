import test from "node:test";
import assert from "node:assert/strict";
import { assignmentLabel } from "../lib/assignment-label.ts";

test("groups Arabic and English numbered assignment titles across file types", () => {
  for (const title of ["التكليف رقم ٣.pdf", "تكليف 3.docx", "Assignment #3.txt", "task ۳", "التكليف 3 (2).pdf"]) {
    assert.equal(assignmentLabel({ title }), "التكليف 3", title);
  }
});
test("groups duplicate filenames without losing the title", () => {
  for (const title of ["تصميم المشهد.pdf", "تصميم المشهد (2).PDF", "تصميم المشهد_3.docx"]) {
    assert.equal(assignmentLabel({ title }), "تصميم المشهد", title);
  }
});
test("handles empty titles and limits long labels", () => {
  assert.equal(assignmentLabel({ title: "  " }), "تسليم بدون عنوان");
  assert.equal(assignmentLabel({ title: "أ".repeat(100) }).length, 85);
});
