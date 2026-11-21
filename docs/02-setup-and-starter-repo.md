# Guide 2: Setup, First Green Run and CI

> Series: Building an Agentic Playwright Test Automation Framework
> Previous: [Guide 1: How the framework works](01-how-the-framework-works.md)
> Your repo: [chiragbpatel2000/agentic-playwright-framework-rulebook](https://github.com/chiragbpatel2000/agentic-playwright-framework-rulebook)

## What you will do

1. Clone your repo to your laptop.
2. Check your laptop is ready (Node 22+, Git, VS Code, Claude Code).
3. Get a green smoke test against the demo shop.
4. Learn the everyday commands (tests, reports, lint, rule checks).
5. Prepare `playwright-cli`, the tool the AI uses to explore pages.
6. Understand the CI pipeline that runs on every push.
7. Make your first small commit and watch the guards work.

**Time:** about 45 minutes.

> **Already done for you:** the framework was scaffolded into your repo with the official command `npm create agentic-playwright@latest . -- --demo`, and pushed as the first commit. Lint, the TypeScript compiler and all eight rule checks (`npm run check:skills`) passed before the push. So you start from a working framework, not an empty folder.

---

## Step 1: Clone your repo

```bash
cd ~/projects            # or wherever you keep code
git clone https://github.com/chiragbpatel2000/agentic-playwright-framework-rulebook.git
cd agentic-playwright-framework-rulebook
code .                   # opens VS Code
```

When VS Code opens, it suggests extensions from `.vscode/extensions.json` (Playwright Test, ESLint, Prettier). Click **Install All**.

> **If you ever start a brand-new project from scratch:** create an empty repo on GitHub, clone it, `cd` into it, and run `npm create agentic-playwright@latest . -- --demo`. The `.` means "scaffold right here and name the project after this folder". Run it without `--demo` and it asks for your own app's URLs instead.

---

## Step 2: Check your tools

Run each line in a terminal (in VS Code, use **Terminal → New Terminal**):

```bash
node -v        # must be v22 or higher
npm -v
git --version
claude --version   # Claude Code CLI (if you use it)
python3 --version  # the write-time hook is a Python script
```

> **Node below 22?** Install the latest LTS from [nodejs.org](https://nodejs.org), or use `nvm install 22`. The repo contains a `.nvmrc` file, so `nvm use` picks the right version automatically.

> **Windows users:** use Git Bash or WSL for the `npm run setup:check` and `scripts/*.sh` commands, because they are Bash scripts. Plain `npx playwright test` works in PowerShell too.

---

## Step 3: Install and get your first green run

### 3.1 Install dependencies and the browser

```bash
npm install
npx playwright install chromium
```

`npm install` reads `package.json` and downloads everything into `node_modules/`. It also sets up **Husky**, the pre-commit guard.

### 3.2 Create your local environment file

The env file is **never committed**, because it holds credentials. Create it from the template:

```bash
cp env/.env.example env/.env.dev
```

For the demo shop, put these values in `env/.env.dev`. They're the demo site's public test account, published in its own documentation:

```bash
APP_URL=https://practicesoftwaretesting.com
API_URL=https://api.practicesoftwaretesting.com
APP_EMAIL=customer2@practicesoftwaretesting.com
APP_PASSWORD=welcome01
```

Check it's ignored by Git:

```bash
git status        # env/.env.dev must NOT appear in the list
```

`.gitignore` contains `env/.env.*` with an exception for `!env/.env.example`, so only the template is ever committed.

### 3.3 Run the smoke test

```bash
npm run test:smoke
```

What happens, in order (recall Guide 1, section 3.8):

```
setup-api   → logs in over HTTP, saves the token to .auth/app/apiAccessToken.json
setup-ui    → logs in through the browser, saves the session to .auth/app/appStorageState.json
chromium    → runs tests tagged @smoke, already signed in
```

You should see something like `3 passed`. 🎉

### 3.4 Run the whole example suite and open the report

```bash
npm test                 # everything except @destructive
npm run report           # opens the HTML report in your browser
```

In the report, click any test. You'll see the **Given / When / Then steps** as collapsible sections. That's `test.step()` at work.

### 3.5 Run tests the visual way

```bash
npm run test:ui          # Playwright UI mode: pick a test, watch it run, time-travel each step
npm run test:headed      # see the real browser
npm run test:debug       # step through with the Playwright Inspector
```

> **Tip:** UI mode is the best way to learn. Run `login.spec.ts`, click each step in the timeline, and look at the DOM snapshot at that moment.

---

## Step 4: The everyday commands

All of these are defined in the `scripts` section of `package.json`.

| Command                                                  | What it does                       | When to use it                                        |
| -------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------- |
| `npm test`                                               | All tests except `@destructive`    | Before pushing                                        |
| `npm run test:smoke`                                     | `@smoke` tests only                | Quick health check                                    |
| `npm run test:regression`                                | `@regression` tests                | Full functional check                                 |
| `npm run test:api`                                       | The `api` project only, no browser | Fast API checks                                       |
| `npx playwright test tests/app/functional/login.spec.ts` | One file                           | After editing a spec (the Constitution requires this) |
| `npx playwright test -g "valid credentials"`             | Tests whose name matches           | Focus on one test                                     |
| `npm run lint`                                           | ESLint, zero warnings allowed      | Before every commit                                   |
| `npm run lint:fix`                                       | Auto-fix what ESLint can           | When lint complains about formatting                  |
| `npm run check:skills`                                   | 8 checks on the AI rule layer      | After editing `AGENTS.md` or a skill                  |
| `npm run report`                                         | Open the last HTML report          | After a run                                           |

> 🟦 **TypeScript lesson 14: `package.json` scripts and `npx`**
> `npm run <name>` runs the command stored under that name in `package.json → scripts`. `npx <tool>` runs a tool installed in `node_modules/.bin` (for example, `npx playwright`), so you never need global installs. `npm test` is a shortcut for `npm run test`.

> 🟦 **TypeScript lesson 15: `tsconfig.json` and strict mode**
> `tsconfig.json` tells the TypeScript compiler how strict to be. This repo uses `"strict": true` and `"noImplicitAny": true`. That means every value must have a known type, and TypeScript refuses to silently guess `any`. Try it: run `npx tsc --noEmit` to type-check the whole project without producing files. It should print nothing, which means no errors. You'll use this command a lot while learning.

---

## Step 5: Prepare `playwright-cli` (the AI's eyes)

The Constitution says: **explore before generate**. Before the AI writes any page object or selector, it must open the real page with `playwright-cli` and read its structure (roles, labels, exact messages). Set it up once:

```bash
npm run setup:check                        # checks Node 22+ and links the playwright-cli wrapper
npm run playwright-cli:install-browsers    # Chromium for playwright-cli's own cache
```

You should see `All checks passed`.

Try exploring yourself, so you know what the AI sees:

```bash
playwright-cli open https://practicesoftwaretesting.com
playwright-cli snapshot          # prints the page's accessibility tree: roles, names, labels
playwright-cli close
```

The snapshot is the raw material for `getByRole('button', { name: 'Search' })`-style locators. In Guide 3 you'll do this on the booking app before the AI writes anything.

> **Claude Code check:** a new `*.page.ts` file can only be written if `playwright-cli` was used in the last 240 minutes. The wrapper touches `.playwright-cli/.last-explored`, and the hook checks it. This is what stops the AI from guessing selectors.

---

## Step 6: The CI pipeline (GitHub Actions)

Your repo already contains three workflows in `.github/workflows/`:

| Workflow         | Runs                   | What it checks                                                                                                 |
| ---------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `lint.yml`       | Every push and PR      | ESLint and Prettier                                                                                            |
| `skill-lint.yml` | Every push and PR      | The rule layer: `AGENTS.md` budget, skill sync, the Constitution scan on changed TypeScript, and version drift |
| `playwright.yml` | Push to `main` and PRs | Installs Chromium and runs the **API** tests                                                                   |

See them at **GitHub → your repo → Actions**. After the first push, they ran automatically.

**Why only API tests in CI right now?** The demo shop's website sits behind Cloudflare bot protection, which blocks GitHub's cloud machines. Its API doesn't. When we point the framework at the booking app in Guide 3, we'll switch CI to run the UI tests too.

**Secrets in CI.** The demo values are written straight into `playwright.yml` because they're public. For any real app, you'd store them as **repository secrets** (**Settings → Secrets and variables → Actions**) and reference them as `${{ secrets.APP_PASSWORD }}`. We'll do this in Guide 3.

> 🟦 **Reading YAML.** Workflows are YAML: indentation means nesting, `-` starts a list item, and `key: value` sets a value. Under `steps:`, each `- name:` / `run:` pair is one shell command on the CI machine. `uses:` pulls in a ready-made action (checkout, setup-node, upload-artifact).

---

## Step 7: Your first commit, and watching the guards work

Let's make a small change and commit it, so you see Husky and the Constitution scan in action.

### 7.1 Try to break a rule on purpose

Create `tests/app/functional/broken.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('bad test', async ({ page }) => {
    await page.goto('https://practicesoftwaretesting.com');
    await page.waitForTimeout(3000);
    await expect(page.locator('//h1')).toBeVisible();
});
```

Stage and try to commit it:

```bash
git add tests/app/functional/broken.spec.ts
git commit -m "test: broken example"
```

**The commit is blocked.** The pre-commit hook runs `enforce_constitution.py --scan` and lists the violations: importing from `@playwright/test` in a spec, a hard wait, XPath, a hardcoded URL and a missing tag. This works whatever tool wrote the file: you, Copilot, Cursor or Claude.

If you ask Claude Code to write that same file, it gets blocked **even earlier**, at write time, by the `PreToolUse` hook.

Clean up:

```bash
git restore --staged tests/app/functional/broken.spec.ts
rm tests/app/functional/broken.spec.ts
```

### 7.2 Make a real commit

Open `README.md` and change the first heading to your project title, for example:

```md
# Agentic Playwright Framework: Rulebook Edition (Chirag Patel)
```

Then:

```bash
git checkout -b docs/readme-title
git add README.md
git commit -m "docs: personalise README title"
git push -u origin docs/readme-title
```

Open a pull request on GitHub and watch the three workflows run on it. When they're green, merge it.

> **Commit message style:** the repo uses **Conventional Commits**: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`. It reads well in history and it's a good habit to mention in interviews.

---

## Step 8: Use the AI for the first time (a safe, read-only task)

Open Claude Code in the repo folder (`claude`) and try:

```
Explain how the login spec gets an already-signed-in browser. Which files are involved,
in what order? Don't change any files.
```

Watch for three things:

1. It reads `CLAUDE.md` → `AGENTS.md` automatically.
2. It loads the relevant skills (`fixtures`, `helpers`, `config`).
3. Its answer matches what you learnt in Guide 1, section 3.8.

Then try one that should trigger the **confidence gate**:

```
Add a page object for the checkout page.
```

It should load `ai-native-workflow`, explore with `playwright-cli`, and stop at a **Proposal** with a confidence score and unknowns. **Don't approve it.** Just read the proposal, then say "stop". You'll do this for real in Guide 3.

---

## Troubleshooting

| Symptom                                               | Fix                                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Executable doesn't exist ... chromium`               | Run `npx playwright install chromium`                                                                                                                                                                                                                |
| `Node >= 22 required`                                 | Upgrade Node (Step 2)                                                                                                                                                                                                                                |
| Smoke test fails at `setup-api` with a network error  | Check `env/.env.dev` exists and has the 4 values; try opening the demo site in a browser (it's occasionally down)                                                                                                                                    |
| `setup-api` fails with `Expected: 200, Received: 423` | The demo shop has temporarily **locked** its shared public account (HTTP 423 means Locked), usually after many failed logins from people around the world. It isn't your code. Wait an hour, or move on to Guide 3, which uses your own app settings |
| UI setup blocked by "Verify you are human"            | The demo shop's Cloudflare check. Retry from a home network, or use `npm run test:api` meanwhile                                                                                                                                                     |
| `playwright-cli: command not found`                   | Run `npm run setup:check` again; on Windows use Git Bash                                                                                                                                                                                             |
| Commit blocked by Husky                               | Read the message: it names the rule. Fix the code, never bypass it with `--no-verify`                                                                                                                                                                |
| `npm run lint` fails only on formatting               | Run `npm run lint:fix`                                                                                                                                                                                                                               |

---

## Checklist before Guide 3

- [ ] `npm run test:smoke` is green on your laptop
- [ ] You opened the HTML report and saw the Given / When / Then steps
- [ ] `npx tsc --noEmit` and `npm run lint` print no errors
- [ ] `npm run setup:check` says `All checks passed`
- [ ] You saw a commit get blocked by the Constitution scan
- [ ] You merged one small PR with green CI
- [ ] You saw the AI stop at a confidence-scored proposal

## What's next

**Guide 3: Point it at the booking app.** We'll switch the framework from the demo shop to [Restful Booker Platform](https://automationintesting.online). That means new env values, new enums, new auth setup and the explore-then-generate workflow for the room booking and admin pages. Then we'll write your first real UI and API tests, and turn on UI tests in CI.
