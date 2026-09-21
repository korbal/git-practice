"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const boot = () => new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://gyak.test/" });
const dom = boot();
const { window } = dom;
const doc = window.document;

let fails = 0;
const K = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL") + " " + name + (extra ? "  <= " + extra : ""));
  if (!cond) fails++;
};

const btns = (sel) => [...doc.querySelectorAll(sel + " .btn")];
const byText = (sel, txt) => btns(sel).find(b => b.textContent.includes(txt));
const type = (cmd) => {
  const input = doc.getElementById("term-in");
  input.value = cmd;
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
};
const clickNext = () => {
  const n = byText("#lesson-buttons", "Next lesson");
  if (!n) throw new Error("no next button on lesson " + doc.getElementById("lesson-num").textContent);
  n.click();
};
const chip = (f) => doc.querySelector(`#box-work .chip[data-file="${f}"]`);
const edit = (f, val) => {
  chip(f).click();
  doc.getElementById("ed-text").value = val;
  doc.getElementById("ed-save").click();
};
const readFile = (f) => { chip(f).click(); const v = doc.getElementById("ed-text").value; doc.getElementById("ed-cancel").click(); return v; };
const state = () => doc.getElementById("lesson-state").textContent;
const termText = () => doc.getElementById("termout").textContent;
const preview = () => doc.getElementById("preview").getAttribute("srcdoc") || "";
const steps = () => [...doc.querySelectorAll("#lesson-steps li")];
// Each terminal line is its own div, so read them individually rather than
// from the container's textContent (which would run them all together).
const termLines = () => [...doc.querySelectorAll("#termout .out, #termout .cli")].map(d => d.textContent);
const hashFor = (msg) => {
  const line = termLines().filter(l => /^[0-9a-f]{7} /.test(l) && l.includes(msg)).pop();
  return line ? line.split(" ")[0] : null;
};

// ---------- primer
const SLIDES = window.__GYT.PRIMER.length;
const slideTitle = () => doc.querySelector(".primer-title").textContent;
// Clicks through whatever slides exist, so adding one never breaks this walk.
const clearPrimer = (d) => {
  const w = d || doc;
  for (let i = 0; i < 40 && w.getElementById("primer").style.display !== "none"; i++) w.getElementById("p-next").click();
};

K("boot lands on the primer, not a lesson", doc.getElementById("primer").style.display !== "none");
K("boot hides the lesson grid", doc.getElementById("main-grid").style.display === "none");
K("primer covers the concepts, the team and the two tools", SLIDES === 8, String(SLIDES));
K("primer dot per slide", doc.querySelectorAll("#pdots .pdot").length === SLIDES);
K("primer Back is disabled on slide 1", doc.getElementById("p-back").disabled === true);

// Slide 1 must be the plain-language one: analogy first, no git vocabulary.
K("slide 1 is the ELI5 analogy", slideTitle().includes("save point") && !slideTitle().toLowerCase().includes("commit"), slideTitle());
const slide1 = doc.querySelector(".primer-body").textContent;
K("slide 1 uses the save-game analogy", /\bsave\b/i.test(slide1) && /\bgame\b/i.test(slide1));
K("slide 1 avoids jargon", !/commit|staging|repository|push|pull/i.test(slide1), slide1.slice(0, 80));

// Every slide must carry a drawing and readable body text.
const titles = [];
for (let i = 0; i < SLIDES; i++){
  titles.push(slideTitle());
  K("slide " + (i + 1) + " has a drawing", !!doc.querySelector(".primer-art svg"));
  K("slide " + (i + 1) + " has body text", doc.querySelector(".primer-body").textContent.length > 80);
  if (i < SLIDES - 1) doc.getElementById("p-next").click();
}
K("a glossary slide maps everyday words to git words",
  titles.some(t => t.includes("words you are about to meet")), titles.join(" / "));
K("the vocabulary is introduced before the four boxes",
  titles.findIndex(t => t.includes("words")) < titles.findIndex(t => t.includes("two places")), titles.join(" / "));
