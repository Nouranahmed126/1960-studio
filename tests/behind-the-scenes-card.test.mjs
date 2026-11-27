import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const home=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../app/behind-the-scenes-card.css",import.meta.url),"utf8");
test("Behind the Scenes follows the ribbons and links directly to gallery",()=>{
 assert.match(home,/<Ribbons\/>\s*<section className="reference-bts-section"[^>]*>\s*<Link href="\/gallery" className="reference-frame reference-bts-card"/);
 assert.match(home,/src="\/plateau-crew-hub-hero-reference.jpg"/);
 assert.doesNotMatch(home,/behind-the-scenes-banner\.svg/);
 assert.match(home,/Fortepan_93266\.jpg/);
 assert.match(home,/FOTO:FORTEPAN \/ Inkey Tibor/);
 assert.match(home,/creativecommons\.org\/licenses\/by-sa\/3\.0/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/max-width:480px/);
});
