import { Router } from 'express';
import type { AppContext } from '../context.ts';
import { sendError } from '../http.ts';

/**
 * POST /api/testing/reset puts the seed data back. Admin sessions stay logged in.
 * It only works when ENABLE_TEST_RESET=true, so it can't be used on a real site.
 */
export function testingRoutes({ config, store }: AppContext): Router {
    const router = Router();
    router.post('/reset', (_req, res) => {
        if (!config.ENABLE_TEST_RESET) {
            return sendError(res, 404, 'Not found');
        }
        store.reset();
        res.status(204).end();
    });
    return router;
}
