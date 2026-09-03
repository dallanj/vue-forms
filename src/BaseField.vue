<script setup lang="ts">
import { computed } from 'vue';
import type { HTMLAttributes } from 'vue';
import { useField } from './composables/useField';
import type { FieldError } from './types';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
    id?: string;
    name?: string;
    label?: string;
    help?: string;
    error?: FieldError;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    wrapperClass?: HTMLAttributes['class'];
}>();

const field = useField({
    id: () => props.id,
    name: () => props.name,
    error: () => props.error,
    required: () => props.required,
    disabled: () => props.disabled,
    readonly: () => props.readonly,
});
const hasHelp = computed(() => Boolean(props.help));
const ariaDescribedBy = field.describedBy(hasHelp);
</script>

<template>
    <div
        :class="['form-field', wrapperClass]"
        :data-invalid="field.hasError.value || undefined"
    >
        <label
            v-if="label || $slots.label"
            class="form-field__label"
            :for="field.inputId.value"
        >
            <slot name="label">{{ label }}</slot>
            <span
                v-if="required"
                class="form-field__required"
                aria-hidden="true"
                >*</span
            >
        </label>
        <p
            v-if="help || $slots.help"
            :id="field.helpId.value"
            class="form-field__help"
        >
            <slot name="help">{{ help }}</slot>
        </p>
        <slot
            :id="field.inputId.value"
            :error-id="field.errorId.value"
            :help-id="field.helpId.value"
            :has-error="field.hasError.value"
            :invalid="field.ariaInvalid.value"
            :described-by="ariaDescribedBy"
            :request-clear-error="field.requestClearError"
        />
        <p
            v-if="field.hasError.value || $slots.error"
            :id="field.errorId.value"
            class="form-field__error"
            role="alert"
        >
            <slot name="error" :error="field.errorMessage.value">{{
                field.errorMessage.value
            }}</slot>
        </p>
    </div>
</template>
