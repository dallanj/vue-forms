<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { HTMLAttributes } from 'vue';
import BaseField from './BaseField.vue';
import type { FieldError } from './types';

defineOptions({ inheritAttrs: false });
const props = defineProps<{
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
    inputClass?: HTMLAttributes['class'];
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const attrs = useAttrs();
const controlAttrs = computed(() =>
    Object.fromEntries(
        Object.entries(attrs).filter(([key]) => key !== 'class'),
    ),
);
</script>

<template>
    <BaseField v-bind="props" :wrapper-class="attrs.class">
        <template #default="field">
            <textarea
                v-bind="controlAttrs"
                :id="field.id"
                :name="name"
                :value="modelValue ?? defaultValue ?? ''"
                :required="required"
                :disabled="disabled"
                :readonly="readonly"
                :aria-invalid="field.invalid"
                :aria-describedby="field.describedBy"
                :class="['form-control form-control--textarea', inputClass]"
                @input="
                    emit(
                        'update:modelValue',
                        ($event.target as HTMLTextAreaElement).value,
                    );
                    field.requestClearError('input');
                "
                @change="field.requestClearError('change')"
                @blur="field.requestClearError('blur')"
            />
        </template>
    </BaseField>
</template>
