/** Admin: see every booking and cancel one. */
import type { Booking, Room } from '../../shared/schemas.ts';
import { api } from '../lib/api.ts';
import { initAdminNav } from '../lib/admin.ts';
import { byId, el, hide, prettyDate, showError } from '../lib/dom.ts';

const pageError = byId('page-error');
const pageSuccess = byId('page-success');

async function render(): Promise<void> {
    // Promise.all runs both requests at the same time.
    const [{ bookings }, { rooms }] = await Promise.all([
        api<{ bookings: Booking[] }>('/api/bookings'),
        api<{ rooms: Room[] }>('/api/rooms'),
    ]);
    // A Map from room id to room name, for the "Room" column.
    const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
    bookings.sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    byId('empty').hidden = bookings.length > 0;
    byId('booking-rows').replaceChildren(
        ...bookings.map((booking) => {
            const guest = `${booking.firstName} ${booking.lastName}`;
            const cancel = el('button', 'Cancel', {
                type: 'button',
                class: 'button-danger',
                'aria-label': `Cancel booking for ${guest}`,
            });
            cancel.addEventListener('click', async () => {
                try {
                    await api(`/api/bookings/${booking.id}`, {
                        method: 'DELETE',
                    });
                    hide(pageError);
                    pageSuccess.hidden = false;
                    pageSuccess.textContent = `Cancelled the booking for ${guest}.`;
                    await render();
                } catch (error) {
                    showError(pageError, error);
                }
            });
            const actions = el('td');
            actions.append(cancel);
            const row = el('tr');
            row.append(
                el('td', guest),
                el(
                    'td',
                    roomNames.get(booking.roomId) ?? `Room ${booking.roomId}`
                ),
                el('td', prettyDate(booking.checkIn)),
                el('td', prettyDate(booking.checkOut)),
                el('td', booking.email),
                el('td', booking.phone),
                actions
            );
            return row;
        })
    );
}

void initAdminNav();
void render();
