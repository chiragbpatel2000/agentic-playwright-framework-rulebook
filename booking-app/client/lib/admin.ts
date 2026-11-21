/** Shared by the three admin pages: unread badge and log-out button. */
import { api } from './api.ts';
import { byId } from './dom.ts';

export async function initAdminNav(): Promise<void> {
    byId<HTMLButtonElement>('logout').addEventListener('click', async () => {
        await api('/api/auth/logout', { method: 'POST' });
        window.location.href = '/admin';
    });
    await refreshUnreadBadge();
}

export async function refreshUnreadBadge(): Promise<void> {
    const badge = byId('unread-badge');
    const { count } = await api<{ count: number }>(
        '/api/messages/unread-count'
    );
    badge.textContent = String(count);
    badge.hidden = count === 0;
    badge.setAttribute('aria-label', `${count} unread`);
}
