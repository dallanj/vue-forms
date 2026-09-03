<script setup lang="ts">
import { computed } from 'vue';
import FormProvider from '../FormProvider.vue';
import type { ClearErrorTrigger, ErrorRecord } from '../types';

interface InertiaFormLike {
    errors: ErrorRecord;
    clearErrors: (...fields: string[]) => void;
}

const props = withDefaults(
    defineProps<{
        form?: InertiaFormLike;
        errors?: ErrorRecord;
        clearErrors?: (...fields: string[]) => void;
        clearErrorOn?: ClearErrorTrigger;
    }>(),
    { errors: () => ({}), clearErrorOn: 'input' },
);

const resolvedErrors = computed(() => props.form?.errors ?? props.errors);
const clear = (name: string): void =>
    (props.form?.clearErrors ?? props.clearErrors)?.(name);
</script>

<template>
    <FormProvider
        :errors="resolvedErrors"
        :clear-error-on="clearErrorOn"
        @clear-error="clear"
    >
        <slot />
    </FormProvider>
</template>
