<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { HTMLAttributes } from 'vue';
import BaseField from './BaseField.vue';
import type { FieldError } from './types';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
    modelValue?: string | number | null;
    defaultValue?: string | number | null;
    name?: string;
    id?: string;
    label?: string;
    help?: string;
    error?: FieldError;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    inputClass?: HTMLAttributes['class'];
}>();
const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();
const attrs = useAttrs();
const controlAttrs = computed(() =>
    Object.fromEntries(
        Object.entries(attrs).filter(([key]) => key !== 'class'),
    ),
);
const value = computed(() => props.modelValue ?? props.defaultValue ?? '');

function onInput(event: Event, clear: (trigger: 'input') => void): void {
    emit('update:modelValue', (event.target as HTMLInputElement).value);
    clear('input');
}
</script>

<template>
    <BaseField v-bind="props" :wrapper-class="attrs.class">
        <template #label
            ><slot name="label">{{ label }}</slot></template
        >
        <template v-if="$slots.help" #help><slot name="help" /></template>
        <template v-if="$slots.error" #error="slotProps"
            ><slot name="error" v-bind="slotProps"
        /></template>
        <template #default="field">
            <div class="form-control-wrap">
                <slot name="prefix" />
                <input
                    v-bind="controlAttrs"
                    :id="field.id"
                    :name="name"
                    :value="value"
                    :required="required"
                    :disabled="disabled"
                    :readonly="readonly"
                    :aria-invalid="field.invalid"
                    :aria-describedby="field.describedBy"
                    :class="['form-control', inputClass]"
                    @input="onInput($event, field.requestClearError)"
                    @change="field.requestClearError('change')"
                    @blur="field.requestClearError('blur')"
                />
                <slot name="suffix" />
            </div>
        </template>
    </BaseField>
</template>
