/** The admin log-in form. The server sets the session cookie on success. */
import type { LoginInput } from '../../shared/schemas.ts';
import { api } from '../lib/api.ts';
import { byId, field, hide, showError } from '../lib/dom.ts';

const form = byId<HTMLFormElement>('login-form');
const errorBox = byId('login-error');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hide(errorBox);
    const credentials: LoginInput = {
        email: field(form, 'email'),
        password: field(form, 'password'),
    };
    try {
        await api('/api/auth/login', { method: 'POST', body: credentials });
        window.location.href = '/admin/rooms';
    } catch (error) {
        showError(errorBox, error);
    }
});
