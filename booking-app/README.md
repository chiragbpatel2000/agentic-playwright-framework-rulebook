# Willow Lodge

A small B&B booking app, built as the **application under test** for this repo's agentic Playwright framework. Guests browse rooms, book dates on a calendar and send a contact form; an admin manages rooms, bookings and messages. Everything is also a REST API, documented in OpenAPI 3.1.

**Stack:** Node 22+, TypeScript, Express 5, Zod, esbuild. Data lives in memory, so there's no database to install.

## Run it

```bash
npm ci
cp .env.example .env      # set your own admin email and password
npm start                 # http://localhost:3000
```

From the repo root, `npm run app:install` and `npm run app:start` do the same. When the framework's `APP_URL` is `http://localhost:3000`, `npx playwright test` starts the app for you.

| Script              | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm start`         | Bundles the browser code, then starts the server      |
| `npm run dev`       | The same, restarting when a server file changes       |
| `npm run typecheck` | Type-checks server, browser and shared code           |
| `npm test`          | Quick API self-check with Node's built-in test runner |

## Pages

| Path              | Who   | What                                    |
| ----------------- | ----- | --------------------------------------- |
| `/`               | Guest | Rooms and the contact form              |
| `/rooms/:id`      | Guest | Room details, booking calendar and form |
| `/admin`          | Admin | Log in                                  |
| `/admin/rooms`    | Admin | List, add, edit and delete rooms        |
| `/admin/bookings` | Admin | List and cancel bookings                |
| `/admin/messages` | Admin | Read, mark as read and delete messages  |

## API

The full contract is served at `/api/openapi.json`. Admin endpoints accept `Authorization: Bearer <token>` or the `willow_session` cookie, both from `POST /api/auth/login`.

| Method and path                   | Auth  | Result                                      |
| --------------------------------- | ----- | ------------------------------------------- |
| `GET /api/health`                 |       | 200                                         |
| `POST /api/auth/login`            |       | 200 `{ token }`, 400, 401                   |
| `POST /api/auth/logout`           |       | 204                                         |
| `GET /api/auth/me`                | Admin | 200, 401                                    |
| `GET /api/rooms`                  |       | 200 `{ rooms }`                             |
| `GET /api/rooms/:id`              |       | 200, 400, 404                               |
| `GET /api/rooms/:id/booked-dates` |       | 200 `{ booked }`, 400, 404                  |
| `POST /api/rooms`                 | Admin | 201, 400, 401                               |
| `PUT /api/rooms/:id`              | Admin | 200, 400, 401, 404                          |
| `DELETE /api/rooms/:id`           | Admin | 204, 400, 401, 404                          |
| `POST /api/bookings`              |       | 201, 400, 404, 409 (dates taken)            |
| `GET /api/bookings`               | Admin | 200 `{ bookings }`, 401                     |
| `DELETE /api/bookings/:id`        | Admin | 204, 400, 401, 404                          |
| `POST /api/messages`              |       | 201, 400                                    |
| `GET /api/messages`               | Admin | 200 `{ messages }`, 401                     |
| `GET /api/messages/unread-count`  | Admin | 200 `{ count }`, 401                        |
| `PATCH /api/messages/:id/read`    | Admin | 200, 400, 401, 404                          |
| `DELETE /api/messages/:id`        | Admin | 204, 400, 401, 404                          |
| `POST /api/testing/reset`         |       | 204 when `ENABLE_TEST_RESET=true`, else 404 |

Errors always look like `{ "error": "Validation failed", "fields": [{ "field": "email", "message": "Enter a valid email address" }] }`.

A walkthrough of the code, with TypeScript lessons, is in [Guide 5](../docs/05-build-your-own-app-under-test.md).

Willow Lodge is a fictional B&B. No real bookings are made.
