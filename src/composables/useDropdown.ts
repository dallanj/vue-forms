import {
    computed,
    nextTick,
    onBeforeUnmount,
    reactive,
    ref,
    toValue,
    watch,
} from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';

export type DropdownPlacement = 'top' | 'bottom';

interface UseDropdownOptions {
    /** Number of rows currently rendered, so keyboard wrapping stays in range. */
    count: MaybeRefOrGetter<number>;
    disabled?: MaybeRefOrGetter<boolean | undefined>;
    /** Row to highlight when the menu opens, e.g. the current selection. */
    initialIndex?: () => number;
    /** Called when a row is committed with Enter or a click. */
    onCommit: (index: number) => void;
    /** Menus that stay open on commit (multi-select) pass false. */
    closeOnCommit?: MaybeRefOrGetter<boolean>;
}

const MENU_GAP = 4;
const MENU_MAX = 320;
const VIEWPORT_MARGIN = 8;
const MIN_BELOW = 200;

/**
 * Open/close, placement and keyboard behaviour shared by every menu-backed
 * field.
 *
 * The menu is teleported to <body> and positioned fixed rather than being
 * absolutely positioned inside the field. A field inside a dialog, a scroll
 * container or anything with `overflow: hidden` would otherwise have its menu
 * clipped, and this component is used inside exactly those. Teleporting escapes
 * every overflow and stacking context, at the cost of having to track the
 * trigger's position ourselves.
 */
export function useDropdown(options: UseDropdownOptions) {
    const isOpen = ref(false);
    const query = ref('');
    const activeIndex = ref(0);
    const triggerRef = ref<HTMLElement | null>(null);
    const menuRef = ref<HTMLElement | null>(null);
    const searchRef = ref<HTMLInputElement | null>(null);

    const position = reactive({
        top: 0,
        left: 0,
        width: 0,
        maxHeight: MENU_MAX,
        placement: 'bottom' as DropdownPlacement,
    });

    function updatePosition(): void {
        const trigger = triggerRef.value;
        if (!trigger) {
            return;
        }

        const rect = trigger.getBoundingClientRect();
        const below = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
        const above = rect.top - MENU_GAP - VIEWPORT_MARGIN;
        /** Only flip when below is genuinely cramped and above is roomier. */
        const flip = below < Math.min(MENU_MAX, MIN_BELOW) && above > below;

        position.placement = flip ? 'top' : 'bottom';
        position.maxHeight = Math.max(140, Math.min(MENU_MAX, flip ? above : below));
        position.width = rect.width;
        position.left = rect.left;
        position.top = flip ? rect.top - MENU_GAP : rect.bottom + MENU_GAP;
    }

    const menuStyle = computed(() => ({
        position: 'fixed' as const,
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        maxHeight: `${position.maxHeight}px`,
        /**
         * When flipped, `top` marks the trigger's upper edge, so the menu is
         * shifted up by its own height rather than being measured first.
         */
        transform: position.placement === 'top' ? 'translateY(-100%)' : 'none',
    }));

    function bindViewportListeners(): void {
        /** Capture phase, so scrolling any ancestor keeps the menu anchored. */
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
    }

    function unbindViewportListeners(): void {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
    }

    async function open(): Promise<void> {
        if (toValue(options.disabled)) {
            return;
        }

        query.value = '';
        updatePosition();
        isOpen.value = true;
        activeIndex.value = Math.max(0, options.initialIndex?.() ?? 0);

        await nextTick();
        updatePosition();
        searchRef.value?.focus();
        bindViewportListeners();
    }

    function close(refocus = true): void {
        if (!isOpen.value) {
            return;
        }

        isOpen.value = false;
        query.value = '';
        unbindViewportListeners();

        if (refocus) {
            triggerRef.value?.focus();
        }
    }

    function toggle(): void {
        isOpen.value ? close() : void open();
    }

    function commit(index: number): void {
        options.onCommit(index);

        if (toValue(options.closeOnCommit) ?? true) {
            close();
        }
    }

    function move(delta: number): void {
        const count = toValue(options.count);
        if (!count) {
            return;
        }

        activeIndex.value = (activeIndex.value + delta + count) % count;
        scrollActiveIntoView();
    }

    function scrollActiveIntoView(): void {
        void nextTick(() => {
            menuRef.value
                ?.querySelector('[data-active="true"]')
                ?.scrollIntoView({ block: 'nearest' });
        });
    }

    function onTriggerKeydown(event: KeyboardEvent): void {
        if (isOpen.value) {
            return;
        }

        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
            event.preventDefault();
            void open();
        }
    }

    function onMenuKeydown(event: KeyboardEvent): void {
        if (!isOpen.value) {
            return;
        }

        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                return close();
            case 'Tab':
                return close(false);
            case 'ArrowDown':
                event.preventDefault();
                return move(1);
            case 'ArrowUp':
                event.preventDefault();
                return move(-1);
            case 'Home':
                event.preventDefault();
                activeIndex.value = 0;
                return scrollActiveIntoView();
            case 'End':
                event.preventDefault();
                activeIndex.value = Math.max(0, toValue(options.count) - 1);
                return scrollActiveIntoView();
            case 'Enter':
                event.preventDefault();
                if (toValue(options.count) > 0) {
                    commit(activeIndex.value);
                }
                return;
            default:
        }
    }

    /**
     * The menu is teleported out of the field, so it is not a DOM descendant of
     * the root any more and has to be treated as "inside" explicitly.
     */
    function onDocumentPointerDown(event: Event): void {
        if (!isOpen.value) {
            return;
        }

        const target = event.target as Node;
        if (triggerRef.value?.contains(target) || menuRef.value?.contains(target)) {
            return;
        }

        close(false);
    }

    watch(isOpen, (open) => {
        if (typeof document === 'undefined') {
            return;
        }

        open
            ? document.addEventListener('pointerdown', onDocumentPointerDown, true)
            : document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    });

    /** Typing a new filter invalidates whichever row was highlighted. */
    watch(query, () => {
        activeIndex.value = 0;
    });

    onBeforeUnmount(() => {
        unbindViewportListeners();
        if (typeof document !== 'undefined') {
            document.removeEventListener('pointerdown', onDocumentPointerDown, true);
        }
    });

    return {
        isOpen: isOpen as Ref<boolean>,
        query,
        activeIndex,
        triggerRef,
        menuRef,
        searchRef,
        menuStyle,
        open,
        close,
        toggle,
        commit,
        onTriggerKeydown,
        onMenuKeydown,
        updatePosition,
    };
}
