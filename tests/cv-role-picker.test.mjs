import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeHtml = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const cvSource = readFileSync(new URL("../src/pages/cv.astro", import.meta.url), "utf8");

test("homepage opens the CV selector in a new tab", () => {
  const cvLink = homeHtml.match(/<a\b[^>]*href="\/cv\/"[^>]*>/)?.[0];

  assert.ok(cvLink, "missing homepage CV selector link");
  assert.match(cvLink, /target="_blank"/);
  assert.match(cvLink, /rel="noopener"/);
  assert.doesNotMatch(homeHtml, /cv-maintenance|temporarily under maintenance/i);
});

test("CV selector exposes every specialized PDF", () => {
  const cvHtml = readFileSync(new URL("../dist/cv/index.html", import.meta.url), "utf8");
  const profiles = [
    ["Embedded Software Engineer", "/Subhash_CV.pdf"],
    ["Software Engineer", "/CV_AI_software_engineer.pdf"],
    ["Robotics Engineer", "/CV_Robotics.pdf"],
    ["Edge AI Engineer", "/CV_Edge_AI.pdf"]
  ];

  for (const [label, href] of profiles) {
    assert.ok(cvHtml.includes(label), `missing role label: ${label}`);
    assert.ok(cvHtml.includes(`href="${href}"`), `missing PDF link: ${href}`);
  }
});

test("CV selector centers its heading", () => {
  assert.match(cvSource, /\.cv-selector h1\s*{[^}]*text-align:\s*center;/s);
});
