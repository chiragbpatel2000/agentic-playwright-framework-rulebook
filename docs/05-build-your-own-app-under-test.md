# Guide 5: Your Own App Under Test (Willow Lodge)

> Series: Building an Agentic Playwright Test Automation Framework
> Previous: [Guide 4: Make it presentable](04-make-it-presentable.md)
> App under test: **Willow Lodge**, a small B&B booking app that lives in [`booking-app/`](../booking-app) of this repo.

## Why build your own app?

Guide 3 points the framework at a public demo site. That works, but a shared demo has three problems:

1. **It isn't yours.** Other testers change its data, it resets on its own schedule, and some networks (including some CI and cloud sandboxes) block it.
2. **You can't see inside it.** When a test fails you can only guess whether the bug is in the test or the app.
3. **It's a weaker story.** "I built the system under test _and_ the framework that tests it" is a much stronger line on a CV than "I tested a demo site".

Willow Lodge has the same features as a typical B&B demo, with its own name, look and code:

| Area           | What a guest or admin can do                                                         |
| -------------- | ------------------------------------------------------------------------------------ |
| Front page     | See the rooms, open a room, send the contact form                                    |
| Room page      | Read the details, pick check-in and check-out on a calendar, book the room           |
| Admin login    | Log in with an email and password (from your env file)                               |
| Admin rooms    | List, add, edit and delete rooms                                                     |
| Admin bookings | See every booking and cancel one                                                     |
| Admin messages | Read contact messages, mark them as read, delete them; an unread badge in the header |
| REST API       | Everything above, documented in an OpenAPI 3.1 file at `/api/openapi.json`           |

**Time:** 30 minutes to run it and look around, then as long as you like reading the code.

---

## Step 1: Run it (5 minutes)

From the repo root:

```bash
git pull
npm run app:install      # installs booking-app's own packages (express, zod, tsx, esbuild)
cp booking-app/.env.example booking-app/.env
npm run app:start
```

Open <http://localhost:3000>. Then:

1. Click **Book this room** on any room, go to next month, click a check-in day and a check-out day, fill in the form and press **Reserve**.
2. Scroll the front page to **Get in touch** and press **Send message** with the form empty. Note the validation messages, then send a real one.
3. Go to <http://localhost:3000/admin> and log in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `booking-app/.env`.
4. Visit **Rooms**, **Bookings** and **Messages**. Your booking and your message are there.
5. Open <http://localhost:3000/api/openapi.json>. That's the API contract your API tests will be built from.

Stop the app with `Ctrl+C`. All data is in memory, so restarting it gives you the seed data again: three rooms and two bookings, with dates relative to today.

Also try the app's own self-check:

```bash
npm run app:test         # type-checks the app and runs 7 quick API tests
```

---

## Step 2: How the code is organised

```text
booking-app/
├── shared/            Code used by BOTH the server and the browser
│   ├── schemas.ts     Zod schemas = validation rules + TypeScript types
│   └── dates.ts       "YYYY-MM-DD" date helpers
├── src/               The server (Node + Express), run directly by tsx
│   ├── server.ts      Entry point: load config, start listening
│   ├── app.ts         Builds the Express app: API routes, then pages
│   ├── config.ts      Reads and checks environment variables
│   ├── store.ts       The in-memory "database" (a class with arrays)
│   ├── seed.ts        The starting data
│   ├── auth.ts        Admin sessions: token, cookie, middleware
│   ├── http.ts        parseBody / sendError helpers
│   ├── openapi.ts     The API contract, generated partly from the Zod schemas
│   └── routes/        One file per resource: rooms, bookings, messages, auth, testing
├── client/            Browser code in TypeScript, bundled by esbuild into public/js
│   ├── lib/           api() wrapper, DOM helpers, admin header
│   └── pages/         One script per page
├── public/            HTML pages and the stylesheet
└── test/api.test.ts   The app's own quick self-check (Node's built-in test runner)
```

**Follow one request through the code.** When a guest presses **Send message**:

