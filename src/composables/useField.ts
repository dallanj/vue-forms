import { computed, inject, toValue, useId } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { formContextKey } from '../types';
import type { FieldError } from '../types';
import { normalizeError } from './normalizeErrors';

interface UseFieldOptions {
    id?: MaybeRefOrGetter<string | undefined>;
    name?: MaybeRefOrGetter<string | undefined>;
    error?: MaybeRefOrGetter<FieldError>;
    disabled?: MaybeRefOrGetter<boolean | undefined>;
    readonly?: MaybeRefOrGetter<boolean | undefined>;
    required?: MaybeRefOrGetter<boolean | undefined>;
}

export function useField(options: UseFieldOptions) {
    const context = inject(formContextKey, null);
    const generatedId = `field-${useId().replaceAll(':', '')}`;
    const inputId = computed(() => toValue(options.id) || generatedId);
    const name = computed(() => toValue(options.name));
    const explicitError = computed(() => toValue(options.error));
    const errorMessage = computed(() => {
        if (explicitError.value !== undefined) {
            return normalizeError(explicitError.value);
        }

        return normalizeError(
            name.value ? context?.errors.value[name.value] : null,
        );
    });
    const hasError = computed(() => errorMessage.value !== null);
    const helpId = computed(() => `${inputId.value}-help`);
    const errorId = computed(() => `${inputId.value}-error`);
    const describedBy = (hasHelp: MaybeRefOrGetter<boolean>) =>
        computed(() => {
            return (
                [
                    toValue(hasHelp) ? helpId.value : null,
                    hasError.value ? errorId.value : null,
                ]
                    .filter(Boolean)
                    .join(' ') || undefined
            );
        });
    const requestClearError = (trigger: 'input' | 'change' | 'blur'): void => {
        if (name.value) {
            context?.requestClearError(name.value, trigger);
        }
    };

    return {
        inputId,
        helpId,
        errorId,
        errorMessage,
        hasError,
        ariaInvalid: computed(() => hasError.value || undefined),
        describedBy,
        disabled: computed(() => Boolean(toValue(options.disabled))),
        readonly: computed(() => Boolean(toValue(options.readonly))),
        required: computed(() => Boolean(toValue(options.required))),
        requestClearError,
    };
}