K("the pain slide is still there", titles.some(t => t.includes("break it")));
K("a slide introduces working with someone else", titles.some(t => t.includes("two of you")));
K("a slide tells git and GitHub apart", titles.some(t => /git is yours/i.test(t)));
K("working together is raised before the vocabulary",
  titles.findIndex(t => t.includes("two of you")) < titles.findIndex(t => t.includes("words you are about to meet")));
K("the career hook is last", titles[titles.length - 1].includes("the job"));
K("last slide says let's go", doc.getElementById("p-next").textContent.includes("Let's go"));
doc.getElementById("p-next").click();
K("finishing the primer reveals the lessons", doc.getElementById("primer").style.display === "none");
K("finishing the primer hides the primer panel", doc.getElementById("main-grid").style.display !== "none");

// ---------- header + boxes
K("8 progress dots", doc.querySelectorAll("#dots .dot").length === 8);
K("lands on lesson 1", doc.getElementById("lesson-num").textContent === "Lesson 1 / 8");
K("no branching lesson anywhere", !html.includes("Branches: branch, work, merge"));
K("GitHub box already has origin/main", doc.getElementById("box-gh").textContent.includes("origin/main"));
K("commit graph shows the inherited history", doc.querySelectorAll("#graph .grow").length === 8);

// ---------- preview pane
K("preview iframe exists", !!doc.getElementById("preview"));
K("preview is sandboxed", doc.getElementById("preview").hasAttribute("sandbox"));
K("preview blocks scripts", !doc.getElementById("preview").getAttribute("sandbox").split(/\s+/).includes("allow-scripts"));
K("preview renders the page", preview().includes("Pixel Team"), preview().slice(0, 60));
K("preview inlines style.css", preview().includes("max-width: 900px") && !preview().includes('href="style.css"'));

// ---------- L1
K("L1 title", doc.getElementById("lesson-title").textContent.includes("git status"));
K("L1 index.html chip present", !!chip("index.html"));
const before = preview();
edit("index.html", readFile("index.html").replace("<h1>Pixel Team</h1>", "<h1>Pixel Team rules</h1>"));
K("L1 chip flagged modified", chip("index.html").classList.contains("mod"));
K("L1 preview follows the edit", preview() !== before && preview().includes("Pixel Team rules"));
K("L1 hint cycles", (() => {
  const b = doc.getElementById("lesson-hint").textContent;
  byText("#lesson-buttons", "Hint").click();
  const m1 = doc.getElementById("lesson-hint").textContent;
  byText("#lesson-buttons", "Hint").click();
  return b !== m1 || m1 !== doc.getElementById("lesson-hint").textContent;
})());
type("git status");
K("L1 status output renders", termText().includes("On branch main"));
K("L1 completed", state().includes("Done"));
clickNext();

// ---------- L2
type("git add index.html");
K("L2 staged chip appears", doc.querySelectorAll("#box-stage .chip").length >= 1);
type("git status");
K("L2 completed", state().includes("Done"));
clickNext();

// ---------- L3
type('git commit -m "New homepage heading"');
K("L3 commit line in terminal", termText().includes("[main "));
K("L3 honest diffstat: one line changed", termLines().some(l => l.includes("1 file changed, 1 insertion(+), 1 deletion(-)")), termLines().slice(-3).join(" | "));
K("L3 completed", state().includes("Done"));
clickNext();

// ---------- L4
type("git log --oneline");
K("L4 log shows inherited plus new", termText().includes("New homepage heading") && termText().includes("Initial commit"));
K("L4 completed", state().includes("Done"));
clickNext();

// ---------- L5
K("L5 GitHub box flags local ahead", doc.getElementById("box-gh").textContent.includes("ahead"));
type("git push");
K("L5 push output", termText().includes("-> main"));
K("L5 completed", state().includes("Done"));
clickNext();

// ---------- L6
K("L6 title is pull", doc.getElementById("lesson-title").textContent.includes("git pull"));
K("L6 GitHub box flags pending pull", doc.getElementById("box-gh").textContent.includes("pull needed"));
const okPreview = preview();
type("git pull");
K("L6 pull brought contact.html", !!chip("contact.html"));
K("L6 the pull visibly broke the page", preview() !== okPreview && preview().includes("max-width: 90px"));
K("L6 completed", state().includes("Done"));
clickNext();

