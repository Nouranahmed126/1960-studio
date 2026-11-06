import {readFileSync} from "node:fs";
import assert from "node:assert/strict";

const page=readFileSync("app/decor-studio/page.tsx","utf8");
const designer=readFileSync("app/decor-studio/smart-decor.tsx","utf8");
const route=readFileSync("app/api/decor/generate/route.ts","utf8");

const catalogBlock=page.match(/const catalog=\[([\s\S]*?)\] as const;/);
assert(catalogBlock,"Decor Studio catalog missing");
const catalog=new Set([...catalogBlock[1].matchAll(/\["([^"]+)","/g)].map(m=>m[1]));
assert(catalog.size>0,"Decor Studio catalog empty");

const groupsBlock=designer.match(/const groups=\[([\s\S]*?)\];/);
assert(groupsBlock,"Smart designer groups missing");
const groupTypes=[...groupsBlock[1].matchAll(/types:\[([^\]]+)\]/g)].flatMap(m=>[...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]));
assert(groupTypes.length>0,"Smart designer group types missing");
for(const type of groupTypes)assert(catalog.has(type),`Unknown library piece: ${type}`);

const allowedBlock=route.match(/const allowed=\[([^\]]+)\]/);
assert(allowedBlock,"AI allowed furniture list missing");
const allowed=[...allowedBlock[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]);
assert(allowed.length>0,"AI allowed list empty");
for(const type of allowed)assert(catalog.has(type),`Unknown AI piece: ${type}`);
console.log(`Decor catalog integrity OK: ${catalog.size} types, ${groupTypes.length} library entries, ${allowed.length} AI types.`);
