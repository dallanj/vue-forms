import { computed, ref } from 'vue';
import type { Ref } from 'vue';
import type { ErrorRecord, FieldError } from '../types';
import { normalizeError, normalizeErrors } from './normalizeErrors';

export function useFormErrors(initialErrors: unknown = {}) {
    const errors: Ref<ErrorRecord> = ref(normalizeErrors(initialErrors));

    const get = (name: string): string | null =>
        normalizeError(errors.value[name]);
    const has = (name: string): boolean => get(name) !== null;
    const set = (name: string, error: FieldError): void => {
        const normalized = normalizeError(error);

        if (normalized) {
            errors.value = { ...errors.value, [name]: normalized };
        } else {
            clear(name);
        }
    };
    const clear = (name: string): void => {
        const remaining = { ...errors.value };

        delete remaining[name];
        errors.value = remaining;
    };
    const clearAll = (): void => {
        errors.value = {};
    };
    const setErrors = (value: unknown): void => {
        errors.value = normalizeErrors(value);
    };

    return {
        errors,
        hasErrors: computed(() => Object.keys(errors.value).length > 0),
        get,
        has,
        set,
        clear,
        clearAll,
        setErrors,
    };
}
