# Git Practice

A browser-based git trainer for web development students who have never used version control. It simulates a small team website project with real history, a fake terminal, and a live preview of the page the student is editing.

The point is not coverage. A student finishes this able to work on a real project with a real team, using six commands, having already broken something and fixed it.

Open `index.html` in a browser. That is the whole install.

## What it teaches

A primer, then seven drills, then one unguided scenario.

**Primer (8 slides).** Why any of this is worth learning, before a single command. Students can reopen it any time with the "Why git?" button.

The order is deliberate: hook, then problem, then vocabulary.

1. A game save point. The analogy, with no git vocabulary in it at all.
2. Now there are two of you. Same analogy, co-op: one shared save file, two people, and one of them about to write over the other. It names Józsi here so lesson 6 is a callback rather than an ambush.
3. You are going to break it. The pain, and the folder full of `index-final-2.html`.
4. git is yours, GitHub is the shared one. The answer to slide 2: a website exists in the middle *because* two people need one save file. It also says plainly what is deferred, since that is what stops beginners worrying about it.
5. The glossary, mapping everyday words to git words.
6. to 8. Commits, the four boxes, and the career hook.

Slides 2 and 4 are a setup and a payoff, which is why they are split rather than merged. Both stay free of command names: the glossary at slide 5 is where `git push` and `git pull` first get attached to "upload yours" and "download theirs".

**Lessons 1 to 7.** Hints available on every one.

1. What did I just change: `git status`
2. Pick what goes in the save: `git add`
3. Make the save point: `git commit`
4. Your save slots: `git log`
5. Cloud save: `git push`
6. Józsi saved over you: `git pull`
7. Load the last good save: `git revert`

Lesson 6 is where the drama starts, and primer slide 2 is what sets it up. Józsi is the teammate, and his second commit contains a plausible typo (`max-width: 900px` becomes `90px`) that visibly wrecks the layout in the preview pane the moment the student pulls it. Lesson 7 has them find it in the log and revert it.

**Lesson 8, "Your turn, no hints".** The broken commit is the student's own rather than Józsi's, which is the harder case and the more common one: you cannot quietly delete it, because it is already public.

Three things about it are deliberate, and all three were wrong in an earlier version:

**The lesson does not say what is about to happen.** The title and the opening brief ask for a bigger font and nothing else. The phone-rings paragraph (`goal2`) is revealed by `renderLesson` only once step 2 is green, so the preview breaks the news first. Lesson 7 works because the student *discovers* Józsi's bug; announcing this one in the brief threw that away. Do not move `goal2` into `goal`.

**The value is `6em`, not `60px`.** A beginner has no intuition for `em`, so `font-size: 6em` looks as reasonable as `1.2em` when they type it, and renders at about 96px. It is the same mechanic as Józsi's `900px` to `90px`: one character from correct. It lands the way it does because `.hero h1` is pinned at `32px`, so the body text ends up larger than the heading. Anything that removes that rule spoils the effect, and a test guards it.

**There are six steps, not five.** The sixth is doing the job the lead actually asked for: a sensible `1.2em`, committed and pushed. Without it the lesson ends with the site safe, the request unmet, and revert taught as a synonym for giving up. In the save-point metaphor you load the save and then *play the section again* — nobody loads a save and stops playing. The last step un-ticks if they break it again.

## Scope decisions, on purpose

Read this before adding anything.

**No branching, and the finish screen does not mention it either.** `git branch`, `switch`, `checkout` and `merge` still work in the simulator, as an unadvertised sandbox for students who go poking. No lesson mentions them. They are out of scope because a student who cannot yet commit confidently does not benefit from a second axis to be confused on.

The finish screen used to name branching and link out to Learn Git Branching. It no longer does, and a test asserts it stays that way. Naming a thing you are not teaching invites the search, and a beginner who has just got their first loop working does not need a second tool that afternoon.

