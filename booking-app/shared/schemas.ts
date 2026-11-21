/**
 * The shape of every piece of data in Willow Lodge, written once with Zod.
 *
 * Zod gives us two things from one definition:
 *  1. a runtime check (`Schema.safeParse(body)`) for data arriving over HTTP,
 *  2. a compile-time TypeScript type (`z.infer<typeof Schema>`).
 * So the validation and the types can never drift apart.
 *
 * `z.strictObject` rejects unknown keys, so a typo such as `fristName`
 * is a 400 error, not silently ignored.
 */
import { z } from 'zod';

// `as const` freezes the array so TypeScript knows the exact five strings,
// not just "string[]". z.enum then accepts only those values.
export const ROOM_TYPES = [
    'Single',
    'Double',
    'Twin',
    'Family',
    'Suite',
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

const isoDate = z.iso.date({ error: 'Use the date format YYYY-MM-DD' });

// ---------- Rooms ----------

export const RoomInputSchema = z.strictObject({
    name: z
        .string({ error: 'Room name is required' })
        .trim()
        .min(3, 'Room name must be between 3 and 40 characters')
        .max(40, 'Room name must be between 3 and 40 characters'),
    type: z.enum(ROOM_TYPES, {
        error: `Room type must be one of: ${ROOM_TYPES.join(', ')}`,
    }),
    pricePerNight: z
        .number({ error: 'Price per night must be a number' })
        .int('Price per night must be a whole number')
        .min(1, 'Price per night must be between 1 and 999')
        .max(999, 'Price per night must be between 1 and 999'),
    maxGuests: z
        .number({ error: 'Max guests must be a number' })
        .int('Max guests must be a whole number')
        .min(1, 'Max guests must be between 1 and 6')
        .max(6, 'Max guests must be between 1 and 6'),
    accessible: z.boolean({ error: 'Accessible must be true or false' }),
    features: z
        .array(z.string().trim().min(1).max(30), {
            error: 'Features must be a list of words',
        })
        .max(10, 'A room can list at most 10 features'),
    description: z
        .string({ error: 'Description is required' })
        .trim()
        .min(10, 'Description must be between 10 and 500 characters')
        .max(500, 'Description must be between 10 and 500 characters'),
});
export type RoomInput = z.infer<typeof RoomInputSchema>;

/** A stored room is the input plus the id the server gives it. */
export type Room = RoomInput & { id: number };

// ---------- Bookings ----------

export const BookingInputSchema = z
    .strictObject({
        roomId: z
            .number({ error: 'Room id must be a number' })
            .int()
            .positive('Room id must be a number'),
        firstName: z
            .string({ error: 'First name is required' })
            .trim()
            .min(2, 'First name must be between 2 and 30 characters')
            .max(30, 'First name must be between 2 and 30 characters'),
        lastName: z
            .string({ error: 'Last name is required' })
            .trim()
            .min(2, 'Last name must be between 2 and 30 characters')
            .max(30, 'Last name must be between 2 and 30 characters'),
        email: z.email({ error: 'Enter a valid email address' }),
        phone: z
            .string({ error: 'Phone number is required' })
            .trim()
            .min(10, 'Phone number must be between 10 and 20 characters')
            .max(20, 'Phone number must be between 10 and 20 characters'),
        checkIn: isoDate,
        checkOut: isoDate,
    })
    // `.refine` adds a rule that looks at more than one field at once.
    .refine((booking) => booking.checkOut > booking.checkIn, {
        message: 'Check-out must be after check-in',
        path: ['checkOut'],
    });
export type BookingInput = z.infer<typeof BookingInputSchema>;
export type Booking = BookingInput & { id: number; createdAt: string };

/** What the public calendar sees: dates only, never guest details. */
export type BookedRange = Pick<Booking, 'checkIn' | 'checkOut'>;

// ---------- Messages (contact form) ----------

export const MessageInputSchema = z.strictObject({
    name: z
        .string({ error: 'Name is required' })
        .trim()
        .min(1, 'Name is required')
        .max(50, 'Name must be at most 50 characters'),
    email: z.email({ error: 'Enter a valid email address' }),
    phone: z
        .string({ error: 'Phone number is required' })
        .trim()
        .min(10, 'Phone number must be between 10 and 20 characters')
        .max(20, 'Phone number must be between 10 and 20 characters'),
    subject: z
        .string({ error: 'Subject is required' })
        .trim()
        .min(5, 'Subject must be between 5 and 100 characters')
        .max(100, 'Subject must be between 5 and 100 characters'),
    description: z
        .string({ error: 'Message is required' })
        .trim()
        .min(20, 'Message must be between 20 and 2000 characters')
        .max(2000, 'Message must be between 20 and 2000 characters'),
});
export type MessageInput = z.infer<typeof MessageInputSchema>;
export type Message = MessageInput & {
    id: number;
    read: boolean;
    createdAt: string;
};

// ---------- Auth ----------

export const LoginInputSchema = z.strictObject({
    email: z.string({ error: 'Email is required' }).min(1, 'Email is required'),
    password: z
        .string({ error: 'Password is required' })
        .min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

// ---------- Errors ----------

/** Every 4xx/5xx response body has this shape. */
export type FieldError = { field: string; message: string };
export type ErrorBody = { error: string; fields?: FieldError[] };
