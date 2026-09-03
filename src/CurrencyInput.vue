<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { HTMLAttributes } from 'vue';
import BaseField from './BaseField.vue';
import type { FieldError } from './types';

const props = withDefaults(
    defineProps<{
        modelValue?: number | null;
        defaultValue?: number | null;
        name?: string;
        id?: string;
        label?: string;
        help?: string;
        error?: FieldError;
        currency?: string;
        locale?: string;
        required?: boolean;
        disabled?: boolean;
        readonly?: boolean;
        allowNegative?: boolean;
        inputClass?: HTMLAttributes['class'];
    }>(),
    { currency: 'CAD', locale: 'en-CA', allowNegative: true },
);
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>();
const focused = ref(false);
const currentValue = computed(
    () => props.modelValue ?? props.defaultValue ?? null,
);
const formatter = computed(
    () =>
        new Intl.NumberFormat(props.locale, {
            style: 'currency',
            currency: props.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }),
);
const decimalSeparator = computed(
    () =>
        formatter.value
            .formatToParts(1.1)
            .find((part) => part.type === 'decimal')?.value ?? '.',
);
const groupSeparator = computed(
    () =>
        formatter.value
            .formatToParts(1000)
            .find((part) => part.type === 'group')?.value ?? ',',
);
const displayValue = ref(
    currentValue.value === null
        ? ''
        : formatter.value.format(currentValue.value),
);

watch([currentValue, formatter], () => {
    if (!focused.value) {
        displayValue.value =
            currentValue.value === null
                ? ''
                : formatter.value.format(currentValue.value);
    }
});

function parse(value: string): number | null {
    const normalized = value
        .replaceAll(groupSeparator.value, '')
        .replace(decimalSeparator.value, '.')
        .replace(/[^0-9.-]/g, '');
    const parsed = Number.parseFloat(normalized);

    if (!Number.isFinite(parsed)) {
        return null;
    }

    return props.allowNegative ? parsed : Math.max(0, parsed);
}

function focus(): void {
    focused.value = true;
    displayValue.value =
        currentValue.value === null ? '' : String(currentValue.value);
}

function input(event: Event, clear: (trigger: 'input') => void): void {
    displayValue.value = (event.target as HTMLInputElement).value;
    emit('update:modelValue', parse(displayValue.value));
    clear('input');
}

function blur(clear: (trigger: 'blur') => void): void {
    focused.value = false;
    const parsed = parse(displayValue.value);
    displayValue.value = parsed === null ? '' : formatter.value.format(parsed);
    clear('blur');
}
</script>

<template>
    <BaseField v-bind="props">
        <template #default="field">
            <input
                v-if="name"
                type="hidden"
                :name="name"
                :value="currentValue ?? ''"
            />
            <input
                :id="field.id"
                inputmode="decimal"
                :value="displayValue"
                :required="required"
                :disabled="disabled"
                :readonly="readonly"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedBy"
                :class="['form-control', inputClass]"
                @focus="focus"
                @input="input($event, field.requestClearError)"
                @change="field.requestClearError('change')"
                @blur="blur(field.requestClearError)"
            />
        </template>
    </BaseField>
</template>
