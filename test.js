"use strict";
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const m = html.match(/\/\*__ENGINE_START__\*\/([\s\S]*?)\/\*__ENGINE_END__\*\//);
if (!m) { console.error("ENGINE markers missing in index.html"); process.exit(1); }

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(m[1], sandbox, { filename: "engine.js" });
const G = sandbox.window.__GYT;

let fails = 0, id = 0;
const K = (name, cond, extra) => {
  id++;
  console.log((cond ? "PASS" : "FAIL") + " [" + id + "] " + name + (extra ? "  <= " + extra : ""));
  if (!cond) fails++;
};

const S = G.newGame();
const run = (l) => G.execGit(S, l).out.join("\n");
const acc = (i) => G.accepts[i](S) === true;
const nCommits = () => Object.keys(S.commits).length;
// Walks the commit chain directly, so looking a hash up never sets ran.log.
const hashOf = (msg) => {
  let c = S.branches[S.branch];
  while (c){ if (S.commits[c].msg.includes(msg)) return c; c = S.commits[c].parent; }
  return null;
};

// ---------- inherited history
K("8 lessons defined", G.LESSONS.length === 8);
K("primer has at least 6 slides", G.PRIMER.length >= 6, String(G.PRIMER.length));
K("every primer slide has a title, body and drawing",
  G.PRIMER.every(s => s.title && s.body && s.art));
K("primer opens with the plain-language analogy, before any git word",
  !/commit|staging|repository|git push|git pull/i.test(G.PRIMER[0].title + G.PRIMER[0].body), G.PRIMER[0].title);
K("primer defines the vocabulary before the four boxes",
  G.PRIMER.findIndex(s => s.art === "glossary") < G.PRIMER.findIndex(s => s.art === "boxes"));
K("primer ends on the career hook", G.PRIMER[G.PRIMER.length - 1].art === "commands");
K("primer introduces working together before lesson 6 does",
  G.PRIMER.findIndex(s => s.art === "coop") > 0 &&
  G.PRIMER.findIndex(s => s.art === "coop") < G.PRIMER.findIndex(s => s.art === "glossary"));
K("the co-op slide names Jozsi, so lesson 6 is a callback and not an ambush",
  /J\u00f3zsi/.test(G.PRIMER.find(s => s.art === "coop").body));
K("the co-op slide stays jargon-free",
  !/commit|staging|repository|git push|git pull/i.test(G.PRIMER.find(s => s.art === "coop").body));
K("git and GitHub are told apart on their own slide, before the four boxes",
  G.PRIMER.findIndex(s => s.art === "gitvsgithub") < G.PRIMER.findIndex(s => s.art === "boxes"));
K("the git vs GitHub slide promises the rest of GitHub comes later",
  /comes after this|comes later/i.test(G.PRIMER.find(s => s.art === "gitvsgithub").body));

// Lesson 8 keeps the phone call out of the brief so the preview breaks the news.
K("L8 has a second beat", typeof G.LESSONS[7].goal2 === "string" && G.LESSONS[7].goal2.length > 40);
K("L8 opening brief does not spoil the failure",
  !/phone|down|broke|unreadable|revert/i.test(G.LESSONS[7].goal), G.LESSONS[7].goal);
K("L8 title does not spoil it either", !/down|broke/i.test(G.LESSONS[7].title), G.LESSONS[7].title);
K("L8 second beat is where it goes wrong", /phone|unreadable/i.test(G.LESSONS[7].goal2));
K("L8 has six steps", G.LESSONS[7].steps.length === 6);
K("seeded history is " + G.HISTORY.length + " commits", nCommits() === G.HISTORY.length);
K("seeded history already on GitHub", S.origin.main === S.branches.main);
{
  // Fresh game, so the main walkthrough below still starts with nothing run.
  const B = G.newGame();
  const b = (l) => G.execGit(B, l).out.join("\n");
  K("boot status: clean and up to date",
    b("git status").includes("working tree clean") && b("git status").includes("up to date"), b("git status"));
  K("boot log lists the whole history", b("git log --oneline").split("\n").length === G.HISTORY.length);
}

// ---------- Lesson 1: edit + status
K("L1 not yet (nothing edited)", !acc(0));
G.editFile(S, "index.html", S.working["index.html"].replace("<h1>Pixel Team</h1>", "<h1>Pixel Team rules</h1>"));
K("L1 out of order (no status yet)", !acc(0));
run("git status");
K("L1 accept after edit+status", acc(0));
K("L1 status shows it unstaged", run("git status").includes("Changes not staged for commit"), run("git status"));

// ---------- Lesson 2: add
K("L2 not yet (nothing staged)", !acc(1));
run("git add index.html");
run("git status");
K("L2 accept after add", acc(1));
K("L2 status shows it staged", run("git status").includes("Changes to be committed"), run("git status"));

// ---------- Lesson 3: commit
K("L3 not yet", !acc(2));
run('git commit -m "New homepage heading"');
K("L3 commit created", nCommits() === G.HISTORY.length + 1, S.commits[S.branches.main].msg);
K("L3 accept", acc(2));
K("L3 working tree clean after commit", run("git status").includes("working tree clean"), run("git status"));

// ---------- Lesson 4: log
K("L4 not yet (log never run)", !acc(3));
run("git log --oneline");
K("L4 accept", acc(3));

// ---------- Lesson 5: push
K("L5 not yet (local ahead)", !acc(4));
K("L5 status says ahead", run("git status").includes("ahead of 'origin/main'"), run("git status"));
run("git push");
K("L5 accept", acc(4));
K("L5 status up to date", run("git status").includes("up to date"), run("git status"));

// ---------- Lesson 6: teammate pushed, pull
G.teamworkScenario(S);
K("L6 origin advanced by 2", S.origin.main !== S.branches.main);
K("L6 status says behind", run("git status").includes("behind 'origin/main'"), run("git status"));
K("L6 not accepted before pull", !acc(5));
run("git pull");
K("L6 accept after pull", acc(5));
K("L6 contact.html arrived", (S.working["contact.html"] || "") !== "");
K("L6 the teammate broke the layout", S.working["style.css"].includes("max-width: 90px;"));
K("L6 total commits = seed + yours + 2", nCommits() === G.HISTORY.length + 3);

// ---------- Lesson 7: revert
K("L7 not yet", !acc(6));
const badHash = hashOf("Tweak page width");
K("L7 culprit findable in the log", !!badHash, badHash);

// revert guards, checked on a throwaway game so the main run stays clean
{
  const E = G.newGame();
  const eRun = (l) => G.execGit(E, l).out.join("\n");
  const before = Object.keys(E.commits).length;
  K("revert with no argument -> usage", eRun("git revert").includes("usage: git revert"));
  K("revert bad hash -> bad revision", eRun("git revert deadbee").includes("fatal: bad revision 'deadbee'"));
  K("revert bad hash changed nothing", Object.keys(E.commits).length === before);
  const rootId = eRun("git log --oneline").split("\n").pop().split(" ")[0];
  K("revert the initial commit -> refused", eRun("git revert " + rootId).includes("cannot revert the initial commit"));
  G.editFile(E, "README.md", "scratch work I have not committed");
  const head2 = eRun("git log --oneline").split("\n")[0].split(" ")[0];
  const dirty = eRun("git revert " + head2);
  K("revert with a dirty working tree -> refused", dirty.includes("would be overwritten by revert"), dirty);
  K("revert named the dirty file", dirty.includes("README.md"), dirty);
  K("refused revert created no commit", Object.keys(E.commits).length === before);
  const E2 = G.newGame();
  const e2 = (l) => G.execGit(E2, l).out.join("\n");
  K("revert HEAD alias works", e2("git revert HEAD").includes('Revert "Flesh out the README"'), e2("git log --oneline").split("\n")[0]);
  const stale = G.newGame();
  const sRun = (l) => G.execGit(stale, l).out.join("\n");
  const oldCss = sRun("git log --oneline").split("\n").find(l => l.includes("Add navigation bar")).split(" ")[0];
  K("revert of a since-changed commit -> honest conflict message",
    sRun("git revert " + oldCss).includes("would conflict"), sRun("git revert " + oldCss));
}

const revOut = run("git revert " + badHash);
K("L7 revert output names the commit", revOut.includes('Revert "Tweak page width"'), revOut);
K("L7 revert added one commit", nCommits() === G.HISTORY.length + 4);
K("L7 layout is fixed again", S.working["style.css"].includes("max-width: 900px;"));
K("L7 ran.revert flag set", S.ran.revert === true);
K("L7 not accepted until pushed", !acc(6));
run("git push");
K("L7 accept after revert+push", acc(6));
K("L7 GitHub has the fix", S.origin.main === S.branches.main);

// ---------- Lesson 8: the scenario
G.scenarioSetup(S);
K("scenario base recorded", S.scenarioBase === S.branches.main);
K("scenario starts with no steps done", G.liveSubgoals(S).every(g => !g));
K("L8 not accepted at the start", !acc(7));

const withFont = (v) => G.treeOf(S, S.scenarioBase)["style.css"]
  .replace("font-family: sans-serif;", "font-family: sans-serif;\n  font-size: " + v + ";");

G.editFile(S, "style.css", withFont("6em"));
run("git add .");
run('git commit -m "Bigger homepage font"');
K("scenario step 1: change committed", G.liveSubgoals(S)[0]);
K("scenario step 2 not yet (unpushed)", !G.liveSubgoals(S)[1]);
run("git push");
K("scenario step 2: pushed to GitHub", G.liveSubgoals(S)[1]);
K("scenario step 3 not yet (no log read)", !G.liveSubgoals(S)[2]);
run("git log --oneline");
K("scenario step 3: culprit looked up", G.liveSubgoals(S)[2]);
const myBad = hashOf("Bigger homepage font");
run("git revert " + myBad);
K("scenario step 4: reverted", G.liveSubgoals(S)[3]);
K("scenario step 5 not yet (revert unpushed)", !G.liveSubgoals(S)[4]);
K("L8 still not accepted", !acc(7));
run("git push");
K("scenario step 5: the revert is on GitHub", G.liveSubgoals(S)[4]);
K("style.css is back to the working version", S.working["style.css"] === G.treeOf(S, S.scenarioBase)["style.css"]);
K("scenario step 6 not yet: the lead's request is still undone", !G.liveSubgoals(S)[5]);
K("L8 not accepted on the revert alone", !acc(7));

// The revert stops the bleeding. The lesson is only finished once the job is done properly.
G.editFile(S, "style.css", withFont("1.2em"));
run("git add .");
run('git commit -m "Bigger homepage font, sensibly"');
K("scenario step 6 not yet (proper fix unpushed)", !G.liveSubgoals(S)[5]);
run("git push");
K("scenario step 6: the proper fix is on GitHub", G.liveSubgoals(S)[5]);
K("earlier steps stay green after the proper fix", G.liveSubgoals(S).every(Boolean));
K("L8 accept", acc(7));
K("style.css ends with the sensible font, not the broken one",
  S.working["style.css"].includes("1.2em") && !S.working["style.css"].includes("6em"));
K("final status clean and up to date",
  run("git status").includes("working tree clean") && run("git status").includes("up to date"), run("git status"));
K("ended around commit 15", nCommits() === G.HISTORY.length + 7, String(nCommits()));

// Fixing it properly before pushing the bare revert must not dead-end the lesson.
{
  const P = G.newGame();
  const pRun = (l) => G.execGit(P, l).out.join("\n");
  G.scenarioSetup(P);
  const pBase = G.treeOf(P, P.scenarioBase)["style.css"];
  G.editFile(P, "style.css", pBase + "\n/* 6em */");
  pRun("git add ."); pRun('git commit -m "Oops"'); pRun("git push"); pRun("git log --oneline");
  pRun("git revert " + pRun("git log --oneline").split("\n")[0].split(" ")[0]);
  G.editFile(P, "style.css", pBase + "\n/* sensible */");
  pRun("git add ."); pRun('git commit -m "Properly this time"'); pRun("git push");
  K("revert then fix, pushed once, still completes", G.pollSubgoals(P).every(Boolean));
}

// ---------- the last step must hold now, not just once
{
  const R = G.newGame();
  const rRun = (l) => G.execGit(R, l).out.join("\n");
  G.scenarioSetup(R);
  G.editFile(R, "style.css", R.working["style.css"] + "\n/* oops */");
  rRun("git add ."); rRun('git commit -m "Oops"'); rRun("git push"); rRun("git log");
  const bad = rRun("git log --oneline").split("\n")[0].split(" ")[0];
  rRun("git revert " + bad); rRun("git push");
  G.editFile(R, "style.css", R.working["style.css"] + "\n/* sensible */");
  rRun("git add ."); rRun('git commit -m "Properly this time"'); rRun("git push");
  K("scenario complete", G.pollSubgoals(R).every(Boolean));
  // Re-applying the exact value that broke it must take the last step back off.
  G.editFile(R, "style.css", G.treeOf(R, R.scenarioBase)["style.css"] + "\n/* oops */");
  rRun("git add ."); rRun('git commit -m "Broke it again"'); rRun("git push");
  K("breaking it again un-ticks the final step", !G.pollSubgoals(R)[5]);
  K("the earlier steps stay ticked", G.pollSubgoals(R).slice(0, 5).every(Boolean));
}

// ---------- error paths
{
  const E = G.newGame();
  const e = (l) => G.execGit(E, l).out.join("\n");
  K("non-git command -> shell error", e("cowsay hi").includes("command not found"));
  K("a known non-git command gets an answer instead", e("sudo rm -rf /").includes("browser tab"));
  K("rm says nothing happened", e("rm index.html").includes("nothing happened"));
  K("git blame blames Józsi", e("git blame style.css").includes("Józsi"));
  K("git blame still explains the real command", e("git blame style.css").includes("who last touched"));
  K("push --force is ignored, with a note", e("git push --force").includes("--force ignored"));
  K("unknown git command", e("git all").includes("not a git command"));
  K("commit with nothing staged", e('git commit -m x') === "nothing to commit, working tree clean");
  K("add a file that does not exist", e("git add nonexist.txt").includes("pathspec"));
  K("commit without -m", e("git commit").includes("no commit message"));
  K("empty commit message", e('git commit -m ""').includes("Aborting commit"));
}

// ---------- diffstat honesty
{
  const D = G.newGame();
  const d = (l) => G.execGit(D, l).out.join("\n");
  const lines = D.working["style.css"].split("\n");
  lines.splice(2, 0, "  font-size: 6em;");
  G.editFile(D, "style.css", lines.join("\n"));
  d("git add .");
  const outp = d('git commit -m "One line"');
  K("one inserted line reports as one insertion", outp.includes("1 file changed, 1 insertion(+)"), outp);
  K("one inserted line reports no deletions", !outp.includes("deletion"), outp);
}

// ---------- normalize / save compatibility
{
  const old = { commits: { a: { msg: "x", tree: {}, parent: null } }, branches: { main: "a" },
                branch: "main", index: {}, working: {}, origin: {},
                done: [true, true, true, true, true, true, true, true, true],
                ran: { seen: true, status: true }, lessonIndex: 9, subgoalFlags: [true] };
  const n = G.normalize(JSON.parse(JSON.stringify(old)));
  K("normalize trims done[] to the lesson count", n.done.length === 8);
  K("normalize clamps a stale lessonIndex", n.lessonIndex <= 8);
  K("normalize adds primerDone", n.primerDone === false);
  K("normalize adds ran.revert", n.ran.revert === false);
  K("normalize pads subgoalFlags to 6", n.subgoalFlags.length === 6);
  K("normalize rebuilds a junk state", G.normalize(null).branches.main !== undefined);
}

console.log("\n" + (fails ? fails + " FAILURES" : "ALL PASS") + " — " + id + " checks");
process.exit(fails ? 1 : 0);
