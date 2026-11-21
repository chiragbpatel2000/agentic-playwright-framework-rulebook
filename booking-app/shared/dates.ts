/**
 * Date helpers shared by the server and the browser.
 *
 * Every date in Willow Lodge is a plain "YYYY-MM-DD" string (an ISO date).
 * We never store times, so we do all the maths in UTC to dodge time-zone and
 * daylight-saving surprises.
 */

/** A type alias: documents intent, but it is still just a string to TypeScript. */
export type IsoDate = string;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Turns "2026-11-21" into a Date at midnight UTC. */
export function parseIsoDate(value: IsoDate): Date {
    return new Date(`${value}T00:00:00Z`);
}

/** Turns a Date back into "YYYY-MM-DD" (UTC). */
export function toIsoDate(date: Date): IsoDate {
    return date.toISOString().slice(0, 10);
}

/** Today's date as "YYYY-MM-DD". */
export function today(): IsoDate {
    return toIsoDate(new Date());
}

/** Adds (or, with a negative number, subtracts) whole days. */
export function addDays(value: IsoDate, days: number): IsoDate {
    return toIsoDate(
        new Date(parseIsoDate(value).getTime() + days * MS_PER_DAY)
    );
}

/** Number of nights between check-in and check-out. */
export function nightsBetween(checkIn: IsoDate, checkOut: IsoDate): number {
    return Math.round(
        (parseIsoDate(checkOut).getTime() - parseIsoDate(checkIn).getTime()) /
            MS_PER_DAY
    );
}

/**
 * Two stays overlap when each one starts before the other ends.
 * Check-out day is free for the next guest, so the comparison is strict.
 */
export function rangesOverlap(
    a: { checkIn: IsoDate; checkOut: IsoDate },
    b: { checkIn: IsoDate; checkOut: IsoDate }
): boolean {
    // ISO date strings sort the same way as the dates they hold,
    // so plain string comparison is safe here.
    return a.checkIn < b.checkOut && b.checkIn < a.checkOut;
}
