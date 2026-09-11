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

const props = withDefaults(
    defineProps<{
        modelValue?: unknown;
        defaultValue?: unknown;
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
        /**
         * 'auto' shows the filter once the list is long enough to be awkward to
         * scan. Pass true or false to force it either way.
         */
        searchable?: boolean | 'auto';
        searchThreshold?: number;
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
        searchable: 'auto',
        searchThreshold: 10,
    },
);

const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>();
const attrs = useAttrs();

const dropdown = useDropdown({
    count: () => filtered.value.length,
    disabled: () => props.disabled || props.readonly,
    initialIndex: () =>
        filtered.value.findIndex((option) => isSelected(option)),
    onCommit: (index) => select(filtered.value[index]),
});

const {
    optionLabel,
    optionValue,
    optionDisabled,
    optionNote,
    filtered,
    findByValue,
} = useOptions({
    options: () => props.options,
    labelKey: () => props.labelKey,
    valueKey: () => props.valueKey,
    disabledKey: () => props.disabledKey,
    noteKey: () => props.noteKey,
    query: dropdown.query,
});

/**
 * Uncontrolled use is supported: with no `v-model`, `defaultValue` seeds
 * internal state that the field then owns. An explicit `modelValue` always
 * wins, so controlled use is unchanged.
 */
const internalValue = ref<unknown>(props.defaultValue);
const currentValue = computed(() =>
    props.modelValue === undefined ? internalValue.value : props.modelValue,
);
const isSelected = (option: RawOption): boolean =>
    currentValue.value !== undefined &&
    currentValue.value !== null &&
    String(optionValue(option)) === String(currentValue.value);

const selectedLabel = computed(() => {
    const selected = findByValue(currentValue.value);

    return selected === undefined ? '' : optionLabel(selected);
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

function select(option: RawOption | undefined): void {
    if (option === undefined || optionDisabled(option)) {
        return;
    }

    internalValue.value = optionValue(option);
    emit('update:modelValue', optionValue(option));
    reportChange();
}
</script>

<template>
    <BaseField v-bind="props" :wrapper-class="attrs.class">
        <template #default="field">
            <!-- The control is a button, so the value still has to reach a
                 native form submit. -->
            <input
                type="hidden"
                :name="name"
                :value="currentValue == null ? '' : String(currentValue)"
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
                    { 'form-control--placeholder': !selectedLabel },
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
                    selectedLabel || placeholder || 'Select an option'
                }}</span>
                <span class="form-control__caret" aria-hidden="true"></span>
            </button>

            <SelectMenu
                v-model:query="dropdown.query.value"
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
                    class="form-menu__option"
                    role="option"
                    :aria-selected="isSelected(option)"
                    :aria-disabled="optionDisabled(option) || undefined"
                    :data-active="index === dropdown.activeIndex.value"
                    :data-selected="isSelected(option) || undefined"
                    :data-disabled="optionDisabled(option) || undefined"
                    @mouseenter="dropdown.activeIndex.value = index"
                    @click="dropdown.commit(index)"
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
                    <span
                        v-else-if="isSelected(option)"
                        class="form-menu__check"
                        aria-hidden="true"
                        >&#10003;</span
                    >
                </li>
            </SelectMenu>
        </template>
    </BaseField>
</template>
