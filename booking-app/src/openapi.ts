/**
 * The OpenAPI document for the Willow Lodge API, served at /api/openapi.json.
 *
 * Your test framework builds its API tests and response schemas from this
 * contract. The request-body schemas are generated from the same Zod schemas
 * the server validates with (z.toJSONSchema), so the document can't drift
 * from the code.
 */
import { z } from 'zod';
import {
    BookingInputSchema,
    LoginInputSchema,
    MessageInputSchema,
    RoomInputSchema,
} from '../shared/schemas.ts';

type JsonSchema = Record<string, unknown>;

function fromZod(schema: z.ZodType): JsonSchema {
    const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, {
        io: 'input',
    }) as JsonSchema;
    return rest;
}

/** Adds server-made fields (id, createdAt...) to an input schema. */
function withFields(
    input: JsonSchema,
    extra: Record<string, JsonSchema>
): JsonSchema {
    const properties = (input.properties ?? {}) as Record<string, JsonSchema>;
    const required = (input.required ?? []) as string[];
    return {
        ...input,
        properties: { ...extra, ...properties },
        required: [...Object.keys(extra), ...required],
    };
}

const ref = (name: string): JsonSchema => ({
    $ref: `#/components/schemas/${name}`,
});
const json = (schema: JsonSchema): JsonSchema => ({
    'application/json': { schema },
});
const ok = (description: string, schema: JsonSchema): JsonSchema => ({
    description,
    content: json(schema),
});
const error = (description: string): JsonSchema =>
    ok(description, ref('Error'));
const noContent = { description: 'Done, no body' };
const idParam = {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'integer', minimum: 1 },
};
const adminOnly = [{ bearerAuth: [] }, { cookieAuth: [] }];
const body = (name: string): JsonSchema => ({
    required: true,
    content: json(ref(name)),
});

const roomInput = fromZod(RoomInputSchema);
const bookingInput = fromZod(BookingInputSchema);
const messageInput = fromZod(MessageInputSchema);

