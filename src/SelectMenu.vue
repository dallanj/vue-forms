<script setup lang="ts">
import type { CSSProperties, Ref } from 'vue';

/**
 * The teleported menu shell shared by Select, MultiSelect and CheckboxSelect.
 * It owns the popover chrome and the filter box; callers render the rows.
 *
 * `elRef` is handed in rather than exposed, because the dropdown behaviour
 * needs the live element for outside-click detection and for scrolling the
 * active row into view, and Teleport puts it outside the caller's tree.
 */
const props = defineProps<{
    open: boolean;
    style: CSSProperties;
    searchable: boolean;
    searchLabel: string;
    listboxId: string;
    elRef: Ref<HTMLElement | null>;
    searchRef: Ref<HTMLInputElement | null>;
    multiple?: boolean;
    activeId?: string;
    emptyText?: string;
    isEmpty?: boolean;
}>();

const query = defineModel<string>('query', { default: '' });

defineEmits<{ keydown: [event: KeyboardEvent] }>();

const setMenu = (el: unknown): void => {
    props.elRef.value = (el as HTMLElement | null) ?? null;
};
const setSearch = (el: unknown): void => {
    props.searchRef.value = (el as HTMLInputElement | null) ?? null;
};
</script>

<template>
    <Teleport to="body">
        <div
            v-if="open"
            :ref="setMenu"
            class="form-menu"
            :style="style"
            @keydown="$emit('keydown', $event)"
        >
            <div v-if="searchable" class="form-menu__search">
                <input
                    :ref="setSearch"
                    v-model="query"
                    class="form-control"
                    type="text"
                    autocomplete="off"
                    role="combobox"
                    aria-expanded="true"
                    aria-autocomplete="list"
                    :aria-label="searchLabel"
                    :aria-controls="listboxId"
                    :aria-activedescendant="activeId"
                />
            </div>
            <ul
                :id="listboxId"
                class="form-menu__list"
                role="listbox"
                :aria-multiselectable="multiple || undefined"
                :tabindex="searchable ? undefined : -1"
            >
                <slot />
                <li v-if="isEmpty" class="form-menu__empty">
                    {{ emptyText ?? 'No matches' }}
                </li>
            </ul>
        </div>
    </Teleport>
</template>
