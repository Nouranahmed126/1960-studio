import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const home=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
test("Behind the Scenes follows the three ribbons and links directly to gallery",()=>{
 assert.match(home,/<Ribbons\/>\s*<Link href="\/gallery" className="reference-frame reference-bts-card"/);
 assert.match(home,/src="\/plateau-crew-hub-hero-reference.jpg"/);
 assert.match(home,/src="\/behind-the-scenes-banner.svg"/);
});
