import type { ErrorRecord, FieldError } from '../types';

export function normalizeError(error: FieldError): string | null {
    if (Array.isArray(error)) {
        return (
            error.find(
                (message) => typeof message === 'string' && message.length > 0,
            ) ?? null
        );
    }

    return typeof error === 'string' && error.length > 0 ? error : null;
}

export function normalizeErrors(input: unknown): ErrorRecord {
    if (typeof input === 'string' || Array.isArray(input)) {
        return { _form: normalizeError(input as FieldError) };
    }

    if (!input || typeof input !== 'object') {
        return {};
    }

    const candidate = input as Record<string, unknown>;
    const source =
        candidate.errors && typeof candidate.errors === 'object'
            ? (candidate.errors as Record<string, unknown>)
            : candidate;

    return Object.fromEntries(
        Object.entries(source).flatMap(([name, error]) => {
            const normalized = normalizeError(error as FieldError);

            return normalized ? [[name, normalized]] : [];
        }),
    );
}
