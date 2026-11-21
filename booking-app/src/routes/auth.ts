import { Router } from 'express';
import { LoginInputSchema } from '../../shared/schemas.ts';
import { SESSION_COOKIE } from '../auth.ts';
import type { AppContext } from '../context.ts';
import { parseBody, sendError } from '../http.ts';

export function authRoutes({ sessions }: AppContext): Router {
    const router = Router();

    // POST /api/auth/login  { email, password }  ->  200 { token }
    router.post('/login', (req, res) => {
        const input = parseBody(LoginInputSchema, req, res);
        if (!input) return;
        const token = sessions.login(input.email, input.password);
        if (!token) return sendError(res, 401, 'Invalid email or password');
        res.cookie(SESSION_COOKIE, token, {
            httpOnly: true, // page scripts can't read it
            sameSite: 'lax',
            path: '/',
        });
        res.json({ token });
    });

    // POST /api/auth/logout  ->  204
    router.post('/logout', (req, res) => {
        sessions.logout(sessions.tokenFrom(req));
        res.clearCookie(SESSION_COOKIE, { path: '/' });
        res.status(204).end();
    });

    // GET /api/auth/me  ->  200 { email } or 401
    router.get('/me', sessions.requireAdmin, (req, res) => {
        const session = sessions.find(sessions.tokenFrom(req));
        res.json({ email: session?.email });
    });

    return router;
}
