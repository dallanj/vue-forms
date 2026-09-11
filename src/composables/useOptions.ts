import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { SelectOption } from '../types';

export type RawOption = SelectOption | string | number;

interface UseOptionsConfig {
    options: MaybeRefOrGetter<RawOption[]>;
    labelKey: MaybeRefOrGetter<string>;
    valueKey: MaybeRefOrGetter<string>;
    /** Key marking an option unselectable; it stays listed but inert. */
    disabledKey?: MaybeRefOrGetter<string>;
    /** Key holding a short reason shown against a disabled option. */
    noteKey?: MaybeRefOrGetter<string>;
    query: MaybeRefOrGetter<string>;
}

/**
 * Options may be plain strings/numbers or objects addressed by configurable
 * keys, so every field reads them through these helpers rather than indexing
 * directly.
 */
export function useOptions(config: UseOptionsConfig) {
    const optionLabel = (option: RawOption): string =>
        typeof option === 'object' && option !== null
            ? String(option[toValue(config.labelKey)] ?? '')
            : String(option);

    const optionValue = (option: RawOption): unknown =>
        typeof option === 'object' && option !== null
            ? option[toValue(config.valueKey)]
            : option;

    const optionDisabled = (option: RawOption): boolean =>
        typeof option === 'object' && option !== null
            ? Boolean(option[toValue(config.disabledKey ?? 'disabled')])
            : false;

    const optionNote = (option: RawOption): string | null => {
        if (typeof option !== 'object' || option === null) {
            return null;
        }

        const note = option[toValue(config.noteKey ?? 'note')];

        return note === undefined || note === null ? null : String(note);
    };

    const filtered = computed<RawOption[]>(() => {
        const query = toValue(config.query).trim().toLocaleLowerCase();
        const all = toValue(config.options);

        if (!query) {
            return all;
        }

        return all.filter((option) =>
            optionLabel(option).toLocaleLowerCase().includes(query),
        );
    });

    const findByValue = (value: unknown): RawOption | undefined =>
        toValue(config.options).find(
            (option) => String(optionValue(option)) === String(value),
        );

    return {
        optionLabel,
        optionValue,
        optionDisabled,
        optionNote,
        filtered,
        findByValue,
    };
}