export const openApiDocument = {
    openapi: '3.1.0',
    info: {
        title: 'Willow Lodge API',
        version: '1.0.0',
        description:
            'Rooms, bookings, contact messages and admin login for the Willow Lodge B&B. Admin endpoints need a token from POST /api/auth/login, sent as a Bearer header or the willow_session cookie.',
    },
    servers: [{ url: '/' }],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer' },
            cookieAuth: {
                type: 'apiKey',
                in: 'cookie',
                name: 'willow_session',
            },
        },
        schemas: {
            Error: {
                type: 'object',
                additionalProperties: false,
                required: ['error'],
                properties: {
                    error: { type: 'string' },
                    fields: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['field', 'message'],
                            properties: {
                                field: { type: 'string' },
                                message: { type: 'string' },
                            },
                        },
                    },
                },
            },
            LoginInput: fromZod(LoginInputSchema),
            Token: {
                type: 'object',
                additionalProperties: false,
                required: ['token'],
                properties: { token: { type: 'string' } },
            },
            RoomInput: roomInput,
            Room: withFields(roomInput, { id: { type: 'integer' } }),
            BookingInput: bookingInput,
            Booking: withFields(bookingInput, {
                id: { type: 'integer' },
                createdAt: { type: 'string', format: 'date-time' },
            }),
            BookedRange: {
                type: 'object',
                additionalProperties: false,
                required: ['checkIn', 'checkOut'],
                properties: {
                    checkIn: { type: 'string', format: 'date' },
                    checkOut: { type: 'string', format: 'date' },
                },
            },
            MessageInput: messageInput,
            Message: withFields(messageInput, {
                id: { type: 'integer' },
                read: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
            }),
        },
    },
    paths: {
        '/api/health': {
            get: {
                summary: 'Health check',
                responses: {
                    200: ok('The app is up', {
                        type: 'object',
                        additionalProperties: false,
                        required: ['status'],
                        properties: { status: { const: 'ok' } },
                    }),
                },
            },
        },
        '/api/auth/login': {
            post: {
                summary: 'Log in as admin',
                requestBody: body('LoginInput'),
                responses: {
                    200: ok(
                        'Logged in; also sets the willow_session cookie',
                        ref('Token')
                    ),
                    400: error('Missing or invalid fields'),
                    401: error('Invalid email or password'),
                },
            },
        },
        '/api/auth/logout': {
            post: { summary: 'Log out', responses: { 204: noContent } },
        },
        '/api/auth/me': {
            get: {
                summary: 'Who is logged in',
                security: adminOnly,
                responses: {
                    200: ok('The admin', {
                        type: 'object',
                        additionalProperties: false,
                        required: ['email'],
                        properties: { email: { type: 'string' } },
                    }),
                    401: error('Not logged in'),
                },
            },
        },
        '/api/rooms': {
            get: {
                summary: 'List rooms',
                responses: {
                    200: ok('All rooms', {
                        type: 'object',
                        additionalProperties: false,
                        required: ['rooms'],
                        properties: {
                            rooms: { type: 'array', items: ref('Room') },
                        },
                    }),
                },
            },
            post: {
                summary: 'Create a room',
                security: adminOnly,
                requestBody: body('RoomInput'),
                responses: {
                    201: ok('Created', ref('Room')),
                    400: error('Invalid fields'),
                    401: error('Not logged in'),
                },
            },
        },
        '/api/rooms/{id}': {
            parameters: [idParam],
            get: {
                summary: 'Get one room',
                responses: {
                    200: ok('The room', ref('Room')),
                    400: error('Bad id'),
                    404: error('Room not found'),
                },
            },
            put: {
                summary: 'Replace a room',
                security: adminOnly,
                requestBody: body('RoomInput'),
                responses: {
                    200: ok('Updated', ref('Room')),
                    400: error('Bad id or invalid fields'),
                    401: error('Not logged in'),
                    404: error('Room not found'),
                },
            },
            delete: {
                summary: 'Delete a room and its bookings',
                security: adminOnly,
                responses: {
                    204: noContent,
                    400: error('Bad id'),
                    401: error('Not logged in'),
                    404: error('Room not found'),
                },
            },
        },
        '/api/rooms/{id}/booked-dates': {
            parameters: [idParam],
            get: {
                summary: 'Booked date ranges for the calendar',
                responses: {
                    200: ok('Booked ranges; check-out day is free', {
                        type: 'object',
                        additionalProperties: false,
                        required: ['booked'],
                        properties: {
                            booked: {
                                type: 'array',
                                items: ref('BookedRange'),
                            },
                        },
                    }),
                    400: error('Bad id'),
                    404: error('Room not found'),
                },
            },
        },
        '/api/bookings': {
            get: {
                summary: 'List bookings',
                security: adminOnly,
                responses: {
                    200: ok('All bookings', {
                        type: 'object',
                        additionalProperties: false,
                        required: ['bookings'],
                        properties: {
                            bookings: { type: 'array', items: ref('Booking') },
                        },
                    }),
                    401: error('Not logged in'),
                },
            },
            post: {
                summary: 'Book a room',
                requestBody: body('BookingInput'),
                responses: {
                    201: ok('Booked', ref('Booking')),
                    400: error(
                        'Invalid fields, check-out not after check-in, or check-in in the past'
                    ),
                    404: error('Room not found'),
                    409: error('Those dates are already booked'),
                },
            },
        },
        '/api/bookings/{id}': {
            parameters: [idParam],
            delete: {
                summary: 'Cancel a booking',
                security: adminOnly,
                responses: {
                    204: noContent,
                    400: error('Bad id'),
                    401: error('Not logged in'),
                    404: error('Booking not found'),
                },
            },
        },
        '/api/messages': {
            get: {
                summary: 'List contact messages, newest first',
                security: adminOnly,
                responses: {
                    200: ok('All messages', {
                        type: 'object',
                        additionalProperties: false,
                        required: ['messages'],
                        properties: {
                            messages: { type: 'array', items: ref('Message') },
                        },
                    }),
                    401: error('Not logged in'),
                },
            },
            post: {
                summary: 'Send the contact form',
                requestBody: body('MessageInput'),
                responses: {
                    201: ok('Sent', ref('Message')),
                    400: error('Invalid fields'),
                },
            },
        },
        '/api/messages/unread-count': {
            get: {
                summary: 'Number of unread messages',
                security: adminOnly,
                responses: {
                    200: ok('The count', {
                        type: 'object',
                        additionalProperties: false,
                        required: ['count'],
                        properties: { count: { type: 'integer', minimum: 0 } },
                    }),
                    401: error('Not logged in'),
                },
            },
        },
        '/api/messages/{id}/read': {
            parameters: [idParam],
            patch: {
                summary: 'Mark a message as read',
                security: adminOnly,
                responses: {
                    200: ok('Updated', ref('Message')),
                    400: error('Bad id'),
                    401: error('Not logged in'),
                    404: error('Message not found'),
                },
            },
        },
        '/api/messages/{id}': {
            parameters: [idParam],
            delete: {
                summary: 'Delete a message',
                security: adminOnly,
                responses: {
                    204: noContent,
                    400: error('Bad id'),
                    401: error('Not logged in'),
                    404: error('Message not found'),
                },
            },
        },
        '/api/testing/reset': {
            post: {
                summary:
                    'Restore the seed data (only when ENABLE_TEST_RESET=true)',
                responses: {
                    204: noContent,
                    404: error('Reset is switched off'),
                },
            },
        },
    },
} as const;
