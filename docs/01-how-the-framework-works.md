# Guide 1: How the Agentic Playwright Framework Works (and the TypeScript Behind It)

> Series: Building an Agentic Playwright Test Automation Framework
> Reference repo: [idavidov13/agentic-playwright](https://github.com/idavidov13/agentic-playwright) (MIT licence)
> Your repo: [chiragbpatel2000/agentic-playwright-framework-rulebook](https://github.com/chiragbpatel2000/agentic-playwright-framework-rulebook)

## What you will learn

1. What "agentic" test automation means and why it needs a rulebook.
2. The three layers of the framework: **rules for the AI**, **guards that enforce them**, and **the test code itself**.
3. How each folder in the repo fits in, and why it exists.
4. The TypeScript you need, taught at the point it first appears in real code.
5. Small exercises so you can check your understanding before Guide 2.

You don't need to install anything yet. Read this guide with the reference repo open in a browser tab.

---

## Part 1: The big idea

### The problem

If you ask an AI assistant to "write a test for login", you usually get something that runs once and falls apart later. It uses XPath, `waitForTimeout(5000)`, the `any` type, hardcoded URLs and passwords, and has no structure. That isn't the AI being bad. It just has no idea what your team's standards are.

### The solution: hand the AI a rulebook

This framework gives the AI the rules **before** it writes anything, and it **blocks** code that breaks them. The README puts it like this: _"Stop teaching your AI how to write tests. Hand it the rulebook."_

You stay in charge of the important question: **is this test worth having?** The rules guarantee the _form_ of a test (structure, selectors, schemas, data, tags). They don't guarantee its _value_. When you review an AI-written test, ask these three questions:

1. Would this test fail if the feature broke?
2. Is every scenario we deliberately left out recorded in a `// SCOPE` comment?
3. Does it pass when I run it again?

> **Portfolio angle:** "I designed AI-assisted test automation with guardrails: AI generates, rules constrain, humans review for value." This is exactly the governance story that enterprise clients (Workday programmes included) want to hear.

---

## Part 2: The three layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: RULES FOR THE AI                                  │
│  AGENTS.md (the "Constitution")  ·  CLAUDE.md               │
│  .claude/skills/*  (17 skills, loaded only when relevant)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ the AI reads these, then writes code
┌──────────────────────────────▼──────────────────────────────┐
│  LAYER 2: GUARDS THAT ENFORCE THE RULES                     │
│  .claude/scripts/enforce_constitution.py  (write-time hook) │
│  ESLint + Prettier + Husky pre-commit  ·  GitHub Actions CI │
└──────────────────────────────┬──────────────────────────────┘
                               │ only compliant code gets through
┌──────────────────────────────▼──────────────────────────────┐
│  LAYER 3: THE TEST FRAMEWORK                                │
│  pages/  fixtures/  tests/  test-data/  enums/  config/     │
│  helpers/  env/  playwright.config.ts                       │
└─────────────────────────────────────────────────────────────┘
```

### Layer 1: Rules for the AI

**`AGENTS.md`, the Constitution.** About 90 lines that every AI tool reads on every turn. Codex, Cursor and Copilot read it directly, and Claude Code imports it through `CLAUDE.md` (which just contains `@AGENTS.md` plus a few Claude-specific notes). It has four sections:

| Section      | What it says   | Example rule                                                                                           |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------------ |
| **MUST**     | Non-negotiable | Selectors in this order: `getByRole` > `getByLabel` > `getByPlaceholder` > `getByText` > `getByTestId` |
| **SHOULD**   | Strong default | Use `test.step()` with Given / When / Then                                                             |
| **WON'T**    | Forbidden      | No XPath, no hard waits, no `any`, no hardcoded secrets                                                |
| **Workflow** | How to work    | Load `ai-native-workflow` first, verify with lint and tests, ask before committing                     |

**Skills (`.claude/skills/`).** The Constitution stays short because the detail lives in 17 _skills_. A skill is a folder with a `SKILL.md` that the AI loads **only when it's relevant**. For example, `page-objects` loads when it's touching `pages/**`, and `api-testing` loads when it's writing an API spec. This keeps the AI's context focused.

The most important skill is **`ai-native-workflow`**, the entry point for any non-trivial task. It makes the AI:

1. **Classify** the task (new code, edit, refactor, debug, explore or config).
2. **Route** it to the right skill.
3. **Explore** first. For UI work that means looking at the live app with `playwright-cli`. For API work it means reading the OpenAPI document.
4. **Propose a plan with a confidence score:**
    ```
    ## Proposal
    - Scope: <files + what changes>
    - Confidence: <1-10>
    - Rationale: ...
    - Unknowns: ...
    ```
    **Below 5, the AI must stop and ask you** instead of guessing.
5. **Wait for your approval** (the "human gate"), then apply, verify and report.

This **confidence gate** is what makes the framework "agentic" in a controlled way: the AI does the legwork, but it can't invent selectors, messages or credentials.

### Layer 2: Guards that enforce the rules

Rules alone aren't enough, because AI models drift. So the rules are also enforced by machine:

| Guard                                                                                           | When it runs                                    | What it does                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enforce_constitution.py` (a Claude Code **PreToolUse hook**, wired in `.claude/settings.json`) | Every time the AI tries to write or edit a file | Blocks 18 detectable violations (`waitForTimeout`, XPath, `z.object`, `any`, hardcoded URLs, missing or multiple tags…) **before the file is written**, and tells the AI which rule it broke |
| ESLint + Prettier                                                                               | `npm run lint`                                  | Code style and correctness, zero warnings allowed                                                                                                                                            |
| Husky pre-commit                                                                                | `git commit`                                    | Runs lint and the same Constitution scan on staged files, so it works for every AI tool and for humans too                                                                                   |
| GitHub Actions                                                                                  | Every push or PR                                | Runs lint and the tests in the cloud                                                                                                                                                         |

> **Key insight for interviews:** this is "shift-left quality" applied to AI. Instead of catching bad tests in review, you make them impossible to write.

### Layer 3: The test framework

This is a standard, well-designed Playwright + TypeScript framework. You could use it without any AI at all. The next part walks through it folder by folder.

---

## Part 3: Folder by folder, with the TypeScript you need

Each section shows a real file from the reference repo, explains the testing idea, then explains the TypeScript in it. 🟦 boxes are TypeScript lessons.

### 3.1 `env/` and `config/`: where URLs and secrets come from

`env/.env.example` (committed, with placeholder values):

```bash
APP_URL=https://your-app-url.com
API_URL=https://your-api-url.com
APP_EMAIL=your-email@example.com
APP_PASSWORD=your-secure-password
```

You copy this to `env/.env.dev` (which is **git-ignored**) and put real values in it. `playwright.config.ts` loads it with `dotenv`. Run `ENVIRONMENT=staging npx playwright test` and it loads `env/.env.staging` instead.

`config/app.ts`:

```ts
export const appConfig = {
    appUrl: process.env.APP_URL!,
    apiUrl: process.env.API_URL!,
};
```

> 🟦 **TypeScript lesson 1: `const`, objects, `export`, and the `!` operator**
>
> - `const` declares a variable that can't be reassigned. Use `const` by default and `let` only when the value changes.
> - `{ appUrl: ..., apiUrl: ... }` is an **object literal**: a set of key/value pairs.
> - `export` makes it importable from other files: `import { appConfig } from '../config/app'`.
> - `process.env.APP_URL` has the type `string | undefined`, because the variable might not be set. The `!` at the end (the _non-null assertion_) tells TypeScript "trust me, this is defined". Use it sparingly. The `type-safety` skill covers when to use `!` and when to use `??` (a fallback value, for example `process.env.ENVIRONMENT ?? 'dev'`).

**Rule:** _Sources of Truth._ URLs and credentials come only from `process.env.*`. Never hardcode them.

### 3.2 `enums/`: one home for every repeated string

`enums/app/app.ts`:

```ts
export enum Messages {
    LOGIN_ERROR = 'Invalid email or password',
    EMAIL_REQUIRED = 'Email is required',
}

export enum AppRoutes {
    LOGIN = '/auth/login',
}

export enum ApiEndpoints {
    LOGIN = '/users/login',
    CURRENT_USER = '/users/me',
}
```

> 🟦 **TypeScript lesson 2: `enum`**
> An `enum` is a named set of constants. `Messages.LOGIN_ERROR` is the string `'Invalid email or password'`. If the app's wording changes, you change it in **one** place and every test picks it up. TypeScript also autocompletes the names and flags typos at compile time, which a plain string can't do.

**Rule:** _Enums for Strings._ Endpoint paths, routes, UI messages and storage-state paths all live here.

### 3.3 `pages/`: Page Objects

A Page Object wraps a screen of the app. Tests call `appPage.login(email, password)` instead of hunting for input boxes. If the UI changes, you fix one file.

`pages/app/app.page.ts` (shortened):

```ts
import { expect, Locator, Page } from '@playwright/test';
import { AppRoutes, Messages } from '../../enums/app/app';
import { NavigationComponent } from '../components/navigation.component';

export class AppPage {
    readonly nav: NavigationComponent;

    constructor(private readonly page: Page) {
        this.nav = new NavigationComponent(page);
    }

    // ===== Locators =====
    get emailInput(): Locator {
        return this.page.getByLabel('Email address *');
    }

    get loginButton(): Locator {
        return this.page.getByRole('button', { name: 'Login' });
    }

    get errorMessage(): Locator {
        return this.page.getByText(Messages.LOGIN_ERROR);
    }

    // ===== Actions =====
    /**
     * Performs login with the provided credentials.
     * @param {string} email - The user's email address.
     * @param {string} password - The user's password.
     * @returns {Promise<void>}
     */
    async login(email: string, password: string): Promise<void> {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
    }
}
```

> 🟦 **TypeScript lesson 3: classes, constructors and access modifiers**
>
> - A `class` is a blueprint. `new AppPage(page)` creates an _instance_.
> - The `constructor` runs when the instance is created.
> - `constructor(private readonly page: Page)` is a **parameter property**, a shortcut that declares a field called `page`, makes it `private` (only this class can use it) and `readonly` (it can't be reassigned), and stores the argument in it. It's the same as writing:
>     ```ts
>     private readonly page: Page;
>     constructor(page: Page) { this.page = page; }
>     ```
> - `this` means "this instance". `this.page` is the browser page the object controls.

> 🟦 **TypeScript lesson 4: type annotations and `get` accessors**
>
> - `email: string` is a **type annotation**: the parameter must be a string. Pass a number and TypeScript fails _before_ the test runs.
> - `(): Locator` after a method is its **return type**.
> - `get emailInput(): Locator { ... }` is a **getter**. You use it like a property, `appPage.emailInput`, with no `()`. Each access builds a fresh locator. Playwright locators are lazy, so this is cheap and always current.

> 🟦 **TypeScript lesson 5: `async`, `await` and `Promise`**
> Browser actions take time. An `async` function always returns a `Promise`, which is a value that arrives later. `await` pauses until that value arrives. `Promise<void>` means "finishes later and returns nothing useful".
> **The classic bug:** forgetting `await` before `fill()` or `click()`. The test races ahead and fails randomly. ESLint's `no-floating-promises` rule catches this for you.

**Page Object rules (from the `page-objects` skill):**

- Locators are `get` accessors **without** JSDoc. Action methods **with** JSDoc (`@param`, `@returns`).
- Forms have three groups: interactive locators, **feedback** locators (success, error, validation) and actions.
- Actions don't assert. Only an `xxxAndVerify()` method may call `expect`.
- Shared UI fragments (header, modal, sidebar) become **components** in `pages/components/` and are composed in, like `readonly nav: NavigationComponent`.
- **Explore before generate:** the AI must look at the live page with `playwright-cli` before writing any locator. Claude Code even checks for a fresh exploration marker (less than 4 hours old) before it will create a new page file.

### 3.4 `fixtures/`: dependency injection, the heart of the framework

Instead of writing `new AppPage(page)` in every test (which the Constitution **forbids**), you register page objects as **fixtures**. Playwright creates them and hands them to each test.

`fixtures/pom/page-object-fixture.ts`:

```ts
import { test as base } from '@playwright/test';
import { AppPage } from '../../pages/app/app.page';

export type FrameworkFixtures = {
    appPage: AppPage;
    resetStorageState: () => Promise<void>;
};

export const test = base.extend<FrameworkFixtures>({
    appPage: async ({ page }, use) => {
        await use(new AppPage(page));
    },
    // ...
});
```

`fixtures/pom/test-options.ts` merges all the fixture files into one `test`:

```ts
const test = mergeTests(pageObjectFixture, apiRequestFixture, helperFixture);
const expect = base.expect;
export { test, expect, request };
```

Then every spec imports `test` and `expect` **from here**, never from `@playwright/test`. That's the _Imports_ rule.

> 🟦 **TypeScript lesson 6: `type` aliases and function types**
>
> - `type FrameworkFixtures = { appPage: AppPage; ... }` defines the **shape** of an object: which keys it has and what type each value is.
> - `() => Promise<void>` is a **function type**: a function that takes no arguments and returns a Promise of nothing.

> 🟦 **TypeScript lesson 7: generics (`<...>`)**
> `base.extend<FrameworkFixtures>(...)` passes a **type argument**. It tells Playwright: "the fixtures I'm adding look like `FrameworkFixtures`". That's why, inside a test, typing `appPage.` autocompletes `login`, `emailInput` and the rest. Think of generics as "types with a blank to fill in". You'll see them again in `apiRequest<UserResponse>(...)`.

> 🟦 **TypeScript lesson 8: destructuring and arrow functions**
>
> - `async ({ page }, use) => { ... }` is an **arrow function**. `({ page })` **destructures** the first argument: it pulls the `page` property out of the object Playwright passes in.
> - `as base` in `import { test as base }` renames an import.

**How a fixture works:** code before `await use(...)` is setup, the value passed to `use` is what the test receives, and code after `use` is teardown.

### 3.5 `fixtures/api/`: API testing with schema validation

API tests use an `apiRequest` fixture, and every response is checked against a **Zod schema**, a runtime description of what the JSON must look like.

`fixtures/api/schemas/app/userSchema.ts`:

```ts
import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

export const UserResponseSchema = z.strictObject({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.int(),
});

export type UserResponse = zOutput<typeof UserResponseSchema>;
```

`tests/app/api/login.spec.ts`:

```ts
const { status, body } = await apiRequest<UserResponse>({
    method: 'POST',
    url: ApiEndpoints.LOGIN,
    baseUrl: process.env.API_URL,
    body: { email: process.env.APP_EMAIL, password: process.env.APP_PASSWORD },
});

expect(status).toBe(200);
expect(UserResponseSchema.parse(body)).toBeTruthy();
```

> 🟦 **TypeScript lesson 9: compile time vs. run time (why Zod?)**
> TypeScript types **disappear** when the code runs. They only check _your_ code. They can't check what an API actually sends back. Zod schemas exist at **run time**. `.parse(body)` throws an error if the response is missing a field, has the wrong type or (with `strictObject`) has an **unexpected extra field**.
> `zOutput<typeof UserResponseSchema>` **derives** a TypeScript type from the schema, so you write the shape once and get both checks.
> `typeof X` (in a type position) means "the type of the value X".

> 🟦 **TypeScript lesson 10: union types and optional properties**
> In `plain-function.ts`:
>
> ```ts
> method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH';
> baseUrl?: string;
> ```
>
> `|` makes a **union type**: the value must be one of these exact strings, so `'POTS'` fails at compile time. The `?` makes `baseUrl` **optional**.

**Rules:** `z.strictObject()` only, never the looser `z.object()`. Validate with exactly `expect(Schema.parse(body)).toBeTruthy();`. Build schemas from the OpenAPI document. If the live API disagrees with the contract, `test.skip` with `// FIXME:` and **never loosen the schema**.

> **Workday angle:** this is contract testing, the same discipline as validating that an integration's output file matches the agreed layout before it reaches Payroll or Finance. Strict schemas catch the "extra field nobody told us about" problem.

### 3.6 `test-data/`: factories and static data

There are two kinds of test data:

| Kind                                 | Where                                                          | Used for                                                                    |
| ------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Factories** (generated with Faker) | `test-data/factories/{area}/`                                  | Happy-path data that's unique on every run, so parallel tests don't collide |
| **Static sets**                      | `test-data/static/{area}/` and `static/util/invalid-values.ts` | Curated negative cases, such as invalid emails or bad logins                |

A factory, `test-data/factories/app/user.factory.ts`:

```ts
export const generateLoginCredentials = (
    overrides?: Partial<{ email: string; password: string }>
): { email: string; password: string } => {
    return {
        email: overrides?.email ?? faker.internet.email(),
        password:
            overrides?.password ?? faker.internet.password({ length: 12 }),
    };
};
```

Static data, `test-data/static/app/invalidCredentials.ts`:

```ts
export const INVALID_LOGIN_ATTEMPTS = [
    {
        description: 'valid email with wrong password',
        email: 'test.user@example.com',
        password: 'WrongPassword123!',
        expectedErrors: ['invalid-credentials'],
    },
    // ...
] as const;
```

> 🟦 **TypeScript lesson 11: `Partial<T>`, `?.` and `??`**
>
> - `Partial<T>` is a built-in **utility type**: the same shape as `T` but with every property optional. It's perfect for "override only what you need".
> - `overrides?.email` is **optional chaining**: if `overrides` is `undefined`, it gives `undefined` instead of crashing.
> - `a ?? b` is **nullish coalescing**: use `a` unless it's `null` or `undefined`, otherwise use `b`.
> - `{ ...defaultUser, ...overrides }` is the **spread operator**: copy all the properties, with later ones winning.

> 🟦 **TypeScript lesson 12: `as const`**
> Without `as const`, TypeScript sees `expectedErrors` as `string[]`. With it, TypeScript knows the **exact** values (`'invalid-credentials'`, `'email-format'`…) and makes everything `readonly`. The login spec uses this to guarantee every error kind is handled. Add a new kind to the data and forget to handle it, and the code stops compiling.

**Rules:** static data is `.ts` with `as const`, never `.json`. Text that a test creates (names, labels) comes from factories, never hardcoded.

### 3.7 `tests/`: specs that read like requirements

`tests/app/functional/login.spec.ts` (shortened):

```ts
import { expect, test } from '../../../fixtures/pom/test-options';

test.describe('functional login', () => {
    test.beforeEach(async ({ resetStorageState, appPage }) => {
        await resetStorageState();
        await appPage.openLoginPage();
    });

    test(
        'should login successfully with valid credentials',
        { tag: '@smoke' },
        async ({ appPage }) => {
            await test.step('WHEN user enters valid credentials', async () => {
                await appPage.login(
                    process.env.APP_EMAIL!,
                    process.env.APP_PASSWORD!
                );
            });

            await test.step('THEN user should see username displayed', async () => {
                await expect(appPage.username).toBeVisible();
            });
        }
    );

    for (const {
        description,
        email,
        password,
        expectedErrors,
    } of INVALID_LOGIN_ATTEMPTS) {
        test(
            `should show error for invalid credentials - ${description}`,
            { tag: '@regression' },
            async ({ appPage }) => {
                /* ... */
            }
        );
    }
});
```

What to notice:

- **`async ({ appPage })`**: the page object is _injected_. There's no `new` anywhere.
- **Given / When / Then steps** make the HTML report read like a business scenario.
- **Exactly one tag per test**: `@smoke`, `@sanity`, `@regression`, `@e2e`, `@api` or `@destructive`. Tags never go on `describe`.
- **Web-first assertions**: `await expect(locator).toBeVisible()` retries automatically until it passes or times out. That's why hard waits are never needed.
- **Data-driven loop**: one test per row of static data, using `for...of` with destructuring.

> 🟦 **TypeScript lesson 13: template literals and `for...of`**
>
> - Backtick strings like `` `...${description}` `` are **template literals**. `${...}` inserts a value.
> - `for (const x of list)` loops over each item. Combined with destructuring, it pulls the fields of each row straight out.

### 3.8 `helpers/` and authentication setup

Logging in through the UI for every test is slow. Instead, **setup projects** log in once per run and save the session:

- `tests/app/auth.setup.ts` signs in through the browser and saves cookies and storage to `.auth/app/appStorageState.json`.
- `tests/app/auth-api.setup.ts` gets an API token and saves it to `.auth/app/apiAccessToken.json`.

`playwright.config.ts` wires them up as **projects with dependencies**:

```ts
projects: [
    { name: 'setup-api', testMatch: /auth-api\.setup\.ts$/ },
    { name: 'setup-ui', testMatch: /auth\.setup\.ts$/ },
    {
        name: 'api',
        testMatch: /.*\/api\/.*\.spec\.ts/,
        dependencies: ['setup-api'],
    },
    {
        name: 'chromium',
        use: { storageState: StorageStatePaths.APP },
        dependencies: ['setup-api', 'setup-ui'],
    },
];
```

So API tests never open a browser, and UI tests start already signed in. The `.auth/` folder is git-ignored.

### 3.9 `playwright.config.ts`: the control panel

Key settings, and why they matter:

| Setting                | Value              | Why                                                                      |
| ---------------------- | ------------------ | ------------------------------------------------------------------------ |
| `fullyParallel`        | `true`             | Speed. This is why test isolation matters                                |
| `retries`              | 2 on CI, 0 locally | Retries mask flakiness locally, so they're only used on CI               |
| `forbidOnly`           | on CI              | A forgotten `test.only` fails the build                                  |
| `trace`                | `on-first-retry`   | A full time-travel debug trace when something flakes                     |
| `screenshot` / `video` | on failure         | Evidence for defect triage                                               |
| `testIdAttribute`      | `'data-test'`      | Matches the app's test-id attribute. **You'll change this for your app** |

---

## Part 4: How a feature gets built, end to end

This is the workflow you'll practise in Guide 3. Suppose you say to the AI: _"Add tests for the room booking form."_

```
You ──► AI loads ai-native-workflow
          │
          ├─ 1. Classify: codegen (page object + spec)
          ├─ 2. Route: page-objects → selectors → fixtures → test-standards
          ├─ 3. Explore: playwright-cli opens the real page, records roles,
          │              labels and exact validation messages
          ├─ 4. Proposal + Confidence 8/10, Unknowns: none
          │
You ──► Approve (the human gate)
          │
          ├─ 5. Apply: write enum entries → page object → register fixture → spec
          │       (the hook blocks any XPath / hard wait / any / hardcoded URL)
          ├─ 6. Verify: npm run lint, then npx playwright test <file>
          └─ 7. Report: files changed, lint and test status; asks before committing
          │
You ──► Review for value (the 3 questions) ──► commit ──► CI runs
```

---

## Part 5: Glossary

| Term                    | Meaning                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Agentic testing**     | An AI agent explores, plans and writes tests within rules you set, and a human approves    |
| **Constitution**        | `AGENTS.md`: the MUST / SHOULD / WON'T rules every AI tool reads                           |
| **Skill**               | A focused instruction pack (`SKILL.md`) the AI loads only when relevant                    |
| **Hook**                | A script Claude Code runs automatically before a file write, and which can block the write |
| **Confidence gate**     | The AI must score its plan from 1 to 10 and stop to ask below 5                            |
| **Page Object (POM)**   | A class that wraps one screen of the app                                                   |
| **Fixture**             | Something Playwright creates and injects into a test (page objects, the API client)        |
| **Web-first assertion** | An `expect` that retries until the condition is true, with no hard waits                   |
| **Zod schema**          | A run-time description of valid JSON, used to validate API responses                       |
| **Factory**             | A function that generates fresh, valid test data with Faker                                |
| **Storage state**       | A saved login session (cookies and storage) reused across tests                            |

---

## Part 6: Exercises (about 30 minutes)

Do these by reading the reference repo on GitHub. Answers are at the bottom, so try first.

1. **Spot the violations.** List every Constitution rule this test breaks:
    ```ts
    import { test, expect } from '@playwright/test';
    test.describe('search @regression', () => {
        test('search', async ({ page }) => {
            const home = new HomePage(page);
            await page.goto('https://practicesoftwaretesting.com');
            await page.locator('//input[@id="search"]').fill('pliers');
            await page.waitForTimeout(3000);
            const count: any = await page.locator('.card').count();
            expect(count > 0).toBe(true);
        });
    });
    ```
2. **TypeScript.** In `constructor(private readonly page: Page)`, what do `private` and `readonly` each prevent?
3. **TypeScript.** What's the difference between `process.env.APP_URL!` and `process.env.ENVIRONMENT ?? 'dev'`? When would you prefer the second?
4. **Design.** Why does the framework need **both** a TypeScript type (`UserResponse`) **and** a Zod schema (`UserResponseSchema`)?
5. **Design.** Your app changes the error text from "Invalid email or password" to "Incorrect credentials". How many files do you change, and which one?
6. **Workday thinking.** Write down one test idea for an HR system where a strict schema would catch a real business problem. (Hint: think about what downstream Payroll needs.)

<details>
<summary>Answers</summary>

1. It imports from `@playwright/test` (it should use `fixtures/pom/test-options`), puts a tag on `describe`, has no tag on the test, uses `new HomePage(page)` (no manual instantiation), hardcodes a URL, uses XPath, uses `waitForTimeout`, uses `any`, uses a non-web-first assertion (`expect(count > 0).toBe(true)`), has no Given/When/Then steps, and has a vague test name.
2. `private` stops code outside the class (for example, tests) from using `appPage.page` directly, so tests go through the page object's methods. `readonly` stops anyone reassigning `this.page` to a different page.
3. `!` asserts the value exists and crashes later if it doesn't. `?? 'dev'` gives a safe default. Prefer `??` when a sensible default exists, and `!` only for values that _must_ be configured (and are then checked early).
4. Types are erased at run time and only check your code. Zod checks the real API response at run time. Deriving the type from the schema means you define the shape once.
5. One: `enums/app/app.ts` (`Messages.LOGIN_ERROR`). Every page object and test that uses it updates automatically.
6. Example: "GET employee record returns `payGroup` and `costCentre` as non-empty strings and no unexpected fields". A missing cost centre would break Finance allocation downstream, and a strict schema fails the test immediately.

</details>

---

## What's next

**Practice app for this series:** [Restful Booker Platform](https://automationintesting.online), a hotel booking site with a public admin panel and a documented REST API. It was built for people to practise test automation on.

**Guide 2: Setup and the starter repo.** We'll scaffold the framework into your GitHub repo with `npm create agentic-playwright@latest . -- --demo`, get the demo smoke test passing, look around the generated files with this guide in hand, and switch on GitHub Actions so tests run on every push.