// ---------- L7 revert
K("L7 title is revert", doc.getElementById("lesson-title").textContent.includes("git revert"));
K("L7 not done yet", !state().includes("Done"));
type("git log --oneline");
const bad = hashFor("Tweak page width");
K("L7 culprit hash readable from the log", !!bad, bad);
type("git revert " + bad);
K("L7 revert output", termText().includes('Revert "Tweak page width"'));
K("L7 preview recovered", preview().includes("max-width: 900px") && !preview().includes("max-width: 90px"));
K("L7 not done until pushed", !state().includes("Done"));
type("git push");
K("L7 completed", state().includes("Done"));
clickNext();

// ---------- L8 the scenario
K("L8 is the scenario", doc.getElementById("lesson-title").textContent === "Your turn, no hints");
K("L8 has no hint button", !byText("#lesson-buttons", "Hint"));
K("L8 renders 6 steps", steps().length === 6);
K("L8 no step is done yet", steps().every(li => !li.classList.contains("done")));
// The brief asks for a change. It does not say the change is about to break the site.
const goalText = () => doc.getElementById("lesson-goal").textContent;
K("L8 opens on the request alone", /bigger/i.test(goalText()) && !/phone/i.test(goalText()), goalText());
K("L8 hides the second beat until the break is public", !doc.querySelector("#lesson-goal .turn"));
// Only ever touches the body rule. A bare /font-size/ would eat .hero h1's 32px,
// which is the one thing that must survive for the break to look the way it does.
const sane = (v) => readFile("style.css")
  .replace(/font-family: sans-serif;\n  font-size: [^;]+;/, "font-family: sans-serif;")
  .replace("font-family: sans-serif;", "font-family: sans-serif;\n  font-size: " + v + ";");

edit("style.css", sane("6em"));
K("L8 preview shows the damage", preview().includes("font-size: 6em"));
K("L8 break leaves the heading rule alone, so body text ends up larger than the heading",
  preview().includes("font-size: 32px"));
type("git add .");
type('git commit -m "Bigger homepage font"');
K("L8 step 1 done", steps()[0].classList.contains("done"));
K("L8 still no phone call before the push", !doc.querySelector("#lesson-goal .turn"));
type("git push");
K("L8 step 2 done", steps()[1].classList.contains("done"));
K("L8 the phone rings once the break is on GitHub", !!doc.querySelector("#lesson-goal .turn"));
K("L8 second beat names the real task", /1\.2em/.test(goalText()));
K("L8 step 3 not yet", !steps()[2].classList.contains("done"));
type("git log --oneline");
K("L8 step 3 done", steps()[2].classList.contains("done"));
const myBad = hashFor("Bigger homepage font");
type("git revert " + myBad);
K("L8 step 4 done", steps()[3].classList.contains("done"));
K("L8 step 5 not yet (revert unpushed)", !steps()[4].classList.contains("done"));
K("L8 not completed yet", !state().includes("Done"));
type("git push");
K("L8 step 5 done", steps()[4].classList.contains("done"));
K("L8 preview back to normal", !preview().includes("font-size: 6em"));
K("L8 step 6 not yet: the revert alone does not finish it", !steps()[5].classList.contains("done"));
K("L8 not completed on the revert alone", !state().includes("Done"));

// Load the last good save, then play the section again properly.
edit("style.css", sane("1.2em"));
type("git add .");
type('git commit -m "Bigger homepage font, sensibly"');
K("L8 step 6 not yet (proper fix unpushed)", !steps()[5].classList.contains("done"));
type("git push");
K("L8 step 6 done", steps()[5].classList.contains("done"));
K("L8 all steps green", steps().every(li => li.classList.contains("done")));
K("L8 preview ends on the sensible font", preview().includes("font-size: 1.2em"));
K("L8 completed", state().includes("Done"));
const finBtn = byText("#lesson-buttons", "Finish");
K("L8 offers Finish, not Next", !!finBtn && !byText("#lesson-buttons", "Next lesson"));
finBtn.click();

