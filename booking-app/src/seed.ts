/**
 * The data the app starts with, and goes back to on POST /api/testing/reset.
 * Booking dates are relative to today, so the calendar always shows some
 * booked days whatever date you run it on.
 */
import { addDays, today } from '../shared/dates.ts';
import type { BookingInput, RoomInput } from '../shared/schemas.ts';

export function seedRooms(): RoomInput[] {
    return [
        {
            name: 'Garden Room',
            type: 'Double',
            pricePerNight: 95,
            maxGuests: 2,
            accessible: true,
            features: ['Garden view', 'Wi-Fi', 'Walk-in shower'],
            description:
                'A calm ground-floor double that opens onto the herb garden. Step-free access throughout.',
        },
        {
            name: 'Hayloft',
            type: 'Twin',
            pricePerNight: 80,
            maxGuests: 2,
            accessible: false,
            features: ['Exposed beams', 'Wi-Fi', 'Desk'],
            description:
                'Two single beds under the old oak beams of the converted hayloft. Reached by a short staircase.',
        },
        {
            name: 'Orchard Suite',
            type: 'Suite',
            pricePerNight: 160,
            maxGuests: 4,
            accessible: false,
            features: ['Orchard view', 'Wi-Fi', 'Bath', 'Sofa bed'],
            description:
                'Our largest room: a king bed, a sitting room with a sofa bed and a deep bath overlooking the orchard.',
        },
    ];
}

/** `Omit` builds a new type: a BookingInput without the roomId field. */
export function seedBookings(): Array<
    Omit<BookingInput, 'roomId'> & { roomIndex: number }
> {
    const start = today();
    return [
        {
            roomIndex: 0,
            firstName: 'Ada',
            lastName: 'Fenwick',
            email: 'ada.fenwick@example.com',
            phone: '07700900123',
            checkIn: addDays(start, 3),
            checkOut: addDays(start, 6),
        },
        {
            roomIndex: 2,
            firstName: 'Tomas',
            lastName: 'Lindqvist',
            email: 'tomas.lindqvist@example.com',
            phone: '07700900456',
            checkIn: addDays(start, 10),
            checkOut: addDays(start, 12),
        },
    ];
}
