import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../app/submissions/page.tsx",import.meta.url),"utf8");
test("Quick Submit does not load or render submission history",()=>{
 assert.doesNotMatch(source,/التسليمات السابقة|submission-history|setAttachments|setItems/);
 assert.doesNotMatch(source,/\.from\("(?:work_submissions|attachments)"\)\s*\.select\(/);
 assert.match(source,/supervisor&&<a className="qs-review"/);
});
test("Quick Submit keeps four explicit submission methods",()=>{
 for(const method of ["file","link","voice","text"]) assert.ok(source.includes('method==="'+method+'"'));
});
