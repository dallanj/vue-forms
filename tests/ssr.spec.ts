import { renderToString } from '@vue/server-renderer';
import { describe, expect, it, vi } from 'vitest';
import { createSSRApp, h, useId } from 'vue';
import FormProvider from '../src/FormProvider.vue';
import Input from '../src/Input.vue';

function idConsumer(consumeId: boolean) {
    return {
        setup() {
            if (consumeId) {
                useId();
            }
            return () => h('span', { 'data-id-consumer': '' });
        },
    };
}

async function hydrate(serverRoot: object, clientRoot: object) {
    const container = document.createElement('div');
    container.innerHTML = await renderToString(createSSRApp(serverRoot));
    document.body.appendChild(container);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const app = createSSRApp(clientRoot);
    app.mount(container);

    return {
        container,
        warn,
        cleanup() {
            app.unmount();
            warn.mockRestore();
            container.remove();
        },
    };
}

describe('SSR field ids', () => {
    it('hydrates a named field when other components consume different ids', async () => {
        const root = (consumeId: boolean) => ({
            render: () =>
                h('main', [
                    h(idConsumer(consumeId)),
                    h(FormProvider, null, () =>
                        h(Input, { name: 'email', label: 'Email' }),
                    ),
                ]),
        });
        const result = await hydrate(root(true), root(false));

        expect(result.warn).not.toHaveBeenCalled();
        expect(result.container.querySelector('label')?.htmlFor).toBe('field-email');
        expect(result.container.querySelector('input')?.id).toBe('field-email');
        result.cleanup();
    });

    it('preserves an explicit field id during hydration', async () => {
        const root = {
            render: () => h(Input, { id: 'contact-email', name: 'email', label: 'Email' }),
        };
        const result = await hydrate(root, root);

        expect(result.warn).not.toHaveBeenCalled();
        expect(result.container.querySelector('label')?.htmlFor).toBe('contact-email');
        expect(result.container.querySelector('input')?.id).toBe('contact-email');
        result.cleanup();
    });

    it('falls back to useId when neither id nor name is supplied', async () => {
        const root = { render: () => h(Input, { label: 'Value' }) };
        const result = await hydrate(root, root);
        const inputId = result.container.querySelector('input')?.id;

        expect(result.warn).not.toHaveBeenCalled();
        expect(inputId).toMatch(/^field-/);
        expect(result.container.querySelector('label')?.htmlFor).toBe(inputId);
        result.cleanup();
    });

    it('scopes duplicate field names with stable form ids', async () => {
        const root = {
            render: () =>
                h('main', [
                    h(FormProvider, { id: 'billing' }, () =>
                        h(Input, { name: 'email', label: 'Billing email' }),
                    ),
                    h(FormProvider, { id: 'shipping' }, () =>
                        h(Input, { name: 'email', label: 'Shipping email' }),
                    ),
                ]),
        };
        const result = await hydrate(root, root);
        const ids = [...result.container.querySelectorAll('input')].map(
            (input) => input.id,
        );

        expect(result.warn).not.toHaveBeenCalled();
        expect(ids).toEqual(['field-billing-email', 'field-shipping-email']);
        expect(new Set(ids).size).toBe(2);
        result.cleanup();
    });
});
