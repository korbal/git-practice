# Git Practice

A browser-based git trainer for web development students who have never used version control. It simulates a small team website project with real history, a fake terminal, and a live preview of the page the student is editing.

The point is not coverage. A student finishes this able to work on a real project with a real team, using six commands, having already broken something and fixed it.

Open `index.html` in a browser. That is the whole install.

## What it teaches

A primer, then seven drills, then one unguided scenario.

**Primer (6 slides).** Why any of this is worth learning, before a single command. It opens on an analogy with no git vocabulary in it (a game save point), then the pain (a folder full of `index-final-2.html`), then a glossary mapping everyday words to git words, then the concepts the lessons assume. Students can reopen it any time with the "Why git?" button.

**Lessons 1 to 7.** Hints available on every one.

1. What did I just change: `git status`
2. Pick what goes in the save: `git add`
3. Make the save point: `git commit`
4. Your save slots: `git log`
5. Cloud save: `git push`
6. Bence saved over you: `git pull`
7. Load the last good save: `git revert`

Lesson 6 is where the drama starts. Bence is the teammate, and his second commit contains a plausible typo (`max-width: 900px` becomes `90px`) that visibly wrecks the layout in the preview pane the moment the student pulls it. Lesson 7 has them find it in the log and revert it.

**Lesson 8, "The site is down".** No hints, and the broken commit is the student's own rather than Bence's. The team lead asks for a bigger font, the student pushes it, the phone rings, and they have to roll it back themselves. Five steps tick green as they get there, and the last one un-ticks if they break it again.

## Scope decisions, on purpose

Read this before adding anything.

**No branching.** `git branch`, `switch`, `checkout` and `merge` still work in the simulator, as an unadvertised sandbox for students who go poking. No lesson mentions them, and the finish screen says branches come later. They are out of scope because a student who cannot yet commit confidently does not benefit from a second axis to be confused on.

**`git revert` is the only undo taught.** Not `git restore`, not `git reset`. The failure students hit is a bad commit that is already pushed, where reset is the wrong answer and revert is the right one. Teaching one command that always works beats teaching three with conditions attached.

**Six commands total.** `status`, `add`, `commit`, `log`, `push`, `pull`, `revert`. Every command added is one more thing a beginner has to hold in their head.

**English.** The repo name is Hungarian, the app is not. Bence is the one Hungarian word in it, on purpose.

**One metaphor, carried all the way through.** A commit is a save point, `git log` is the save slots, `git revert` loads an older save, `git push` is the cloud save, `git pull` downloads the other player's saves, and Bence saving over you is what makes lesson 6 land. The primer opens on it and every lesson after keeps the same words. New copy uses that vocabulary or it weakens the parts that already do.

**Bence stays out of the engine.** He is named in lesson text and in the `git blame` reply only. Command output keeps matching real git, because that is what students meet next week.

## Architecture

Everything ships in `index.html`. No build step, no bundler, no external assets. The only outbound link is to Learn Git Branching on the finish screen. Drop the file on any static host, or hand students the file itself.

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
| `subgoalFlags` | the five steps of lesson 8 |
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
npm test         # engine: 89 checks, runs in a vm, no DOM
npm run test:ui  # UI: 112 checks, jsdom, walks the whole app end to end
```

The UI suite clicks through the primer, does every lesson in order, reads hashes out of the rendered terminal, feeds them back to `git revert`, checks the preview's `srcdoc` after each change, and verifies the progress code survives a round trip. Both suites read `index.html` directly, so there is nothing to keep in sync.

Both must pass before a change is done. Neither covers rendering, so anything visual needs a screenshot as well.

## Screenshots

`shot.js` renders the page headless through a cached Chrome build, driven by `puppeteer-core`.

```
node shot.js out.png "" 1200 900 setup.js
```

The arguments are output path, URL (empty means the local `index.html`), width, height, and an optional JavaScript file run in the page before the shot, which is how you click through the primer or drive the editor first. If no cached Chrome exists on the machine, the header comment in `shot.js` documents the one-time bootstrap.

This is a development tool and is deliberately not part of `npm test`.

## Changing it

**Add or edit a lesson.** Append to `LESSONS` and add a matching predicate at the same index in `accepts`. Nothing else counts lessons: the progress dots, the `done` array and the finish screen all derive from `LESSONS.length`. A lesson with a `steps` array gets the checklist UI, which reads `subgoalFlags`.

**Add a primer slide.** Append to `PRIMER` with a `title`, a `body` and an `art` key naming a function in the `ART` object in the UI block. Drawings are inline SVG on a 640-wide viewBox. Below 560px they stop scaling and the container scrolls, because the labels become unreadable otherwise.

**Add a non-git reply.** `SHELL` maps a bare command name (`sudo`, `rm`, `vim`, `ls`, `npm`) to the lines the terminal prints instead of `command not found`. Unlisted commands still get the shell error, which two tests check. Each reply is dry and also true about the real command, so a student who types it for a laugh still leaves with something. `git blame` is the same idea inside the git switch.

**Add a git command.** Add a `case` to the switch in `execGit`. Match real git's output text closely, including its error messages, since students will meet the real thing next week and should recognise what they see. Read the scope section first.

**Writing style.** Lesson and primer text is read by beginners under mild stress. Short sentences, one idea each, no em dashes. The tone stays dry. The save-system vocabulary above does the personality work. No memes, no references to a specific game, because both date fast and the ones who do not get them feel it.

## Teaching notes

Budget 40 to 60 minutes. The primer is 5 minutes and should not be skipped, because it is the only part that answers why they are doing this.

Where students get stuck, in order of frequency:

- Forgetting the quotes in `git commit -m "message"`.
- Typing `git commit` with nothing staged. The error text is the real one and explains itself, so let them read it.
- In lesson 7, copying the whole log line instead of the hash.
- In lesson 8, reverting and then not pushing. The fifth step stays grey until GitHub has the fix, which is the point of the lesson.

The progress code buttons exist for the student whose browser storage gets cleared, or who switches machines mid-class. Worth mentioning once at the start so nobody loses an hour.
