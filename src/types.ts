import type { InjectionKey, Ref } from 'vue';

export type FieldError = string | string[] | null | undefined;
export type ErrorRecord = Record<string, FieldError>;
export type ClearErrorTrigger = 'input' | 'change' | 'blur' | 'never';

export interface FormContext {
    errors: Readonly<Ref<ErrorRecord>>;
    clearErrorTrigger: Readonly<Ref<ClearErrorTrigger>>;
    requestClearError: (
        name: string,
        trigger: Exclude<ClearErrorTrigger, 'never'>,
    ) => void;
}

export const formContextKey: InjectionKey<FormContext> = Symbol('forms');

export interface SelectOption {
    [key: string]: unknown;
}
