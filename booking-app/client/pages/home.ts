/** The front page: room cards and the contact form. */
import type { MessageInput, Room } from '../../shared/schemas.ts';
import { api } from '../lib/api.ts';
import { byId, el, field, hide, money, showError } from '../lib/dom.ts';

async function loadRooms(): Promise<void> {
    const list = byId<HTMLUListElement>('room-list');
    const loading = byId('rooms-loading');
    try {
        const { rooms } = await api<{ rooms: Room[] }>('/api/rooms');
        loading.hidden = true;
        list.replaceChildren(...rooms.map(roomCard));
        if (rooms.length === 0)
            list.append(el('li', 'No rooms are available right now.'));
    } catch {
        loading.textContent = 'Sorry, we could not load the rooms.';
    }
}

function roomCard(room: Room): HTMLLIElement {
    const card = el('li', undefined, { class: 'room-card' });
    const picture = el('div', room.type, {
        class: `room-picture type-${room.type.toLowerCase()}`,
        'aria-hidden': 'true',
    });
    const body = el('div', undefined, { class: 'room-card-body' });
    body.append(
        el('h3', room.name),
        el(
            'p',
            `${room.type} · up to ${room.maxGuests} guests${room.accessible ? ' · step-free' : ''}`,
            { class: 'muted' }
        ),
        el('p', room.description),
        el('p', `${money(room.pricePerNight)} per night`, { class: 'price' })
    );
    const link = el('a', 'Book this room', {
        class: 'button',
        href: `/rooms/${room.id}`,
        'aria-label': `Book ${room.name}`,
    });
    body.append(link);
    card.append(picture, body);
    return card;
}

function initContactForm(): void {
    const form = byId<HTMLFormElement>('contact-form');
    const errors = byId('contact-errors');
    const success = byId('contact-success');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hide(errors);
        hide(success);
        // The object literal must match MessageInput exactly, or tsc complains.
        const message: MessageInput = {
            name: field(form, 'name'),
            email: field(form, 'email'),
            phone: field(form, 'phone'),
            subject: field(form, 'subject'),
            description: field(form, 'description'),
        };
        try {
            await api('/api/messages', { method: 'POST', body: message });
            form.reset();
            success.hidden = false;
            success.append(
                el('h3', `Thanks, ${message.name}!`),
                el(
                    'p',
                    `We've got your message about "${message.subject}" and will reply soon.`
                )
            );
        } catch (error) {
            showError(errors, error);
        }
    });
}

void loadRooms();
initContactForm();
