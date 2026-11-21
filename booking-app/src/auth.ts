/**
 * Admin sessions. Logging in creates a random token that the browser keeps
 * in a cookie, and that API clients can send as `Authorization: Bearer <token>`.
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Config } from './config.ts';
import { sendError } from './http.ts';

export const SESSION_COOKIE = 'willow_session';
const SESSION_HOURS = 8;
const MS_PER_HOUR = 60 * 60 * 1000;

type Session = { email: string; expiresAt: number };

export class Sessions {
    // A Map is a key/value store: token -> session.
    private sessions = new Map<string, Session>();

    constructor(private readonly config: Config) {}

    /** Returns a new token when the credentials match, otherwise null. */
    login(email: string, password: string): string | null {
        const ok =
            safeEqual(email, this.config.ADMIN_EMAIL) &&
            safeEqual(password, this.config.ADMIN_PASSWORD);
        if (!ok) return null;
        const token = randomBytes(24).toString('hex');
        this.sessions.set(token, {
            email,
            expiresAt: Date.now() + SESSION_HOURS * MS_PER_HOUR,
        });
        return token;
    }

    logout(token: string | undefined): void {
        if (token) this.sessions.delete(token);
    }

    find(token: string | undefined): Session | undefined {
        if (!token) return undefined;
        const session = this.sessions.get(token);
        if (!session) return undefined;
        if (session.expiresAt < Date.now()) {
            this.sessions.delete(token);
            return undefined;
        }
        return session;
    }

    clear(): void {
        this.sessions.clear();
    }

    /** Reads the token from the Authorization header first, then the cookie. */
    tokenFrom(req: Request): string | undefined {
        const header = req.get('authorization');
        if (header?.startsWith('Bearer '))
            return header.slice('Bearer '.length);
        return readCookie(req, SESSION_COOKIE);
    }

    /** Express middleware for admin API routes: 401 unless logged in. */
    requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
        if (this.find(this.tokenFrom(req))) return next();
        sendError(res, 401, 'Log in as admin to do this');
    };

    /** Middleware for admin HTML pages: send visitors to the login page. */
    requireAdminPage = (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        if (this.find(this.tokenFrom(req))) return next();
        res.redirect('/admin');
    };
}

/** Compares secrets in constant time, so timing can't leak how much matched. */
function safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}

/** A tiny cookie reader, so we don't need another package. */
function readCookie(req: Request, name: string): string | undefined {
    const header = req.get('cookie');
    if (!header) return undefined;
    for (const part of header.split(';')) {
        const [key, ...rest] = part.trim().split('=');
        if (key === name) return decodeURIComponent(rest.join('='));
    }
    return undefined;
}