1. `client/pages/home.ts` builds a `MessageInput` object and calls `api('/api/messages', { method: 'POST', body })`.
2. `src/routes/messages.ts` receives it and calls `parseBody(MessageInputSchema, req, res)`.
3. If Zod finds problems, `src/http.ts` answers **400** with `{ error, fields: [{ field, message }] }`, and the page shows each message in a `role="alert"` box.
4. If it's valid, `store.createMessage()` saves it and the route answers **201**. The page shows a thank-you in a `role="status"` box.

Read those four files in that order. It's about 150 lines and it's the whole pattern of the app.

> 🟦 **TypeScript lesson 20: one Zod schema, two jobs**
>
> ```ts
> export const MessageInputSchema = z.strictObject({
>     name: z.string().trim().min(1, 'Name is required').max(50, '...'),
>     email: z.email({ error: 'Enter a valid email address' }),
>     // ...
> });
> export type MessageInput = z.infer<typeof MessageInputSchema>;
> ```
>
> The server uses the schema at **run time** (`safeParse` the request body). The browser uses the **type** at **compile time**: `const message: MessageInput = {...}` won't compile if you misspell a field. One definition, so the rules and the types can't drift apart. Your framework's `fixtures/api/schemas/` does the same thing from the testing side.

> 🟦 **TypeScript lesson 21: `import type` and code shared with the browser**
> `client/pages/home.ts` says `import type { MessageInput } from '../../shared/schemas.ts'`. `import type` brings in **only the type**, which disappears when the code is compiled, so Zod is never shipped to the browser. `shared/dates.ts` is imported normally because the browser really runs those functions. esbuild follows the imports and bundles them into `public/js/home.js`.

> 🟦 **TypeScript lesson 22: `X | undefined` as a return type**
>
> ```ts
> getRoom(id: number): Room | undefined {
>     return this.rooms.find((room) => room.id === id);
> }
> ```
>
> The return type says "you might not get a room". With `strict` on, TypeScript **won't let you** use `room.name` until you've checked `if (!room)`. That's why every route has a `404` line: the compiler made us think about it. Compare with lesson 11 (`?.` and `??`).

> 🟦 **TypeScript lesson 23: generics you write yourself**
>
> ```ts
> export function parseBody<T extends z.ZodType>(
>     schema: T,
>     req: Request,
>     res: Response
> ): z.infer<T> | undefined;
> ```
>
> `T` is "whatever schema you pass". `extends z.ZodType` limits it to Zod schemas, and `z.infer<T>` makes the return type follow along. So `parseBody(RoomInputSchema, ...)` returns a `RoomInput`, and `parseBody(BookingInputSchema, ...)` returns a `BookingInput`, from one function. In the browser, `api<Room>('/api/rooms/1')` is the same idea. Lesson 7 showed you how to **read** generics; this is how to **write** one.

> 🟦 **TypeScript lesson 24: utility types `Pick` and `Omit`**
> `type BookedRange = Pick<Booking, 'checkIn' | 'checkOut'>` makes a new type with only those two fields. That's what the public calendar endpoint returns: dates, never guest details. `Omit<BookingInput, 'roomId'>` (in `seed.ts`) is the opposite: everything except `roomId`. Both build types **from** other types, so a change to `Booking` flows through automatically.

> 🟦 **TypeScript lesson 25: classes with `private` state**
> `Store` keeps `rooms`, `bookings` and `messages` as `private` arrays. Routes can only change data through methods such as `createBooking()`, so there's one place to add a rule (for example the clash check). It's the same reason your page objects hide locators behind action methods.

> 🟦 **TypeScript lesson 26: typing the DOM**
>
> ```ts
> export function el<K extends keyof HTMLElementTagNameMap>(tag: K, ...): HTMLElementTagNameMap[K]
> ```
>
> `HTMLElementTagNameMap` is a built-in type that maps `'button'` to `HTMLButtonElement`, `'a'` to `HTMLAnchorElement`, and so on. So `el('button')` is typed as a button and `.disabled` autocompletes. Same pattern as lesson 18 (indexed access types), used for something real.

### Things built in for testers