// ---------- finish
K("finish screen", doc.getElementById("lesson-title").textContent === "Nice work!");
K("finish recaps revert", doc.querySelector(".fin").textContent.includes("git revert"));
const finText = doc.querySelector(".fin").textContent;
// Nothing here sends them at a tool, a website or a command the course never taught.
K("finish does not send them off to branching", !/branch/i.test(finText));
K("finish does not ask them to set up a real repo", !/clone|repository|sign up|account/i.test(finText));
K("finish has no outbound link", !doc.querySelector(".fin a"));
K("finish hands them the daily loop in order",
  [...doc.querySelectorAll(".fin ul.loop li .mono")].map(e => e.textContent).join("|") ===
  'git pull|edit|git status|git add|git commit -m "..."|git push');
K("finish still promises the rest of GitHub later", /GitHub/.test(finText) && /come next/i.test(finText));
K("finish keeps the point of the whole thing", /Boring is the goal/.test(finText));
K("finish: all 8 dots green", doc.querySelectorAll("#dots .dot.done").length === 8);

// ---------- reopening the primer
doc.getElementById("btn-why").click();
K("Why git? reopens the primer", doc.getElementById("primer").style.display !== "none");
K("reopened primer offers Close", !!doc.getElementById("p-close"));
doc.getElementById("p-close").click();
K("closing the primer returns to where you were", doc.getElementById("primer").style.display === "none");
K("Why git? did not lose progress", doc.getElementById("lesson-title").textContent === "Nice work!");

// ---------- persistence
const saved = JSON.parse(window.localStorage.getItem("git-gyakorlo-v1"));
K("progress persisted", !!saved);
K("saved: all 8 lessons done", saved.done.length === 8 && saved.done.every(Boolean));
K("saved: subgoal flags all set", saved.subgoalFlags.every(Boolean));
K("saved: primerDone survives", saved.primerDone === true);
K("saved: ran.revert survives", saved.ran.revert === true);
K("saved: at the finish screen", saved.lessonIndex === 8);

// ---------- progress code round trip
doc.getElementById("btn-code").click();
const code = doc.getElementById("code-text").value;
K("progress code generated", code.length > 100);
doc.getElementById("code-close").click();
{
  const d2 = boot(), w2 = d2.window, dd = d2.window.document;
  w2.confirm = () => true;
  dd.getElementById("btn-paste").click();
  dd.getElementById("paste-text").value = code;
  dd.getElementById("paste-load").click();
  K("restored code skips the primer", dd.getElementById("primer").style.display === "none");
  K("restored code lands on the finish screen", dd.getElementById("lesson-title").textContent === "Nice work!");
  K("restored code restores the dots", dd.querySelectorAll("#dots .dot.done").length === 8);
}

// ---------- error paths through the UI
{
  const d3 = boot(), w3 = d3.window, dd = d3.window.document;
  const t3 = (c) => { const i = dd.getElementById("term-in"); i.value = c; i.dispatchEvent(new w3.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); };
  const out = () => dd.getElementById("termout").textContent;
  clearPrimer(dd);
  t3("cowsay hi");
  K("shell error for non-git", out().includes("command not found"));
  t3("ls");
  K("ls gets an answer, not an error", out().includes("four boxes"));
  t3("git commit -m x");
  K("empty-commit error", out().includes("nothing to commit"));
  t3("git add nope.txt");
  K("pathspec error", out().includes("pathspec"));
  t3("git revert");
  K("revert usage hint", out().includes("usage: git revert"));
  t3("git revert zzzzzzz");
  K("revert bad revision error", out().includes("bad revision"));
  t3("git all");
  K("unknown git command error", out().includes("not a git command"));
}

// ---------- reset
{
  const d4 = boot(), w4 = d4.window, dd = d4.window.document;
  w4.confirm = () => true;
  clearPrimer(dd);
  dd.getElementById("btn-reset").click();
  K("reset returns to the primer", dd.getElementById("primer").style.display !== "none");
  K("reset clears the dots", dd.querySelectorAll("#dots .dot.done").length === 0);
}

console.log("\n" + (fails ? fails + " FAILURES" : "ALL PASS"));
process.exit(fails ? 1 : 0);