**No real-repo setup.** GitHub is taught throughout as box 4, the cloud save: the primer separates it from git, lesson 5 pushes to it, and lesson 8 is only finished when GitHub has the fix. What is *not* taught is making an account, making a repository, `git clone`, remotes or auth. So the finish screen does not tell students to go and do that, because `clone` and repository creation appear nowhere in the six commands and sending them off to improvise is how you lose them. Slide 4 promises that part comes later; the finish screen repeats the promise. If you add one, add the other.

**`git revert` is the only undo taught.** Not `git restore`, not `git reset`. The failure students hit is a bad commit that is already pushed, where reset is the wrong answer and revert is the right one. Teaching one command that always works beats teaching three with conditions attached.

**Six commands total.** `status`, `add`, `commit`, `log`, `push`, `pull`, `revert`. Every command added is one more thing a beginner has to hold in their head.

**English.** The repo name is Hungarian, the app is not. Józsi is the one Hungarian word in it, on purpose.

**One metaphor, carried all the way through.** A commit is a save point, `git log` is the save slots, `git revert` loads an older save, `git push` is the cloud save, `git pull` downloads the other player's saves, and Józsi saving over you is what makes lesson 6 land. The primer opens on it and every lesson after keeps the same words. New copy uses that vocabulary or it weakens the parts that already do.

**Józsi stays out of the engine.** He is named in lesson text and in the `git blame` reply only. Command output keeps matching real git, because that is what students meet next week.

## Architecture

Everything ships in `index.html`. No build step, no bundler, no external assets, and no outbound links at all. Drop the file on any static host, or hand students the file itself.

Inside it, two `<script>` blocks:

**The engine**, between the `/*__ENGINE_START__*/` and `/*__ENGINE_END__*/` markers. Pure logic, no DOM. It exports through `window.__GYT`: the git simulator (`execGit`), the lesson and primer content (`LESSONS`, `PRIMER`), the completion predicates (`accepts`), the seeded project history (`HISTORY`), and the scripted events (`teamworkScenario`, `scenarioSetup`). `test.js` extracts this block by its markers and runs it in a `vm` context with no browser present, which is why the engine must stay DOM-free.

**The UI**, everything after. Rendering, the terminal, the file editor, the primer screen, the progress dots, localStorage.

### State

One plain object, serialised to `localStorage` under `git-gyakorlo-v1`, and also to a base64 "progress code" so a student can move between machines. Its fields:

| Field | Holds |
|---|---|
| `commits` | every commit, each with `msg`, a full file `tree`, and `parent` |
| `branches`, `branch` | branch tips, and which one is checked out |
| `working`, `index` | the working directory and the staging area, as filename to content |
| `origin` | what GitHub has, per branch |
| `done`, `lessonIndex`, `primerDone` | progress |
| `ran` | which commands the student has used at least once |
| `subgoalFlags` | the six steps of lesson 8 |
| `scenarioBase`, `scenarioLogged`, `teamworkPushed` | scripted-event bookkeeping |

Commits store whole trees rather than diffs. The projects are four files long, so this is simpler than the alternative and costs nothing.

`normalize()` is the compatibility layer. It fills in fields a saved state predates, clamps `lessonIndex`, and resizes `done` to the current lesson count. An old save or a pasted progress code goes through it, so adding a field to the state object means adding a default there too.

### The live preview

A sandboxed iframe rendering the working directory's `index.html` with `style.css` inlined. It is what makes "you broke the site" land instead of being a sentence on a card.

Two things about it are load-bearing:

The `sandbox` attribute is bare, with no value. That blocks scripts, which matters because students type arbitrary HTML into the file editor. Never add `allow-scripts`. Do not add `allow-same-origin` either: it is not needed for rendering, and the two together let a frame remove its own sandbox.

`renderPreview()` clears `srcdoc` before setting it. Chrome does not repaint a `srcdoc` iframe on a second navigation if the attribute is simply overwritten, so without the clear the preview renders once on load and then silently freezes while the student edits. jsdom cannot catch this, because the attribute updates correctly and only the paint is stale. If you touch that function, check it in a real browser.

