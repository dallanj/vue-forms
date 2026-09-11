<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue';
import type { HTMLAttributes } from 'vue';
import BaseField from './BaseField.vue';
import SelectMenu from './SelectMenu.vue';
import { useDropdown } from './composables/useDropdown';
import { useOptions } from './composables/useOptions';
import type { RawOption } from './composables/useOptions';
import type { FieldError, SelectOption } from './types';

defineOptions({ inheritAttrs: false });

/**
 * A multi-select whose menu rows are checkboxes, for short lists where seeing
 * every option and its state at once matters more than compact chips. The
 * trigger summarises the count rather than listing selections.
 */
const props = withDefaults(
    defineProps<{
        modelValue?: unknown[];
        defaultValue?: unknown[];
        options: Array<SelectOption | string | number>;
        name?: string;
        id?: string;
        label?: string;
        help?: string;
        error?: FieldError;
        placeholder?: string;
        required?: boolean;
        disabled?: boolean;
        readonly?: boolean;
        /** Off by default: this field exists for lists short enough to scan. */
        searchable?: boolean | 'auto';
        searchThreshold?: number;
        /** Up to this many selections are named in the trigger before it counts. */
        summaryLimit?: number;
        labelKey?: string;
        valueKey?: string;
        disabledKey?: string;
        noteKey?: string;
        emptyText?: string;
        inputClass?: HTMLAttributes['class'];
    }>(),
    {
        labelKey: 'label',
        valueKey: 'value',
        disabledKey: 'disabled',
        noteKey: 'note',
        searchable: false,
        searchThreshold: 10,
        summaryLimit: 2,
    },
);

const emit = defineEmits<{ 'update:modelValue': [value: unknown[]] }>();
const attrs = useAttrs();

const dropdown = useDropdown({
    count: () => filtered.value.length,
    disabled: () => props.disabled || props.readonly,
    closeOnCommit: false,
    onCommit: (index) => toggleOption(filtered.value[index]),
});

const { optionLabel, optionValue, optionDisabled, optionNote, filtered } =
    useOptions({
        options: () => props.options,
        labelKey: () => props.labelKey,
        valueKey: () => props.valueKey,
        disabledKey: () => props.disabledKey,
        noteKey: () => props.noteKey,
        query: dropdown.query,
    });

/**
 * Uncontrolled use is supported: with no `v-model`, `defaultValue` seeds
 * internal state that the field then owns. A native <select multiple> kept
 * that state in the DOM for free; a button-and-menu field has to hold it.
 * An explicit `modelValue` always wins, so controlled use is unchanged.
 */
const internalValue = ref<unknown[]>([...(props.defaultValue ?? [])]);
const selectedValues = computed<unknown[]>(() =>
    props.modelValue === undefined ? internalValue.value : props.modelValue,
);
const isSelected = (option: RawOption): boolean =>
    selectedValues.value.some(
        (value) => String(value) === String(optionValue(option)),
    );

const selectedOptions = computed(() =>
    props.options.filter((option) => isSelected(option)),
);

const summary = computed(() => {
    const selected = selectedOptions.value;

    if (!selected.length) {
        return '';
    }

    if (selected.length <= props.summaryLimit) {
        return selected.map(optionLabel).join(', ');
    }

    return `${selected.length} selected`;
});

const showSearch = computed(() =>
    props.searchable === 'auto'
        ? props.options.length >= props.searchThreshold
        : props.searchable,
);

type ClearError = (trigger: 'input' | 'change' | 'blur') => void;

/**
 * BaseField hands `requestClearError` to the slot, but selection is committed
 * from the dropdown's keyboard handler, which is outside template scope. The
 * trigger records it on interaction so both paths can clear the error.
 */
let clearError: ClearError | null = null;
const rememberClearError = (fn: ClearError): void => {
    clearError = fn;
};
/**
 * A native control fires input and change together, and a form may be
 * configured to clear on either, so a committed selection reports both.
 */
const reportChange = (): void => {
    clearError?.('input');
    clearError?.('change');
};

function toggleOption(option: RawOption | undefined): void {
    if (option === undefined || optionDisabled(option)) {
        return;
    }

    const value = optionValue(option);
    const next = isSelected(option)
        ? selectedValues.value.filter((item) => String(item) !== String(value))
        : [...selectedValues.value, value];

    internalValue.value = next;
    emit('update:modelValue', next);
    reportChange();
}
</script>

<template>
    <BaseField v-bind="props" :wrapper-class="attrs.class">
        <template #default="field">
            <input
                v-for="value in selectedValues"
                :key="String(value)"
                type="hidden"
                :name="name ? `${name}[]` : undefined"
                :value="String(value)"
            />
            <button
                :id="field.id"
                :ref="(el) => (dropdown.triggerRef.value = el as HTMLElement)"
                type="button"
                role="combobox"
                :aria-expanded="dropdown.isOpen.value"
                aria-haspopup="listbox"
                :aria-controls="`${field.id}-listbox`"
                :disabled="disabled || readonly"
                :aria-readonly="readonly || undefined"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedBy"
                :class="[
                    'form-control form-control--trigger',
                    { 'form-control--placeholder': !summary },
                    inputClass,
                ]"
                @click="
                    (rememberClearError(field.requestClearError),
                    dropdown.toggle())
                "
                @keydown="dropdown.onTriggerKeydown"
                @blur="field.requestClearError('blur')"
            >
                <span class="form-control__value">{{
                    summary || placeholder || 'Select options'
                }}</span>
                <span class="form-control__caret" aria-hidden="true"></span>
            </button>

            <SelectMenu
                v-model:query="dropdown.query.value"
                multiple
                :open="dropdown.isOpen.value"
                :style="dropdown.menuStyle.value"
                :searchable="showSearch"
                :search-label="`Filter ${label ?? name ?? 'options'}`"
                :listbox-id="`${field.id}-listbox`"
                :el-ref="dropdown.menuRef"
                :search-ref="dropdown.searchRef"
                :active-id="`${field.id}-option-${dropdown.activeIndex.value}`"
                :is-empty="filtered.length === 0"
                :empty-text="emptyText"
                @keydown="dropdown.onMenuKeydown"
            >
                <li
                    v-for="(option, index) in filtered"
                    :id="`${field.id}-option-${index}`"
                    :key="String(optionValue(option))"
                    class="form-menu__option form-menu__option--checkbox"
                    role="option"
                    :aria-selected="isSelected(option)"
                    :aria-disabled="optionDisabled(option) || undefined"
                    :data-active="index === dropdown.activeIndex.value"
                    :data-selected="isSelected(option) || undefined"
                    :data-disabled="optionDisabled(option) || undefined"
                    @mouseenter="dropdown.activeIndex.value = index"
                    @click="dropdown.commit(index)"
                >
                    <!-- Presentational: the row owns the click, and the row
                         already reports its state through aria-selected. -->
                    <span
                        class="form-checkbox"
                        :data-checked="isSelected(option) || undefined"
                        aria-hidden="true"
                        >&#10003;</span
                    >
                    <span class="form-menu__label">
                        <slot name="option" :option="option">{{
                            optionLabel(option)
                        }}</slot>
                    </span>
                    <span
                        v-if="optionDisabled(option) && optionNote(option)"
                        class="form-menu__note"
                        >{{ optionNote(option) }}</span
                    >
                </li>
            </SelectMenu>
        </template>
    </BaseField>
</template>
