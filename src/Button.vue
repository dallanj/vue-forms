<script setup lang="ts">
import type { ButtonHTMLAttributes } from 'vue';

withDefaults(
    defineProps<{
        type?: ButtonHTMLAttributes['type'];
        disabled?: boolean;
    }>(),
    { type: 'button' },
);
</script>

<template>
    <button :type="type" :disabled="disabled" class="form-button">
        <slot />
    </button>
</template>
