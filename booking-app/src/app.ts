/**
 * Builds the Express app. Kept apart from server.ts so tests can create an
 * app without opening a port.
 */
import express, {
    type NextFunction,
    type Request,
    type Response,
} from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sessions } from './auth.ts';
import type { Config } from './config.ts';
import type { AppContext } from './context.ts';
import { sendError } from './http.ts';
import { openApiDocument } from './openapi.ts';
import { authRoutes } from './routes/auth.ts';
import { bookingRoutes } from './routes/bookings.ts';
import { messageRoutes } from './routes/messages.ts';
import { roomRoutes } from './routes/rooms.ts';
import { testingRoutes } from './routes/testing.ts';
import { Store } from './store.ts';

const publicDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'public'
);
const page = (name: string): string => path.join(publicDir, `${name}.html`);

export function createApp(config: Config): express.Express {
    const context: AppContext = {
        config,
        store: new Store(),
        sessions: new Sessions(config),
    };
    const { sessions } = context;
    const app = express();

    app.use(express.json({ limit: '100kb' }));

    // ---------- API ----------
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok' });
    });
    app.get('/api/openapi.json', (_req, res) => {
        res.json(openApiDocument);
    });
    app.use('/api/auth', authRoutes(context));
    app.use('/api/rooms', roomRoutes(context));
    app.use('/api/bookings', bookingRoutes(context));
    app.use('/api/messages', messageRoutes(context));
    app.use('/api/testing', testingRoutes(context));
    app.use('/api', (_req, res) => {
        sendError(res, 404, 'Not found');
    });

    // ---------- Pages ----------
    app.get('/', (_req, res) => res.sendFile(page('index')));
    app.get('/rooms/:id', (_req, res) => res.sendFile(page('room')));
    app.get('/admin', (req, res) => {
        // Already logged in? Skip the login form.
        if (sessions.find(sessions.tokenFrom(req))) {
            return res.redirect('/admin/rooms');
        }
        res.sendFile(page('admin-login'));
    });
    for (const name of ['rooms', 'bookings', 'messages']) {
        app.get(`/admin/${name}`, sessions.requireAdminPage, (_req, res) =>
            res.sendFile(page(`admin-${name}`))
        );
    }
    app.use(express.static(publicDir, { index: false }));
    app.use((_req, res) => {
        res.status(404).sendFile(page('not-found'));
    });

    // Express calls a 4-argument middleware when something throws.
    app.use(
        (
            err: Error & { status?: number; type?: string },
            _req: Request,
            res: Response,
            _next: NextFunction
        ) => {
            if (err.type === 'entity.parse.failed') {
                return sendError(res, 400, 'Body must be valid JSON');
            }
            sendError(res, err.status ?? 500, 'Something went wrong');
        }
    );

    return app;
}
