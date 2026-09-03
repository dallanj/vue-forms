<script setup lang="ts">
import { provide, toRef } from 'vue';
import { formContextKey } from './types';
import type { ClearErrorTrigger, ErrorRecord } from './types';

const props = withDefaults(
    defineProps<{
        errors?: ErrorRecord;
        clearErrorOn?: ClearErrorTrigger;
    }>(),
    {
        errors: () => ({}),
        clearErrorOn: 'input',
    },
);

const emit = defineEmits<{
    clearError: [name: string];
}>();

const errors = toRef(props, 'errors');
const clearErrorTrigger = toRef(props, 'clearErrorOn');

provide(formContextKey, {
    errors,
    clearErrorTrigger,
    requestClearError(name, trigger) {
        if (clearErrorTrigger.value === trigger) {
            emit('clearError', name);
        }
    },
});
</script>

<template>
    <slot />
</template>
