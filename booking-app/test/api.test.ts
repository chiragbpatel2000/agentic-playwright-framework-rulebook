/**
 * The app's own quick self-check, with Node's built-in test runner
 * (`npm test`). It proves the API behaves before the Playwright framework
 * tests it properly from the outside.
 */
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, it } from 'node:test';
import { addDays, today } from '../shared/dates.ts';
import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';

const config = loadConfig({
    PORT: '3999', // not used: the test listens on a random free port
    ADMIN_EMAIL: 'admin@test.local',
    ADMIN_PASSWORD: 'test-only-password',
    ENABLE_TEST_RESET: 'true',
});

let baseUrl = '';
let close: () => void = () => undefined;

before(() => {
    const server = createApp(config).listen(0);
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
    close = () => server.close();
});
after(() => close());
beforeEach(async () => {
    await fetch(`${baseUrl}/api/testing/reset`, { method: 'POST' });
});

async function call(
    path: string,
    method = 'GET',
    body?: unknown,
    token?: string
): Promise<{ status: number; body: unknown }> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
        status: res.status,
        body: res.status === 204 ? undefined : await res.json(),
    };
}

async function login(): Promise<string> {
    const { body } = await call('/api/auth/login', 'POST', {
        email: config.ADMIN_EMAIL,
        password: config.ADMIN_PASSWORD,
    });
    return (body as { token: string }).token;
}

const guest = {
    firstName: 'Jo',
    lastName: 'Bloggs',
    email: 'jo@example.com',
    phone: '07700900999',
};

describe('Willow Lodge API', () => {
    it('lists the three seed rooms', async () => {
        const { status, body } = await call('/api/rooms');
        assert.equal(status, 200);
        assert.equal((body as { rooms: unknown[] }).rooms.length, 3);
    });

    it('rejects bad admin credentials', async () => {
        const { status } = await call('/api/auth/login', 'POST', {
            email: config.ADMIN_EMAIL,
            password: 'nope',
        });
        assert.equal(status, 401);
    });

    it('protects admin endpoints', async () => {
        assert.equal((await call('/api/bookings')).status, 401);
        assert.equal(
            (await call('/api/bookings', 'GET', undefined, await login()))
                .status,
            200
        );
    });

    it('books free dates and refuses a clash', async () => {
        const stay = {
            roomId: 2,
            ...guest,
            checkIn: addDays(today(), 20),
            checkOut: addDays(today(), 22),
        };
        assert.equal((await call('/api/bookings', 'POST', stay)).status, 201);
        assert.equal((await call('/api/bookings', 'POST', stay)).status, 409);
    });

    it('lets the next guest arrive on check-out day', async () => {
        const first = {
            roomId: 2,
            ...guest,
            checkIn: addDays(today(), 30),
            checkOut: addDays(today(), 32),
        };
        const next = {
            ...first,
            checkIn: first.checkOut,
            checkOut: addDays(first.checkOut, 1),
        };
        assert.equal((await call('/api/bookings', 'POST', first)).status, 201);
        assert.equal((await call('/api/bookings', 'POST', next)).status, 201);
    });

    it('validates the contact form field by field', async () => {
        const { status, body } = await call('/api/messages', 'POST', {});
        assert.equal(status, 400);
        const fields = (
            body as { fields: Array<{ field: string }> }
        ).fields.map((f) => f.field);
        assert.deepEqual(fields, [
            'name',
            'email',
            'phone',
            'subject',
            'description',
        ]);
    });

    it('creates a room as admin, then deletes it', async () => {
        const token = await login();
        const room = {
            name: 'Test Room',
            type: 'Single',
            pricePerNight: 50,
            maxGuests: 1,
            accessible: false,
            features: [],
            description: 'A room made by a test.',
        };
        const created = await call('/api/rooms', 'POST', room, token);
        assert.equal(created.status, 201);
        const id = (created.body as { id: number }).id;
        assert.equal(
            (await call(`/api/rooms/${id}`, 'DELETE', undefined, token)).status,
            204
        );
        assert.equal((await call(`/api/rooms/${id}`)).status, 404);
    });
});
