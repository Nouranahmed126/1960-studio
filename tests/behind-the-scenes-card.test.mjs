import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const home = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8"
);

const css = readFileSync(
  new URL("../app/behind-the-scenes-card.css", import.meta.url),
  "utf8"
);

test("Behind the Scenes card is polished and responsive", () => {
  assert.match(home, /href="\/gallery"/);
  assert.match(home, /reference-bts-orbit-star/);
  assert.match(home, /reference-bts-shimmer-badge/);
  assert.match(home, /reference-bts-attribution-sr/);
  assert.doesNotMatch(home, /reference-bts-credit/);
  assert.match(css, /reference-bts-star-orbit/);
  assert.match(css, /reference-bts-badge-shimmer/);
  assert.match(css, /max-width:\s*480px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
