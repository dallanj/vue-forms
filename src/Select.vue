<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue';
import type { HTMLAttributes } from 'vue';
import BaseField from './BaseField.vue';
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
        searchable?: boolean;
        labelKey?: string;
        valueKey?: string;
        inputClass?: HTMLAttributes['class'];
    }>(),
    { labelKey: 'label', valueKey: 'value' },
);
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>();
const attrs = useAttrs();
const query = ref('');
const optionLabel = (option: SelectOption | string | number): string =>
    typeof option === 'object'
        ? String(option[props.labelKey] ?? '')
        : String(option);
const optionValue = (option: SelectOption | string | number): unknown =>
    typeof option === 'object' ? option[props.valueKey] : option;
const filteredOptions = computed(() =>
    props.options.filter((option) =>
        optionLabel(option)
            .toLocaleLowerCase()
            .includes(query.value.toLocaleLowerCase()),
    ),
);
const selectedValue = computed(
    () => props.modelValue ?? props.defaultValue ?? '',
);

function update(event: Event, clear: (trigger: 'change') => void): void {
    const raw = (event.target as HTMLSelectElement).value;
    const option = props.options.find(
        (item) => String(optionValue(item)) === raw,
    );
    emit('update:modelValue', option ? optionValue(option) : null);
    clear('change');
}
</script>

<template>
    <BaseField v-bind="props" :wrapper-class="attrs.class">
        <template #default="field">
            <input
                v-if="searchable"
                v-model="query"
                class="form-control form-select__search"
                type="search"
                :aria-label="`Filter ${label ?? name ?? 'options'}`"
            />
            <select
                :id="field.id"
                :name="name"
                :value="selectedValue"
                :required="required"
                :disabled="disabled || readonly"
                :aria-readonly="readonly || undefined"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedBy"
                :class="['form-control form-control--select', inputClass]"
                @change="update($event, field.requestClearError)"
                @input="field.requestClearError('input')"
                @blur="field.requestClearError('blur')"
            >
                <option v-if="placeholder" value="" :disabled="required">
                    {{ placeholder }}
                </option>
                <option
                    v-for="option in filteredOptions"
                    :key="String(optionValue(option))"
                    :value="String(optionValue(option))"
                >
                    <slot name="option" :option="option">{{
                        optionLabel(option)
                    }}</slot>
                </option>
            </select>
        </template>
    </BaseField>
</template>
