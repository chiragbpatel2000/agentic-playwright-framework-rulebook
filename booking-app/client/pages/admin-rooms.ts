/** Admin: list, add, edit and delete rooms. */
import type { Room, RoomInput, RoomType } from '../../shared/schemas.ts';
import { api } from '../lib/api.ts';
import { initAdminNav } from '../lib/admin.ts';
import { byId, el, field, hide, money, showError } from '../lib/dom.ts';

const form = byId<HTMLFormElement>('room-form');
const formErrors = byId('form-errors');
const pageError = byId('page-error');
const pageSuccess = byId('page-success');
let editingId: number | null = null;

function flash(text: string): void {
    hide(pageError);
    pageSuccess.hidden = false;
    pageSuccess.textContent = text;
}

function readForm(): RoomInput {
    const accessible = form.elements.namedItem(
        'accessible'
    ) as HTMLInputElement;
    return {
        name: field(form, 'name'),
        // `as RoomType` tells TypeScript "trust me": the <select> only offers
        // the five types, and the server rejects anything else anyway.
        type: field(form, 'type') as RoomType,
        // An empty box becomes NaN, which the server reports as "must be a number".
        pricePerNight:
            field(form, 'pricePerNight') === ''
                ? Number.NaN
                : Number(field(form, 'pricePerNight')),
        maxGuests:
            field(form, 'maxGuests') === ''
                ? Number.NaN
                : Number(field(form, 'maxGuests')),
        accessible: accessible.checked,
        features: field(form, 'features')
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean),
        description: field(form, 'description'),
    };
}

function fillForm(room: Room): void {
    const set = (name: string, value: string): void => {
        (form.elements.namedItem(name) as HTMLInputElement).value = value;
    };
    set('name', room.name);
    set('type', room.type);
    set('pricePerNight', String(room.pricePerNight));
    set('maxGuests', String(room.maxGuests));
    (form.elements.namedItem('accessible') as HTMLInputElement).checked =
        room.accessible;
    set('features', room.features.join(', '));
    set('description', room.description);
}

function setMode(room: Room | null): void {
    editingId = room ? room.id : null;
    byId('form-heading').textContent = room
        ? `Edit ${room.name}`
        : 'Add a room';
    byId('save-room').textContent = room ? 'Save changes' : 'Add room';
    byId('cancel-edit').hidden = !room;
    hide(formErrors);
    if (room) {
        fillForm(room);
        form.scrollIntoView({ behavior: 'smooth' });
    } else {
        form.reset();
    }
}

async function render(): Promise<void> {
    const { rooms } = await api<{ rooms: Room[] }>('/api/rooms');
    const rows = rooms.map((room) => {
        const row = el('tr');
        // The buttons sit in a div: making the <td> itself a flexbox breaks the table row.
        const actions = el('div', undefined, { class: 'row-actions' });
        const edit = el('button', 'Edit', {
            type: 'button',
            class: 'button-ghost',
            'aria-label': `Edit ${room.name}`,
        });
        const remove = el('button', 'Delete', {
            type: 'button',
            class: 'button-danger',
            'aria-label': `Delete ${room.name}`,
        });
        edit.addEventListener('click', () => setMode(room));
        remove.addEventListener('click', async () => {
            try {
                await api(`/api/rooms/${room.id}`, { method: 'DELETE' });
                flash(`Deleted ${room.name}.`);
                if (editingId === room.id) setMode(null);
                await render();
            } catch (error) {
                showError(pageError, error);
            }
        });
        actions.append(edit, remove);
        row.append(
            el('td', room.name),
            el('td', room.type),
            el('td', money(room.pricePerNight)),
            el('td', String(room.maxGuests)),
            el('td', room.accessible ? 'Yes' : 'No')
        );
        const cell = el('td');
        cell.append(actions);
        row.append(cell);
        return row;
    });
    byId('room-rows').replaceChildren(...rows);
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hide(formErrors);
    const input = readForm();
    try {
        if (editingId === null) {
            const created = await api<Room>('/api/rooms', {
                method: 'POST',
                body: input,
            });
            flash(`Added ${created.name}.`);
        } else {
            const updated = await api<Room>(`/api/rooms/${editingId}`, {
                method: 'PUT',
                body: input,
            });
            flash(`Saved ${updated.name}.`);
        }
        setMode(null);
        await render();
    } catch (error) {
        showError(formErrors, error);
    }
});
byId('cancel-edit').addEventListener('click', () => setMode(null));

void initAdminNav();
void render();
