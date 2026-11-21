/** One room: details, the booking calendar and the booking form. */
import {
    addDays,
    nightsBetween,
    rangesOverlap,
    today,
    type IsoDate,
} from '../../shared/dates.ts';
import type {
    BookedRange,
    Booking,
    BookingInput,
    Room,
} from '../../shared/schemas.ts';
import { api } from '../lib/api.ts';
import {
    byId,
    el,
    field,
    hide,
    money,
    prettyDate,
    showError,
} from '../lib/dom.ts';

// The page's state lives in one object. `| null` means "not picked yet".
const state: {
    room: Room | null;
    booked: BookedRange[];
    month: Date; // first day of the month on screen (UTC)
    checkIn: IsoDate | null;
    checkOut: IsoDate | null;
} = {
    room: null,
    booked: [],
    month: firstOfMonth(today()),
    checkIn: null,
    checkOut: null,
};

function firstOfMonth(iso: IsoDate): Date {
    return new Date(`${iso.slice(0, 7)}-01T00:00:00Z`);
}

/** A night is booked when the stay [date, date+1) overlaps a booking. */
function isBooked(date: IsoDate): boolean {
    return state.booked.some((range) =>
        rangesOverlap(range, { checkIn: date, checkOut: addDays(date, 1) })
    );
}

function renderCalendar(): void {
    const label = new Intl.DateTimeFormat('en-GB', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
    byId('month-label').textContent = label.format(state.month);

    const days = byId('calendar-days');
    days.replaceChildren();

    const first = state.month.toISOString().slice(0, 10);
    // getUTCDay(): Sunday is 0. We start weeks on Monday, so shift by 6.
    const offset = (state.month.getUTCDay() + 6) % 7;
    for (let i = 0; i < offset; i++) days.append(el('span'));

    const now = today();
    for (
        let date = first;
        date.slice(0, 7) === first.slice(0, 7);
        date = addDays(date, 1)
    ) {
        const booked = isBooked(date);
        const past = date < now;
        const button = el('button', String(Number(date.slice(8))), {
            type: 'button',
            class: 'day',
            'data-date': date,
            'aria-label': `${prettyDate(date)}${booked ? ', booked' : ''}`,
        });
        button.disabled = past || booked;
        if (booked) button.classList.add('booked');
        if (date === state.checkIn || date === state.checkOut) {
            button.classList.add('selected');
            button.setAttribute('aria-pressed', 'true');
        } else if (
            state.checkIn &&
            state.checkOut &&
            date > state.checkIn &&
            date < state.checkOut
        ) {
            button.classList.add('in-range');
        }
        button.addEventListener('click', () => pickDay(date));
        days.append(button);
    }

    // Don't let guests page back before the current month.
    byId<HTMLButtonElement>('prev-month').disabled =
        state.month.getTime() <= firstOfMonth(now).getTime();
}

function pickDay(date: IsoDate): void {
    const startingOver =
        !state.checkIn || state.checkOut || date <= state.checkIn;
    if (startingOver) {
        state.checkIn = date;
        state.checkOut = null;
    } else {
        state.checkOut = date;
    }
    renderCalendar();
    renderSelection();
}

function renderSelection(): void {
    const box = byId('selection');
    const { checkIn, checkOut, room } = state;
    if (!checkIn) {
        box.textContent = 'No dates selected yet.';
    } else if (!checkOut) {
        box.textContent = `Check-in ${prettyDate(checkIn)}. Now pick your check-out day.`;
    } else {
        const nights = nightsBetween(checkIn, checkOut);
        const total = room ? money(room.pricePerNight * nights) : '';
        box.textContent = `Check-in ${prettyDate(checkIn)}, check-out ${prettyDate(checkOut)}: ${nights} night${nights === 1 ? '' : 's'}, ${total} in total.`;
    }
}

function moveMonth(step: number): void {
    const next = new Date(state.month);
    next.setUTCMonth(next.getUTCMonth() + step);
    state.month = next;
    renderCalendar();
}

async function loadBooked(roomId: number): Promise<void> {
    const { booked } = await api<{ booked: BookedRange[] }>(
        `/api/rooms/${roomId}/booked-dates`
    );
    state.booked = booked;
}

function initBookingForm(room: Room): void {
    const form = byId<HTMLFormElement>('booking-form');
    const errors = byId('booking-errors');
    const success = byId('booking-success');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hide(errors);
        hide(success);
        if (!state.checkIn || !state.checkOut) {
            showError(
                errors,
                new Error(
                    'Choose a check-in and a check-out day on the calendar'
                )
            );
            return;
        }
        const booking: BookingInput = {
            roomId: room.id,
            firstName: field(form, 'firstName'),
            lastName: field(form, 'lastName'),
            email: field(form, 'email'),
            phone: field(form, 'phone'),
            checkIn: state.checkIn,
            checkOut: state.checkOut,
        };
        try {
            const saved = await api<Booking>('/api/bookings', {
                method: 'POST',
                body: booking,
            });
            form.reset();
            success.hidden = false;
            success.append(
                el('h3', 'Booking confirmed'),
                el(
                    'p',
                    `${saved.firstName}, the ${room.name} is yours from ${prettyDate(saved.checkIn)} to ${prettyDate(saved.checkOut)}. Your booking number is ${saved.id}.`
                )
            );
            state.checkIn = null;
            state.checkOut = null;
            await loadBooked(room.id);
            renderCalendar();
            renderSelection();
        } catch (error) {
            showError(errors, error);
        }
    });
}

async function init(): Promise<void> {
    const id = Number(window.location.pathname.split('/').pop());
    try {
        const room = await api<Room>(`/api/rooms/${id}`);
        state.room = room;
        await loadBooked(room.id);
    } catch (error) {
        showError(byId('room-error'), error);
        return;
    }
    const room = state.room;
    document.title = `${room.name} | Willow Lodge`;
    byId('room-name').textContent = room.name;
    byId('room-summary').textContent =
        `${room.type} · up to ${room.maxGuests} guests · ${money(room.pricePerNight)} per night${room.accessible ? ' · step-free access' : ''}`;
    byId('room-description').textContent = room.description;
    byId('room-features').replaceChildren(
        ...room.features.map((f) => el('li', f))
    );
    const picture = byId('room-picture');
    picture.textContent = room.type;
    picture.classList.add(`type-${room.type.toLowerCase()}`);

    byId('room-details').hidden = false;
    byId('booking').hidden = false;
    byId('prev-month').addEventListener('click', () => moveMonth(-1));
    byId('next-month').addEventListener('click', () => moveMonth(1));
    renderCalendar();
    initBookingForm(room);
}

void init();
