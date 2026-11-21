/**
 * A typed wrapper around fetch() for the browser pages.
 *
 * `api<Room[]>('/api/rooms')` says "I expect this shape back", so the rest of
 * the page gets autocomplete and type checks. (TypeScript trusts us here; the
 * server is what really guarantees the shape.)
 */
import type { ErrorBody, FieldError } from '../../shared/schemas.ts';

/** An Error that also carries the HTTP status and any field errors. */
export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly fields: FieldError[] = []
    ) {
        super(message);
    }
}

export async function api<T>(
    url: string,
    options: { method?: string; body?: unknown } = {}
): Promise<T> {
    const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers:
            options.body === undefined
                ? undefined
                : { 'Content-Type': 'application/json' },
        body:
            options.body === undefined
                ? undefined
                : JSON.stringify(options.body),
        credentials: 'same-origin',
    });

    if (response.status === 204) return undefined as T;

    const data: unknown = await response.json();
    if (!response.ok) {
        const error = data as ErrorBody;
        throw new ApiError(response.status, error.error, error.fields);
    }
    return data as T;
}
