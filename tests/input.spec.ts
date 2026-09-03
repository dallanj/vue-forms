import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import FormProvider from '../src/FormProvider.vue';
import Input from '../src/Input.vue';

describe('Input', () => {
    it('uses provider errors and wires accessibility attributes', () => {
        const wrapper = mount({
            render: () => h(FormProvider, { errors: { email: ['Required'] } }, () =>
                h(Input, { name: 'email', label: 'Email', help: 'Public address' }),
            ),
        });
        const input = wrapper.get('input');
        expect(input.attributes('aria-invalid')).toBe('true');
        expect(input.attributes('aria-describedby')).toContain('-help');
        expect(input.attributes('aria-describedby')).toContain('-error');
        expect(wrapper.text()).toContain('Required');
    });

    it('prefers an explicit error and requests clearing on input', async () => {
        const wrapper = mount(FormProvider, {
            props: { errors: { email: 'Provider' }, onClearError: () => undefined },
            slots: { default: () => h(Input, { name: 'email', error: 'Explicit' }) },
        });
        expect(wrapper.text()).toContain('Explicit');
        expect(wrapper.text()).not.toContain('Provider');
        await wrapper.get('input').setValue('new@example.com');
        expect(wrapper.emitted('clearError')).toEqual([['email']]);
    });
});
