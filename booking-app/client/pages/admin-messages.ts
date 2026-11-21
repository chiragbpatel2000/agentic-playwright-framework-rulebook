/** Admin: read, mark as read and delete contact-form messages. */
import type { Message } from '../../shared/schemas.ts';
import { api } from '../lib/api.ts';
import { initAdminNav, refreshUnreadBadge } from '../lib/admin.ts';
import { byId, el, hide, showError } from '../lib/dom.ts';

const pageError = byId('page-error');
const pageSuccess = byId('page-success');

function flash(text: string): void {
    hide(pageError);
    pageSuccess.hidden = false;
    pageSuccess.textContent = text;
}

function messageItem(message: Message): HTMLLIElement {
    const item = el('li', undefined, {
        class: message.read ? 'message' : 'message unread',
    });
    const header = el('div', undefined, { class: 'message-header' });
    header.append(
        el('h2', message.subject),
        el('span', message.read ? 'Read' : 'Unread', { class: 'status' })
    );
    const meta = el(
        'p',
        `From ${message.name} · ${message.email} · ${message.phone}`,
        { class: 'muted' }
    );
    const text = el('p', message.description);

    const actions = el('div', undefined, { class: 'row-actions' });
    if (!message.read) {
        const markRead = el('button', 'Mark as read', {
            type: 'button',
            class: 'button-ghost',
            'aria-label': `Mark "${message.subject}" as read`,
        });
        markRead.addEventListener('click', () =>
            act(
                `/api/messages/${message.id}/read`,
                'PATCH',
                `Marked "${message.subject}" as read.`
            )
        );
        actions.append(markRead);
    }
    const remove = el('button', 'Delete', {
        type: 'button',
        class: 'button-danger',
        'aria-label': `Delete "${message.subject}"`,
    });
    remove.addEventListener('click', () =>
        act(
            `/api/messages/${message.id}`,
            'DELETE',
            `Deleted "${message.subject}".`
        )
    );
    actions.append(remove);

    item.append(header, meta, text, actions);
    return item;
}

async function act(url: string, method: string, done: string): Promise<void> {
    try {
        await api(url, { method });
        flash(done);
        await render();
    } catch (error) {
        showError(pageError, error);
    }
}

async function render(): Promise<void> {
    const { messages } = await api<{ messages: Message[] }>('/api/messages');
    byId('empty').hidden = messages.length > 0;
    byId('message-list').replaceChildren(...messages.map(messageItem));
    await refreshUnreadBadge();
}

void initAdminNav();
void render();
