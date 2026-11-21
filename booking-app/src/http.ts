/**
 * Small helpers every route uses: validating a request body and sending
 * errors in one consistent shape ({ error, fields? }).
 */
import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { ErrorBody, FieldError } from '../shared/schemas.ts';

export function sendError(
    res: Response,
    status: number,
    error: string,
    fields?: FieldError[]
): void {
    const body: ErrorBody = fields ? { error, fields } : { error };
    res.status(status).json(body);
}

/**
 * Checks `req.body` against a schema.
 * Returns the parsed data, or sends a 400 and returns `undefined`.
 *
 * `<T extends z.ZodType>` is a generic: the function works with any schema,
 * and `z.infer<T>` makes the return type match whichever schema you pass in.
 */
export function parseBody<T extends z.ZodType>(
    schema: T,
    req: Request,
    res: Response
): z.infer<T> | undefined {
    const result = schema.safeParse(req.body);
    if (result.success) return result.data;

    const fields: FieldError[] = result.error.issues.map((issue) => ({
        // An unknown key has an empty path, so we name the key itself.
        field:
            issue.path.join('.') ||
            ('keys' in issue ? issue.keys.join(', ') : 'body'),
        message:
            issue.code === 'unrecognized_keys'
                ? `Unknown field: ${issue.keys.join(', ')}`
                : issue.message,
    }));
    sendError(res, 400, 'Validation failed', fields);
    return undefined;
}

/** Reads a numeric `:id` from the URL, or sends a 400. */
export function parseId(req: Request, res: Response): number | undefined {
    const id = Number(req.params.id);
    if (Number.isInteger(id) && id > 0) return id;
    sendError(res, 400, 'Id must be a positive whole number');
    return undefined;
}
