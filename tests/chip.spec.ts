import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Chip from '../src/Chip.vue';
import MultiSelect from '../src/MultiSelect.vue';

describe('Chip', () => {
    it('renders its label and no remove affordance by default', () => {
        const wrapper = mount(Chip, { props: { label: 'Dogs' } });

        expect(wrapper.find('.form-chip__label').text()).toBe('Dogs');
        expect(wrapper.find('.form-chip__remove').exists()).toBe(false);
    });

    it('prefers slot content over the label prop', () => {
        const wrapper = mount(Chip, {
            props: { label: 'Dogs' },
            slots: { default: 'Cats' },
        });

        expect(wrapper.find('.form-chip__label').text()).toBe('Cats');
    });

    it('emits remove from a real button when removable', async () => {
        const wrapper = mount(Chip, {
            props: { label: 'Dogs', removable: true },
        });
        const remove = wrapper.find('.form-chip__remove');

        expect(remove.element.tagName).toBe('BUTTON');
        expect(remove.attributes('type')).toBe('button');
        expect(remove.attributes('aria-label')).toBe('Remove Dogs');

        await remove.trigger('click');
        expect(wrapper.emitted('remove')).toHaveLength(1);
    });

    it('renders the remove affordance as a span when asked', () => {
        const wrapper = mount(Chip, {
            props: {
                label: 'Dogs',
                removable: true,
                removeAs: 'span',
                removeLabel: 'Clear Dogs',
            },
        });
        const remove = wrapper.find('.form-chip__remove');

        expect(remove.element.tagName).toBe('SPAN');
        expect(remove.attributes('role')).toBe('button');
        expect(remove.attributes('tabindex')).toBe('-1');
        expect(remove.attributes('aria-label')).toBe('Clear Dogs');
    });
});

describe('MultiSelect chips', () => {
    const options = [
        { value: 'dog', label: 'Dog' },
        { value: 'cat', label: 'Cat' },
    ];

    it('renders a chip per selected option and removes on click', async () => {
        const wrapper = mount(MultiSelect, {
            props: { modelValue: ['dog', 'cat'], options, label: 'Species' },
        });

        const chips = wrapper.findAll('.form-chip');
        expect(chips.map((chip) => chip.find('.form-chip__label').text())).toEqual([
            'Dog',
            'Cat',
        ]);

        // Nested <button> would be invalid markup inside the trigger button.
        expect(wrapper.find('.form-chip__remove').element.tagName).toBe('SPAN');

        await chips[0].find('.form-chip__remove').trigger('click');
        expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['cat']]);
    });

    it('hides the remove affordance when disabled', () => {
        const wrapper = mount(MultiSelect, {
            props: { modelValue: ['dog'], options, disabled: true },
        });

        expect(wrapper.find('.form-chip').exists()).toBe(true);
        expect(wrapper.find('.form-chip__remove').exists()).toBe(false);
    });
});
