import { Router } from 'express';
import { RoomInputSchema } from '../../shared/schemas.ts';
import type { AppContext } from '../context.ts';
import { parseBody, parseId, sendError } from '../http.ts';

export function roomRoutes({ store, sessions }: AppContext): Router {
    const router = Router();
    const admin = sessions.requireAdmin;

    // Public: anyone can see the rooms.
    router.get('/', (_req, res) => {
        res.json({ rooms: store.listRooms() });
    });

    router.get('/:id', (req, res) => {
        const id = parseId(req, res);
        if (id === undefined) return;
        const room = store.getRoom(id);
        if (!room) return sendError(res, 404, 'Room not found');
        res.json(room);
    });

    // Public: booked dates for the calendar, with no guest details.
    router.get('/:id/booked-dates', (req, res) => {
        const id = parseId(req, res);
        if (id === undefined) return;
        if (!store.getRoom(id)) return sendError(res, 404, 'Room not found');
        res.json({ booked: store.bookedRanges(id) });
    });

    // Admin only: create, replace and delete rooms.
    router.post('/', admin, (req, res) => {
        const input = parseBody(RoomInputSchema, req, res);
        if (!input) return;
        res.status(201).json(store.createRoom(input));
    });

    router.put('/:id', admin, (req, res) => {
        const id = parseId(req, res);
        if (id === undefined) return;
        const input = parseBody(RoomInputSchema, req, res);
        if (!input) return;
        const room = store.updateRoom(id, input);
        if (!room) return sendError(res, 404, 'Room not found');
        res.json(room);
    });

    router.delete('/:id', admin, (req, res) => {
        const id = parseId(req, res);
        if (id === undefined) return;
        if (!store.deleteRoom(id)) return sendError(res, 404, 'Room not found');
        res.status(204).end();
    });

    return router;
}
