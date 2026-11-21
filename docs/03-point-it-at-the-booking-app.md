# Guide 3: Point the Framework at the Booking App

> Series: Building an Agentic Playwright Test Automation Framework
> Previous: [Guide 2: Setup, first green run and CI](02-setup-and-starter-repo.md)
> App under test: [Restful Booker Platform](https://automationintesting.online), a hotel booking demo built for practising test automation.
> Prefer an app you own and run locally? Use [Guide 5](05-build-your-own-app-under-test.md) (Willow Lodge) alongside this guide.

## What you will build

By the end of this guide your framework tests the booking app instead of the demo shop. You'll have:

| #   | Test                                                           | Type            | Tag           |
| --- | -------------------------------------------------------------- | --------------- | ------------- |
| 1   | Admin can log in and reach the rooms dashboard                 | UI              | `@smoke`      |
| 2   | Admin login rejects bad credentials                            | UI, data-driven | `@regression` |
| 3   | A guest can send the contact form and sees a thank-you message | UI              | `@regression` |
| 4   | The contact form shows each validation message                 | UI, data-driven | `@regression` |
| 5   | `GET` rooms returns a list that matches a strict schema        | API             | `@api`        |
| 6   | Auth login returns a token, and bad credentials are rejected   | API             | `@api`        |

More importantly, you'll build them **the agentic way**: you explore, the AI proposes with a confidence score, you approve, the AI writes, the guards check, and **you review for value**.

**Time:** 2 to 3 hours, spread over a couple of sessions if you like.

> **Ground rule for this guide:** never accept a selector, message text, endpoint or field name the AI didn't see with its own eyes, through `playwright-cli` or the API contract. The Constitution calls this _Explore Before Generate_, and it's the habit that separates a robust framework from a flaky one.

---

## Step 0: Start a branch

```bash
cd agentic-playwright-framework-rulebook
git checkout main && git pull
git checkout -b feat/booking-app
```

All of Guide 3 happens on this branch. At the end you'll open **one pull request**, which is great portfolio evidence.

---

## Step 1: Explore the app yourself first (20 minutes)

Before the AI touches anything, learn the app as a tester would. Open it in your normal browser, then with `playwright-cli` to see what the AI will see.

### 1.1 Click around

1. **Front page:** <https://automationintesting.online>. Find the room list, the booking flow and the **contact form** near the bottom.
2. **Admin:** <https://automationintesting.online/admin>. The demo's public admin login is shown on the site (traditionally `admin` / `password`). **Confirm it on the page.** Don't trust this guide or the AI on it.
3. After logging in, look at the **Rooms**, **Messages** and **Report** areas.

> The site is shared by testers worldwide and **resets itself regularly**. Expect other people's rooms and messages to appear. Your tests must not depend on data they didn't create.

### 1.2 Look at it the way the AI does

```bash
playwright-cli open https://automationintesting.online
playwright-cli snapshot
```

The snapshot is the **accessibility tree**: each element's _role_ (button, textbox, heading) and _accessible name_. That's exactly what `getByRole()` and `getByLabel()` use. Scroll the output and find the contact form fields.

Now try the admin page:

```bash
playwright-cli goto https://automationintesting.online/admin
playwright-cli snapshot
playwright-cli close
```

### 1.3 Find the API

Open your browser's **DevTools → Network** tab, tick **Fetch/XHR**, and reload the front page. You'll see calls such as `/api/room` and `/api/branding`. Log in to admin and you'll see an auth call. Note:

- each URL path,
- the request body (for login),
- the response body shape,
- how the login is remembered (a cookie? a header?).

Also check whether the platform publishes **OpenAPI/Swagger** documentation. The Constitution says API schemas are built **from the contract when one exists**, and from live capture only when none exists (and then flagged as such).

### 1.4 Write down what you found

Keep a scratch note (don't commit it), for example:

| Thing                    | What I saw                                                      |
| ------------------------ | --------------------------------------------------------------- |
| Admin login fields       | ... label ..., ... label ..., button "..."                      |
| Success after login      | heading / link "..."                                            |
| Login error text         | "..."                                                           |
| Contact form fields      | Name, Email, Phone, Subject, Message (confirm the exact labels) |
| Contact success text     | "Thanks for getting in touch ..." (confirm the exact text)      |
| Contact validation texts | one per field: copy them exactly                                |
| API: rooms               | `GET /api/room` → `{ rooms: [...] }`?                           |
| API: login               | `POST /api/auth/login` body `{ username, password }` → ?        |
| Contract docs            | URL, or "none found"                                            |

You now know the app well enough to **judge** the AI's proposals. That's the point.

---

## Step 2: Switch the configuration (Prompt 1)

Open Claude Code in the repo folder (`claude`) and paste:

```text
We are switching this scaffold from the demo shop (practicesoftwaretesting.com) to
Restful Booker Platform at https://automationintesting.online. The area folder stays "app".

Task 1 only: configuration.
- Update env/.env.example with the variables this app needs (UI URL, API base URL,
  admin username, admin password). The admin login uses a username, not an email.
- Tell me exactly what to put in my local env/.env.dev (I will create it myself).
- Check playwright.config.ts testIdAttribute against the live app with playwright-cli.
- List every file that still refers to the demo shop, but do not change them yet.

Follow ai-native-workflow: explore, then give me the Proposal with Confidence and stop.
```

### What a good proposal looks like

- It **loads `ai-native-workflow`**, then `config`.
- It **runs `playwright-cli`** against the site before talking about `testIdAttribute`.
- Its **Unknowns** list is honest, for example "the API base path: is it `/api` on the same host?".
- The confidence is 7 or higher, or it stops below 5 and asks you a question.

**Answer its questions from your Step 1 notes**, then approve. Afterwards:

```bash
cp env/.env.example env/.env.dev   # then fill in the real values yourself
git status                         # env/.env.dev must NOT be listed
```

> 🟦 **TypeScript lesson 16: renaming safely across a codebase**
> When the AI renames `APP_EMAIL` to `APP_USERNAME`, TypeScript won't catch a missed `process.env.APP_EMAIL`, because every `process.env.X` is just `string | undefined`. That's why the framework reads env vars in **one place** (`config/` and the auth helper) and why you should run `grep -rn "APP_EMAIL" --include=*.ts .` after the change. **Lesson:** the type system protects you only as far as your types reach. Strings from outside (env vars, API bodies) need run-time checks, which is the same reason Zod exists.

---

## Step 3: Enums, auth setup and removing the demo examples (Prompt 2)

```text
Task 2: make authentication and constants fit the booking app.
- Replace enums/app/app.ts values with ones verified on the live app: routes (front page,
  admin), API endpoints (auth login, room, message ...), and the messages we will assert on.
  Every message string must be copied from playwright-cli output or a real API response.
- Rework helpers/app/createStorageState.ts, tests/app/auth.setup.ts and
  tests/app/auth-api.setup.ts so that:
    - setup-ui logs in to /admin once and saves the storage state;
    - setup-api gets the auth token and saves it the way this app expects it
      (find out whether it is a cookie or a header).
- Remove the demo-shop example specs, page objects and static data that no longer apply,
  and tell me which ones you removed.

Proposal with Confidence first, then stop.
```

### Review checklist for this step

- [ ] Every `Messages` value appears in your Step 1 notes, word for word.
- [ ] No URL is hardcoded: they all come from `process.env.*`, with paths from `enums/`.
- [ ] Credentials appear **only** in your local `env/.env.dev`.
- [ ] `npx tsc --noEmit` and `npm run lint` are clean.
- [ ] `npx playwright test --project=setup-api --project=setup-ui` is green.

> 🟦 **TypeScript lesson 17: why `enum` and not just a `const` object?**
> You'll see both styles in TypeScript code bases:
>
> ```ts
> export enum ApiEndpoints {
>     ROOM = '/room',
> } // enum
> export const ApiEndpoints = { ROOM: '/room' } as const; // const object
> ```
>
> Both give you autocomplete and a single source of truth. This framework uses `enum` consistently, and **consistency beats preference**, so follow the house style. In interviews, being able to explain the trade-off (enums are a TypeScript-only feature; const objects are plain JavaScript) shows real understanding.

---

## Step 4: The admin login page object and tests (Prompt 3)

```text
Task 3: admin login.
Create a page object for the admin login (and whatever the admin lands on after login),
register it as a fixture, and write tests/app/functional/admin-login.spec.ts with:
  1. @smoke: admin logs in and the rooms dashboard is visible;
  2. @regression: data-driven rejection cases from a static set in
     test-data/static/app/ (wrong password, wrong username, empty fields),
     each asserting the exact error the app shows.
The test must start signed out, even though the chromium project loads a storage state.
Explore with playwright-cli first. Proposal with Confidence, then stop.
```

### What to check in the code it writes

**The page object** (`pages/app/admin-login.page.ts` or similar):

- [ ] Locators are `get` accessors **without** JSDoc. Actions have JSDoc.
- [ ] It has **feedback locators** (the error message), not just inputs and buttons.
- [ ] Locator priority: `getByRole` / `getByLabel` first, `getByTestId` only when nothing semantic exists.
- [ ] Message text comes from `Messages.*`, never a literal.

**The spec:**

- [ ] Imports `test` and `expect` from `fixtures/pom/test-options`.
- [ ] Exactly **one tag per test**, none on `describe`.
- [ ] Uses `resetStorageState` (or a fresh context) so the login test really starts signed out.
- [ ] Given / When / Then steps.

Run it, then **break it on purpose** to prove it's a real test:

```bash
npx playwright test tests/app/functional/admin-login.spec.ts
```

Temporarily change one character of the expected error message in `enums/app/app.ts`, run again, and check the test **fails**. Then undo the change. _That's review question 1: "would this test fail if the feature broke?"_

> 🟦 **TypeScript lesson 18: indexed access types**
> In the original login spec you saw:
>
> ```ts
> kind: (typeof INVALID_LOGIN_ATTEMPTS)[number]['expectedErrors'][number];
> ```
>
> Read it from left to right: take the **type** of the array → `[number]` gives the type of **one element** → `['expectedErrors']` gives that property's type → `[number]` gives **one item** of that array. The result is the union `'invalid-credentials' | 'email-format' | ...`. It looks scary, but it's just "drilling into" a type like you'd drill into an object. Ask the AI to use the same pattern for your admin error kinds, and ask it to **explain the line back to you**.

---

## Step 5: The contact form (Prompt 4)

```text
Task 4: the front-page contact form.
Create a page object (or a component, if it is a reusable section) for the contact form and
write tests/app/functional/contact.spec.ts with:
  1. @regression: a guest submits valid details from a Faker factory in
     test-data/factories/app/ and sees the thank-you message that includes their name;
  2. @regression: data-driven validation tests: for each field, the exact validation
     message shown when it is missing or invalid, from a static set.
These tests do not need a logged-in admin. Decide how to run them signed out.
Each submitted message creates data on a shared server. Tell me whether we should
clean it up (State Cleanup rule) and how.
Explore with playwright-cli first. Proposal with Confidence, then stop.
```

### Why this one is interesting

- **Factories:** names, emails and messages must be generated (rule: _No Hardcoded Test Content_). Check the factory produces values the form **accepts**. For example, the form may have minimum lengths that `faker.lorem.word()` doesn't meet.
- **State cleanup:** each submission creates a message visible in admin. A good answer is "delete it via the API in `afterEach` using the admin token", or a clearly argued decision not to, written as a `// SCOPE` line. **This is your decision**, not the AI's.
- **Validation messages** often appear all at once. Check the test asserts the **right** message for the **right** field.

> **Workday angle:** this is the same thinking as validating an inbound integration: required fields, formats, the exact rejection message, and **not leaving test data behind in a shared tenant**. Mention it in interviews.

---

## Step 6: The API tests (Prompt 5)

```text
Task 5: API tests.
- Build strict Zod schemas (z.strictObject) for the rooms list response and the auth login
  response. Source: the OpenAPI document if the platform publishes one; otherwise capture a
  live response and flag the schema as live-captured in a comment.
- tests/app/api/rooms.spec.ts: @api, GET rooms returns 200 and matches the schema.
- tests/app/api/auth.spec.ts: @api, valid login returns 200 and a token; invalid credentials
  are rejected with the documented status, data-driven from the static set.
- Cover every documented status code, or add test.skip with // FIXME:, or leave a
  // SCOPE line for me to confirm.
Proposal with Confidence, then stop.
```

### Review checklist

- [ ] `z.strictObject()` everywhere, never `z.object()`.
- [ ] Validation is exactly `expect(Schema.parse(body)).toBeTruthy();`.
- [ ] If the live API disagrees with the contract, the test is **skipped with `// FIXME:`** and the schema is **not loosened**.
- [ ] Two or more API calls in one test means one `test.step()` per call.
- [ ] `npm run test:api` is green.

> 🟦 **TypeScript lesson 19: arrays and nested objects in Zod**
>
> ```ts
> const RoomSchema = z.strictObject({
>     roomid: z.int(),
>     roomName: z.string(),
>     type: z.enum(['Single', 'Double', 'Twin', 'Family', 'Suite']),
>     features: z.array(z.string()),
> });
> export const RoomsResponseSchema = z.strictObject({
>     rooms: z.array(RoomSchema),
> });
> export type RoomsResponse = zOutput<typeof RoomsResponseSchema>;
> ```
>
> `z.array(X)` means "a list of X", and `z.enum([...])` means "one of these exact strings". Schemas **compose** like Lego: build the item, then the list. _(These field names are an illustration. Yours must come from the contract or a real response.)_

---

## Step 7: Turn on the full suite in CI

The demo-shop CI ran API tests only. The booking app has no bot wall, so CI can run everything. Ask:

```text
Task 6: update .github/workflows/playwright.yml for the booking app.
- Read the URL and credential values from GitHub repository secrets, not inline values.
- Run the full suite (UI and API) on Chromium, excluding @destructive.
- Upload the HTML report as an artifact on every run, not only on failure.
Proposal first.
```

Then add the secrets on GitHub: **your repo → Settings → Secrets and variables → Actions → New repository secret**. Use the same names as in your `.env.example` (for example `APP_URL`, `API_URL`, `APP_USERNAME`, `APP_PASSWORD`).

> Even though the demo admin password is public, **practise the real habit**: credentials live in secrets, never in YAML. Recruiters and reviewers do look for this.

---

## Step 8: Review, commit and open the pull request

### 8.1 The final review: your job, not the AI's

For **each** test, ask the three questions from Guide 1:

1. **Would it fail if the feature broke?** (You proved this for one test in Step 4. Spot-check two more.)
2. **Is every scenario we left out recorded?** Look for `// SCOPE` lines and check you agree with them.
3. **Does it pass on a rerun?** Run the suite **three times**:

```bash
npx playwright test --repeat-each=3 --grep-invert @destructive
```

Then ask the AI for an independent check:

```text
Review the branch feat/booking-app against main.
```

That loads the `pr-reviewer` skill, which checks the branch against the Constitution and reports findings.

### 8.2 Commit in small, meaningful pieces

The Constitution says **one verified task per commit**, with Conventional Commit subjects. For example:

```bash
git add env/.env.example playwright.config.ts config/
git commit -m "chore: configure framework for Restful Booker Platform"

git add enums/ helpers/ tests/app/*.setup.ts
git commit -m "feat: admin auth setup for booking app"

git add pages/ fixtures/ tests/app/functional/admin-login.spec.ts test-data/static/app/
git commit -m "test: admin login smoke and negative tests"
# ...and so on for contact form, API and CI
```

### 8.3 Push and open the PR

```bash
git push -u origin feat/booking-app
```

On GitHub, open a pull request into `main`. In the description, write **what** you tested and **why**, and paste the confidence score from each proposal. Wait for CI to go green, then merge.

Post the PR link in our project thread and I'll review it with you.

---

## Troubleshooting

| Symptom                                          | Likely cause and fix                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| A test passes alone but fails in the full run    | Shared data or a shared login. Check test isolation, and use factories for unique data  |
| Rooms or messages from other people appear       | Normal: the site is shared. Assert on **your** data (from the factory), never on counts |
| Everything suddenly fails at 401                 | The site reset or your token expired. Re-run, because the setup projects log in again   |
| The AI's proposal has confidence 4 and questions | Working as designed. Answer from your Step 1 notes                                      |
| The hook blocks the AI's write                   | Read the rule it names. The AI must fix the content, never the hook                     |
| CI fails but local passes                        | Missing or misnamed repository secrets. Compare the names with `.env.example`           |

---

## Checklist before Guide 4

- [ ] All six tests are written, green three times in a row, and reviewed with the three questions
- [ ] At least one test was proven to fail when the feature "breaks"
- [ ] No credentials in the repo. CI reads them from secrets
- [ ] The `pr-reviewer` check found nothing important
- [ ] The PR is merged with green CI

## What's next

**Guide 4: Make it presentable.** We'll write a portfolio-grade README with an architecture diagram and a CI badge, record a short demo GIF of the AI's explore, propose and approve loop, and turn the project into a LinkedIn post and CV bullets aimed at Workday Integration and Data roles.
