import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';
import CheckboxSelect from '../src/CheckboxSelect.vue';
import FormProvider from '../src/FormProvider.vue';
import MultiSelect from '../src/MultiSelect.vue';
import Select from '../src/Select.vue';

const options = [
    { label: 'Maple Street Veterinary', value: 'maple' },
    { label: 'Riverbend Animal Hospital', value: 'river' },
    { label: 'Oakfield Groomers', value: 'oak', disabled: true, note: 'Closed' },
];

/** The menu teleports to <body>, so it outlives an unmount-less assertion. */
afterEach(() => {
    document.body.innerHTML = '';
});

const menu = () => document.querySelector('.form-menu');
const rows = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.form-menu__option'));
const search = () =>
    document.querySelector<HTMLInputElement>('.form-menu__search input');

describe('Select', () => {
    it('shows the placeholder until a value is chosen', () => {
        const wrapper = mount(Select, {
            props: { options, placeholder: 'Pick one', name: 'org' },
        });
        expect(wrapper.get('button').text()).toContain('Pick one');
        expect(wrapper.get('input[type="hidden"]').attributes('value')).toBe('');
    });

    it('renders the selected label and carries it in a hidden input', () => {
        const wrapper = mount(Select, {
            props: { options, modelValue: 'river', name: 'org' },
        });
        expect(wrapper.get('button').text()).toContain('Riverbend Animal Hospital');
        expect(wrapper.get('input[type="hidden"]').attributes('value')).toBe('river');
    });

    it('opens a menu with the filter inside it, not as a second field', async () => {
        const wrapper = mount(Select, {
            props: { options, searchable: true, label: 'Organization' },
        });

        /** Only the hidden value input exists before the menu opens. */
        expect(wrapper.findAll('input')).toHaveLength(1);

        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();

        expect(menu()).not.toBeNull();
        expect(search()).not.toBeNull();
        expect(rows()).toHaveLength(3);
    });

    it('filters rows by the query and emits the chosen value', async () => {
        const wrapper = mount(Select, {
            props: { options, searchable: true },
        });
        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();

        const input = search()!;
        input.value = 'river';
        input.dispatchEvent(new Event('input'));
        await wrapper.vm.$nextTick();

        expect(rows()).toHaveLength(1);
        rows()[0].click();
        await wrapper.vm.$nextTick();

        expect(wrapper.emitted('update:modelValue')).toEqual([['river']]);
        expect(menu()).toBeNull();
    });

    it('leaves disabled options listed but inert, with their note', async () => {
        const wrapper = mount(Select, { props: { options } });
        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();

        const disabled = rows()[2];
        expect(disabled.getAttribute('aria-disabled')).toBe('true');
        expect(disabled.textContent).toContain('Closed');

        disabled.click();
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('hides the filter for a short list under the auto threshold', async () => {
        const wrapper = mount(Select, { props: { options } });
        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();

        expect(search()).toBeNull();
    });

    it('clears a provider error once a value is committed', async () => {
        const wrapper = mount(FormProvider, {
            props: { errors: { org: 'Required' }, onClearError: () => undefined },
            slots: { default: () => h(Select, { name: 'org', options }) },
        });
        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();
        rows()[0].click();
        await wrapper.vm.$nextTick();

        expect(wrapper.emitted('clearError')).toEqual([['org']]);
    });
});

describe('MultiSelect', () => {
    it('renders a chip per selection and one hidden input each', () => {
        const wrapper = mount(MultiSelect, {
            props: { options, modelValue: ['maple', 'river'], name: 'roles' },
        });
        const chips = wrapper.findAll('.form-chip__label');

        expect(chips.map((chip) => chip.text())).toEqual([
            'Maple Street Veterinary',
            'Riverbend Animal Hospital',
        ]);

        const hidden = wrapper.findAll('input[type="hidden"]');
        expect(hidden).toHaveLength(2);
        expect(hidden[0].attributes('name')).toBe('roles[]');
        expect(hidden.map((input) => input.attributes('value'))).toEqual([
            'maple',
            'river',
        ]);
    });

    it('adds to the selection and keeps the menu open', async () => {
        const wrapper = mount(MultiSelect, {
            props: { options, modelValue: ['maple'] },
        });
        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();

        rows()[1].click();
        await wrapper.vm.$nextTick();

        expect(wrapper.emitted('update:modelValue')).toEqual([
            [['maple', 'river']],
        ]);
        expect(menu()).not.toBeNull();
    });

    it('removes a selection from the menu and from its chip', async () => {
        const wrapper = mount(MultiSelect, {
            props: { options, modelValue: ['maple', 'river'] },
        });

        await wrapper.get('.form-chip__remove').trigger('click');
        expect(wrapper.emitted('update:modelValue')![0]).toEqual([['river']]);

        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();
        rows()[0].click();
        await wrapper.vm.$nextTick();

        expect(wrapper.emitted('update:modelValue')![1]).toEqual([['river']]);
    });

    it('drops the last chip on backspace while closed', async () => {
        const wrapper = mount(MultiSelect, {
            props: { options, modelValue: ['maple', 'river'] },
        });
        await wrapper.get('button').trigger('keydown', { key: 'Backspace' });

        expect(wrapper.emitted('update:modelValue')).toEqual([[['maple']]]);
    });
});

describe('CheckboxSelect', () => {
    it('names a small selection and counts a large one', async () => {
        const wrapper = mount(CheckboxSelect, {
            props: { options, modelValue: ['maple'] },
        });
        expect(wrapper.get('button').text()).toContain('Maple Street Veterinary');

        await wrapper.setProps({ modelValue: ['maple', 'river', 'oak'] });
        expect(wrapper.get('button').text()).toContain('3 selected');
    });

    it('marks checked rows and toggles them without closing', async () => {
        const wrapper = mount(CheckboxSelect, {
            props: { options, modelValue: ['maple'], name: 'roles' },
        });
        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();

        const boxes = document.querySelectorAll('.form-checkbox');
        expect(boxes[0].getAttribute('data-checked')).toBe('true');
        expect(boxes[1].getAttribute('data-checked')).toBeNull();

        rows()[1].click();
        await wrapper.vm.$nextTick();

        expect(wrapper.emitted('update:modelValue')).toEqual([
            [['maple', 'river']],
        ]);
        expect(menu()).not.toBeNull();
    });

    it('has no filter by default, being meant for short lists', async () => {
        const wrapper = mount(CheckboxSelect, { props: { options } });
        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();

        expect(search()).toBeNull();
    });
});

/**
 * A native <select> held its own state, so a field given only `defaultValue`
 * still worked. The button-and-menu fields have to reproduce that, or a form
 * without `v-model` silently refuses to change.
 */
describe('uncontrolled use', () => {
    it('Select tracks its own selection when given only a default', async () => {
        const wrapper = mount(Select, {
            props: { options, defaultValue: 'maple', name: 'org' },
        });
        expect(wrapper.get('button').text()).toContain('Maple Street Veterinary');

        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();
        rows()[1].click();
        await wrapper.vm.$nextTick();

        expect(wrapper.get('button').text()).toContain('Riverbend Animal Hospital');
        expect(wrapper.get('input[type="hidden"]').attributes('value')).toBe('river');
    });

    it('MultiSelect adds and removes chips when given only a default', async () => {
        const wrapper = mount(MultiSelect, {
            props: { options, defaultValue: ['maple'], name: 'roles' },
        });

        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();
        rows()[1].click();
        await wrapper.vm.$nextTick();

        expect(wrapper.findAll('.form-chip__label').map((c) => c.text())).toEqual([
            'Maple Street Veterinary',
            'Riverbend Animal Hospital',
        ]);
        expect(
            wrapper.findAll('input[type="hidden"]').map((i) => i.attributes('value')),
        ).toEqual(['maple', 'river']);

        await wrapper.get('.form-chip__remove').trigger('click');
        expect(
            wrapper.findAll('input[type="hidden"]').map((i) => i.attributes('value')),
        ).toEqual(['river']);
    });

    it('CheckboxSelect tracks its own selection when given only a default', async () => {
        const wrapper = mount(CheckboxSelect, {
            props: { options, defaultValue: ['maple'], name: 'roles' },
        });

        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();
        rows()[1].click();
        await wrapper.vm.$nextTick();

        /** Two is within summaryLimit, so both are named rather than counted. */
        expect(wrapper.get('button').text()).toContain('Maple Street Veterinary');
        expect(wrapper.get('button').text()).toContain('Riverbend Animal Hospital');
    });

    it('lets an explicit modelValue keep control of the field', async () => {
        const wrapper = mount(Select, {
            props: { options, modelValue: 'maple', defaultValue: 'river' },
        });
        expect(wrapper.get('button').text()).toContain('Maple Street Veterinary');

        await wrapper.get('button').trigger('click');
        await wrapper.vm.$nextTick();
        rows()[1].click();
        await wrapper.vm.$nextTick();

        /** The parent owns the value, so the trigger must not move on its own. */
        expect(wrapper.emitted('update:modelValue')).toEqual([['river']]);
        expect(wrapper.get('button').text()).toContain('Maple Street Veterinary');
    });
});
