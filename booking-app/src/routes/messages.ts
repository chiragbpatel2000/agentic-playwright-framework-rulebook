import { Router } from 'express';
import { MessageInputSchema } from '../../shared/schemas.ts';
import type { AppContext } from '../context.ts';
import { parseBody, parseId, sendError } from '../http.ts';

export function messageRoutes({ store, sessions }: AppContext): Router {
    const router = Router();
    const admin = sessions.requireAdmin;

    // Public: the contact form.
    router.post('/', (req, res) => {
        const input = parseBody(MessageInputSchema, req, res);
        if (!input) return;
        res.status(201).json(store.createMessage(input));
    });

    // Admin only. /unread-count must come before /:id.
    router.get('/', admin, (_req, res) => {
        res.json({ messages: store.listMessages() });
    });

    router.get('/unread-count', admin, (_req, res) => {
        res.json({ count: store.unreadCount() });
    });

    router.patch('/:id/read', admin, (req, res) => {
        const id = parseId(req, res);
        if (id === undefined) return;
        const message = store.markMessageRead(id);
        if (!message) return sendError(res, 404, 'Message not found');
        res.json(message);
    });

    router.delete('/:id', admin, (req, res) => {
        const id = parseId(req, res);
        if (id === undefined) return;
        if (!store.deleteMessage(id)) {
            return sendError(res, 404, 'Message not found');
        }
        res.status(204).end();
    });

    return router;
}
