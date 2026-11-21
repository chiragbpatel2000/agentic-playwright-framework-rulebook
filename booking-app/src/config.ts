/**
 * Reads settings from environment variables, once, at start-up.
 *
 * We validate them with Zod too: if ADMIN_PASSWORD is missing the app stops
 * straight away with a clear message, instead of failing later in a login.
 */
import 'dotenv/config';
import { z } from 'zod';

// z.object (not z.strictObject) on purpose: process.env holds dozens of
// other variables (PATH, HOME...) and we only care about ours.
const EnvSchema = z.object({
    PORT: z.coerce.number().int().positive().default(3000),
    ADMIN_EMAIL: z.string().min(1, 'ADMIN_EMAIL is not set'),
    ADMIN_PASSWORD: z.string().min(1, 'ADMIN_PASSWORD is not set'),
    // Environment variables are always strings, so we turn "true" into a boolean.
    ENABLE_TEST_RESET: z
        .string()
        .default('false')
        .transform((value) => value === 'true'),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
    const result = EnvSchema.safeParse(env);
    if (!result.success) {
        const problems = result.error.issues
            .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
        throw new Error(
            `Willow Lodge cannot start. Check booking-app/.env (see .env.example):\n${problems}`
        );
    }
    return result.data;
}
