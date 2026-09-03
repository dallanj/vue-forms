<script setup lang="ts">
import { computed } from 'vue';
import Input from './Input.vue';
import type { FieldError } from './types';

const props = defineProps<{
    modelValue?: string | null;
    defaultValue?: string | null;
    name?: string;
    id?: string;
    label?: string;
    help?: string;
    error?: FieldError;
    mask?: string;
    preset?: 'ca-postal';
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const resolvedMask = computed(
    () => props.mask ?? (props.preset === 'ca-postal' ? 'A#A #A#' : ''),
);

function applyMask(value: string): string {
    if (!resolvedMask.value) {
        return value;
    }

    const source = value.replace(/[^a-z0-9]/gi, '');
    let sourceIndex = 0;
    let output = '';

    for (const token of resolvedMask.value) {
        if (sourceIndex >= source.length) {
            break;
        }

        if (token === '#' || token === 'A' || token === '*') {
            const pattern =
                token === '#'
                    ? /[0-9]/
                    : token === 'A'
                      ? /[a-z]/i
                      : /[a-z0-9]/i;

            while (
                sourceIndex < source.length &&
                !pattern.test(source[sourceIndex])
            ) {
                sourceIndex++;
            }

            if (sourceIndex < source.length) {
                output +=
                    token === 'A'
                        ? source[sourceIndex].toUpperCase()
                        : source[sourceIndex];
                sourceIndex++;
            }
        } else {
            output += token;
        }
    }

    return output;
}
</script>

<template>
    <Input
        v-bind="props"
        :model-value="modelValue ?? defaultValue"
        @update:model-value="emit('update:modelValue', applyMask($event))"
    />
</template>
