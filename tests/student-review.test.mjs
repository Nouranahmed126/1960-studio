import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../app/dashboard/student/[id]/page.tsx",import.meta.url),"utf8");
test("student review has two exclusive views and never navigates to Quick Submit",()=>{
 assert.doesNotMatch(source,/["']\/submissions["']/);
 assert.match(source,/selectedAssignment===null\?<section/);
 assert.match(source,/selectedItems\.map/);
 assert.match(source,/window\.scrollTo/);
});
test("only student-owned files and text are loaded; supervisor authorization precedes queries",()=>{
 assert.match(source,/\.eq\("uploaded_by", studentId\)/);
 assert.doesNotMatch(source,/\.in\("contribution_id"/);
 assert.ok(source.indexOf('approval_status !== "approved"')<source.indexOf('eq("uploaded_by", studentId)'));
 assert.match(source,/!assignment\.archived_at/);
});
