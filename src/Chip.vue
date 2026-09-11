<script setup lang="ts">
withDefaults(
    defineProps<{
        label?: string;
        removable?: boolean;
        removeLabel?: string;
        /**
         * Chips rendered inside another button (MultiSelect's trigger) can't
         * use a nested <button>, so the remove affordance falls back to a
         * span with an explicit role.
         */
        removeAs?: 'button' | 'span';
    }>(),
    { removable: false, removeAs: 'button' },
);

defineEmits<{ remove: [] }>();
</script>

<template>
    <span class="form-chip">
        <span class="form-chip__label"><slot>{{ label }}</slot></span>
        <component
            :is="removeAs"
            v-if="removable"
            class="form-chip__remove"
            :type="removeAs === 'button' ? 'button' : undefined"
            :role="removeAs === 'span' ? 'button' : undefined"
            :tabindex="removeAs === 'span' ? -1 : undefined"
            :aria-label="removeLabel ?? `Remove ${label ?? ''}`.trim()"
            @click.stop="$emit('remove')"
            >&#215;</component
        >
    </span>
</template>
