import { Router } from 'express';
import { today } from '../../shared/dates.ts';
import { BookingInputSchema } from '../../shared/schemas.ts';
import type { AppContext } from '../context.ts';
import { parseBody, parseId, sendError } from '../http.ts';

export function bookingRoutes({ store, sessions }: AppContext): Router {
    const router = Router();
    const admin = sessions.requireAdmin;

    // Public: a guest books a room.
    router.post('/', (req, res) => {
        const input = parseBody(BookingInputSchema, req, res);
        if (!input) return;
        if (input.checkIn < today()) {
            return sendError(res, 400, 'Validation failed', [
                { field: 'checkIn', message: 'Check-in cannot be in the past' },
            ]);
        }
        if (!store.getRoom(input.roomId)) {
            return sendError(res, 404, 'Room not found');
        }
        if (store.hasClash(input)) {
            return sendError(res, 409, 'Those dates are already booked');
        }
        res.status(201).json(store.createBooking(input));
    });

    // Admin only: see and cancel bookings.
    router.get('/', admin, (_req, res) => {
        res.json({ bookings: store.listBookings() });
    });

    router.delete('/:id', admin, (req, res) => {
        const id = parseId(req, res);
        if (id === undefined) return;
        if (!store.deleteBooking(id)) {
            return sendError(res, 404, 'Booking not found');
        }
        res.status(204).end();
    });

    return router;
}