## Tests

```
npm test         # engine: 107 checks, runs in a vm, no DOM
npm run test:ui  # UI: 133 checks, jsdom, walks the whole app end to end
```

The UI suite clicks through the primer, does every lesson in order, reads hashes out of the rendered terminal, feeds them back to `git revert`, checks the preview's `srcdoc` after each change, and verifies the progress code survives a round trip. Both suites read `index.html` directly, so there is nothing to keep in sync.

Some of the checks exist to protect decisions rather than code, and will look odd out of context: that lesson 8's brief does not contain the word "phone", that the finish screen has no `<a>` in it, that the co-op slide names Józsi. Those are the scope decisions above, written down somewhere that fails.

When editing style.css in a test, only ever touch the `body` rule. A bare `/font-size/` match hits `.hero h1` first and quietly changes what the test is exercising.

Both must pass before a change is done. Neither covers rendering, so anything visual needs a screenshot as well.

## Screenshots

`shot.js` renders the page headless through a cached Chrome build, driven by `puppeteer-core`.

```
node shot.js out.png "" 1200 900 setup.js
```

The arguments are output path, URL (empty means the local `index.html`), width, height, and an optional JavaScript file run in the page before the shot, which is how you click through the primer or drive the editor first. If no cached Chrome exists on the machine, the header comment in `shot.js` documents the one-time bootstrap.

Set `CHROME_PATH` to point at a Chrome or Chromium outside the puppeteer cache, which is what container and CI images usually need.

This is a development tool and is deliberately not part of `npm test`.

## Changing it

**Add or edit a lesson.** Append to `LESSONS` and add a matching predicate at the same index in `accepts`. Nothing else counts lessons: the progress dots, the `done` array and the finish screen all derive from `LESSONS.length`. A lesson with a `steps` array gets the checklist UI, which reads `subgoalFlags`.

**Add a primer slide.** Append to `PRIMER` with a `title`, a `body` and an `art` key naming a function in the `ART` object in the UI block. Read the slide order above first: it is a sequence, not a list, and inserting a concept slide before the pain slide costs you the student's attention. Drawings are inline SVG on a 640-wide viewBox. Below 560px they stop scaling and the container scrolls, because the labels become unreadable otherwise.

**Add a non-git reply.** `SHELL` maps a bare command name (`sudo`, `rm`, `vim`, `ls`, `npm`) to the lines the terminal prints instead of `command not found`. Unlisted commands still get the shell error, which two tests check. Each reply is dry and also true about the real command, so a student who types it for a laugh still leaves with something. `git blame` is the same idea inside the git switch.

**Add a git command.** Add a `case` to the switch in `execGit`. Match real git's output text closely, including its error messages, since students will meet the real thing next week and should recognise what they see. Read the scope section first.

**Writing style.** Lesson and primer text is read by beginners under mild stress. Short sentences, one idea each, no em dashes. The tone stays dry. The save-system vocabulary above does the personality work. No memes, no references to a specific game, because both date fast and the ones who do not get them feel it.

## Teaching notes

Budget 40 to 60 minutes. The primer is 6 or 7 minutes and should not be skipped, because it is the only part that answers why they are doing this. Slides 2 and 4 are the ones worth reading aloud if the room is quiet: everything about lesson 6 onwards assumes a second person exists.

Where students get stuck, in order of frequency:

- Forgetting the quotes in `git commit -m "message"`.
- Typing `git commit` with nothing staged. The error text is the real one and explains itself, so let them read it.
- In lesson 7, copying the whole log line instead of the hash.
- In lesson 8, reverting and then not pushing. The fifth step stays grey until GitHub has the revert, which is the point of the lesson.
- In lesson 8, stopping at the revert. The site works, so it feels finished, but the lead's request is still undone and the sixth step says so. This one is worth letting them sit in for a moment: the revert bought them time, it did not do the work.

The progress code buttons exist for the student whose browser storage gets cleared, or who switches machines mid-class. Worth mentioning once at the start so nobody loses an hour.
