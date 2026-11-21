/** Small DOM helpers shared by every page. */
import { ApiError } from './api.ts';

/**
 * Finds an element by CSS selector and fails loudly if it's missing.
 * The generic `<T extends Element>` lets callers say what kind of element
 * they expect: byId<HTMLFormElement>('contact-form').
 */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing element #${id}`);
    return element as T;
}

/**
 * Creates an element with optional text and attributes.
 * `keyof HTMLElementTagNameMap` limits `tag` to real tag names, and the
 * return type follows: el('button') is typed as an HTMLButtonElement.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text?: string,
    attributes: Record<string, string> = {}
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value);
    }
    return element;
}

/** Reads a form field's trimmed value by its name attribute. */
export function field(form: HTMLFormElement, name: string): string {
    const input = form.elements.namedItem(name);
    if (
        input instanceof HTMLInputElement ||
        input instanceof HTMLTextAreaElement ||
        input instanceof HTMLSelectElement
    ) {
        return input.value.trim();
    }
    throw new Error(`Missing form field "${name}"`);
}

/**
 * Shows an error in a box with role="alert", so screen readers (and
 * Playwright's getByRole('alert')) find it. Field errors become a list.
 */
export function showError(box: HTMLElement, error: unknown): void {
    box.replaceChildren();
    box.hidden = false;
    if (error instanceof ApiError && error.fields.length > 0) {
        const list = el('ul');
        for (const item of error.fields) list.append(el('li', item.message));
        box.append(list);
    } else {
        box.append(
            el(
                'p',
                error instanceof Error ? error.message : 'Something went wrong'
            )
        );
    }
}

export function hide(box: HTMLElement): void {
    box.hidden = true;
    box.replaceChildren();
}

/** £95 style money, the same everywhere. */
export function money(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0,
    }).format(amount);
}

/** "21 Nov 2026" from "2026-11-21". */
export function prettyDate(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
}