| Feature                                                                             | Why it helps your tests                                                                        |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Every input has a `<label>`                                                         | `getByLabel('Email')` works, the top of the selector order after roles                         |
| Errors use `role="alert"`, success uses `role="status"`                             | `getByRole('alert')` and `getByRole('status')` find feedback without CSS selectors             |
| Buttons have specific names: `Delete Garden Room`, `Cancel booking for Ada Fenwick` | `getByRole('button', { name: ... })` picks the right row with no `nth()`                       |
| Calendar days are buttons named like `5 Dec 2026, booked`                           | You can pick a date by its accessible name; booked and past days are disabled                  |
| `POST /api/testing/reset` (only when `ENABLE_TEST_RESET=true`)                      | Puts the seed data back. Use it in a global setup, **not** between parallel tests (see Step 4) |
| `Bearer` token **or** cookie for admin                                              | API tests send a header; UI tests reuse the browser's storage state                            |
| Strict request bodies                                                               | An unknown field is a 400 with `Unknown field: x`, great for negative tests                    |
| Field-by-field 400s                                                                 | Matches the Constitution rule **No Empty-Body-Only 400**: you can test each field's message    |

---

## Step 3: Point the framework at Willow Lodge

Create `env/.env.dev` (it's git-ignored):

```bash
APP_URL=http://localhost:3000
API_URL=http://localhost:3000
APP_EMAIL=admin@willowlodge.test
APP_PASSWORD=pick-any-password
```

That's it for the app's settings. `playwright.config.ts` notices that `APP_URL` is on `localhost` and, through its `webServer` setting, **starts Willow Lodge before the tests and stops it afterwards**. It also passes `APP_EMAIL` and `APP_PASSWORD` to the app as its admin login, so the credentials live in exactly one file. If the app is already running (`npm run app:start` in another terminal), Playwright reuses it, which is handy while you explore with `playwright-cli`.

> 🟦 **TypeScript lesson 27: a conditional config value**
>
> ```ts
> const localAppServer = runsLocalApp ? { command: 'npm --prefix booking-app start', ... } : undefined;
> ```
>
> The ternary (`condition ? a : b`) picks a whole object or `undefined`. Playwright's `webServer` option accepts either, so pointing `APP_URL` back at a remote site switches the local app off with no other change.

### Use Guide 3, with these differences

Work through [Guide 3](03-point-it-at-the-booking-app.md) from Step 1 as written, but read every `automationintesting.online` as `http://localhost:3000`, and keep these differences in mind:

| Guide 3 says                                          | For Willow Lodge                                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "The admin login uses a username, not an email"       | It **is** an email: keep `APP_EMAIL`. No rename needed                                                   |
| "Confirm the public admin password on the page"       | It's whatever you put in `env/.env.dev`                                                                  |
| "The site is shared and resets itself"                | It's yours. Data resets when the app restarts, or on `POST /api/testing/reset`                           |
| "The OpenAPI document, if the platform publishes one" | It does: `http://localhost:3000/api/openapi.json`. **No live-capture flag needed**                       |
| API login body `{ username, password }`?              | `POST /api/auth/login` with `{ email, password }` returns `{ token }` and sets a `willow_session` cookie |
| Rooms list `GET /api/room`?                           | `GET /api/rooms` returns `{ rooms: [...] }`                                                              |
| Step 7: CI against a public site                      | See Step 5 below: CI starts the app itself                                                               |

In **Prompt 1**, replace the first two lines with:

```text
We are switching this scaffold from the demo shop (practicesoftwaretesting.com) to
Willow Lodge, our own booking app in booking-app/. It runs at http://localhost:3000, and
playwright.config.ts already starts it when APP_URL is on localhost. Its API contract is
at http://localhost:3000/api/openapi.json. The area folder stays "app".
```

and drop the line about the username. Everything else (explore with `playwright-cli`, Proposal with Confidence, you review) stays the same. The AI must still **look** at the app before writing selectors, even though you have the source code. That's the habit you're building.

> **Tip:** tell the AI not to read `booking-app/` source to invent selectors or messages. Black-box tests built from what the app **shows** and what the **contract** says catch more bugs than tests copied from the code.

---

## Step 4: Test ideas beyond Guide 3

Once Guide 3's six tests are green, these make the suite (and your portfolio) much stronger. Feed them to the AI one at a time with the same prompt pattern.

| #   | Test                                                                     | Type | Tag           | What it shows                                    |
| --- | ------------------------------------------------------------------------ | ---- | ------------- | ------------------------------------------------ |
| 7   | A guest books a room through the calendar and sees "Booking confirmed"   | UI   | `@e2e`        | A full user journey across two pages             |
| 8   | Booked days are disabled on the calendar                                 | UI   | `@regression` | Data set up through the API, checked in the UI   |
| 9   | Booking the same dates twice returns 409                                 | API  | `@api`        | Business rules, not just status codes            |
| 10  | Check-out day is free for the next guest                                 | API  | `@api`        | A boundary value                                 |
| 11  | Admin adds, edits and deletes a room                                     | UI   | `@regression` | CRUD with cleanup in `afterEach`                 |
| 12  | A new contact message raises the unread badge; marking it read clears it | UI   | `@e2e`        | Front end and admin connected                    |
| 13  | Every admin endpoint returns 401 without a token                         | API  | `@api`        | Security coverage, data-driven from a static set |
| 14  | Each room field's validation message, one field at a time                | API  | `@api`        | The **No Empty-Body-Only 400** rule in practice  |

**About cleanup and parallel tests:** `POST /api/testing/reset` wipes everything, including data another test running at the same time just created. So don't call it in `beforeEach`. Each test should **delete what it created** (State Cleanup rule). If you want a clean start for the whole run, call reset once from a setup project.

> **Workday angle:** tests 9, 10 and 14 are the same thinking as validating an inbound integration: business-rule rejections, boundary dates and field-level error messages. Test 8 is "load data through the API, check it in the UI", which is exactly how you'd verify a Workday EIB load landed correctly.

---

## Step 5: Run it in CI

The `booking-app` job in `.github/workflows/playwright.yml` already type-checks the app and runs its self-test on every push. To run **your framework tests** against it in CI too, ask the AI:

```text
Task: run the framework suite against Willow Lodge in .github/workflows/playwright.yml.
- APP_URL and API_URL are http://localhost:3000 (not secret, inline is fine).
- APP_EMAIL and APP_PASSWORD come from repository secrets.
- Install the app's packages with `npm run app:install` before the tests;
  playwright.config.ts starts the app through webServer.
- Run the full suite on Chromium, excluding @destructive, and upload the HTML report on every run.
Proposal first.
```

Then add `APP_EMAIL` and `APP_PASSWORD` as secrets (**Settings → Secrets and variables → Actions**). The password can be anything, since CI creates a fresh app with it; keeping it a secret is about practising the habit.

---

## Step 6: Practise TypeScript by changing the app

Small changes to the app teach more TypeScript than reading. Try these yourself first, then ask the AI to review your change.

1. **Add a field end to end.** Add `breakfastIncluded: z.boolean()` to `RoomInputSchema`. Run `npm --prefix booking-app run typecheck` and follow every error: the seed data, the admin form and the room card. That's TypeScript guiding a change through a codebase.
2. **Add a rule.** Bookings can be at most 14 nights. Add a second `.refine()` to `BookingInputSchema`, then a self-test in `booking-app/test/api.test.ts`.
3. **Plant a bug on purpose.** Change `rangesOverlap` in `shared/dates.ts` to use `<=`. Which of your framework tests catch it? If none do, you've found a gap in your suite (test 10 above). Undo it afterwards.

Number 3 is a great LinkedIn post: _"I planted a bug in my own app to check my tests would catch it. They didn't. Here's what I added."_

---

## Checklist

- [ ] `npm run app:start` shows Willow Lodge at <http://localhost:3000>
- [ ] `npm run app:test` is green
- [ ] `env/.env.dev` points at `http://localhost:3000` and is **not** in `git status`
- [ ] Guide 3's prompts adapted with the differences table
- [ ] At least one test from Step 4 added and green

## What's next

Update the README's "What it tests" section (Guide 4) to say the framework tests **an app you built**, link the `booking-app/` folder, and add a screenshot of the room page and the HTML report side by side.
