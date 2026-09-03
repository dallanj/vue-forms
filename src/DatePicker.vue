<script setup lang="ts">
import Input from './Input.vue';
import type { FieldError } from './types';

defineProps<{
    modelValue?: string | null;
    defaultValue?: string | null;
    name?: string;
    id?: string;
    label?: string;
    help?: string;
    error?: FieldError;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
}>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
    <Input
        v-bind="$props"
        type="date"
        @update:model-value="$emit('update:modelValue', $event)"
    />
</template>
