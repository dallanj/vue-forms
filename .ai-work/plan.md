# PetVet data table v2: extensive filters, actions, chips — and the package question

## Context

The current table stack (`app/Tables/*`, `app/Support/Tables/*`, `DataTable.vue`) already covers sorting, search, column visibility, saved views, bulk selection, and queued/policy-gated exports — verified by reading `TableDefinition.php`, `TableColumn.php`, `DataTable.vue`, `TableExportController.php`, and `GenerateTableExport.php` directly. What's missing, compared to the InertiaUI Table reference the user liked, is:

1. **Operator-selectable filters** ("does not contain" alongside "contains") — today's `Filter` contract (`vendor/dallanj/laravel-query-filters`) bakes the operator into the PHP class at definition time; the request only ever supplies a value.
2. **A unified Filters dropdown** — filters are currently hand-wired per page (see `Pets.vue`), duplicating markup and drifting silently if a backend filter key changes.
3. **A generic row/bulk actions dropdown** — `Staff.vue` already has the right *shape* (server-computed `can*` flags gate hand-built `DropdownMenu` markup) but every page reimplements it.
4. **Chip styling** for applied filters — turns out this already exists as `.form-chip` / `.form-chip__label` / `.form-chip__remove` inside `vue-forms/src/MultiSelect.vue` + `_select.scss`, themed via CSS vars layered on shadcn tokens (`--secondary`). It just isn't its own reusable component yet.

This plan sequences the changes needed across the three packages plus the PetVet app, keeping the existing security invariants (allowlisted sort columns, viewer-scoped `query()`, policy-gated exports, `prepare()`/`apply()` queue-safety) intact, and ends with a recommendation on the "should this become its own package" question.

## Phase 1 — `laravel-query-filters` (~/projects/query-filters): operator support

Today: `Filter::apply(Builder $query, mixed $value, FilterContext $context)` — no operator slot. `PartialFilter` only does `whereLike` (contains). `DateFilter` supports `=`/`<`/`<=`/`>`/`>=` but the operator is fixed by which builder method (`->greaterThanOrEqual()`) the *table definition* calls, not by the request.

Changes:
- Add an `OperableFilter` contract (or extend `Filter`) with `allowedOperators(): array<string>` and an `apply()` that receives the requested operator. Provide a base trait that validates the operator against the allowlist and **ignores/falls back silently** on anything unrecognized — mirroring the exact pattern `TableDefinition::applySort()` already uses for sort columns in PetVet, so a crafted operator can never reach SQL.
- `FilterInput` needs to accept either a bare value (existing filters keep working unchanged) or a `{operator, value}` shape for filters that opt in — backward compatible, no changes needed to `OrganizationPetsTable` etc. unless they're upgraded.
- New `TextFilter` (`contains | does_not_contain | equals | starts_with | ends_with`) as the operator-aware replacement for `PartialFilter` on free-text columns.
- Extend `DateFilter` (and add `NumericFilter`) to accept a requested operator from its own allowlist (`equals|before|after|between` / `equals|gt|lt|between`) instead of one fixed at construction.
- Add a `describe(): array` (or similar) method returning `{type, operators, options?}` per filter — this is the metadata PetVet's frontend needs to render a generic filter control without hand duplication.
- Tests: an unrecognized operator never reaches the query (allowlist proof, same shape as PetVet's existing sort-allowlist tests), each new filter's SQL behavior, and a backward-compat test proving existing single-operator filters are untouched.

## Phase 2 — `vue-forms` (~/projects/vue-forms): extract `Chip`

- Pull the chip markup already inside `MultiSelect.vue` (lines ~190-217) into a standalone `Chip.vue` (label + optional remove affordance) and export it from the package. Reuse the existing `_select.scss` classes/CSS vars as-is — no new theming work, since they already resolve through shadcn tokens and respect PetVet's light/dark palette per `.ai/rules/css.md`.
- `MultiSelect.vue` switches to rendering the new `Chip` component internally instead of inline markup, so there's exactly one implementation.
- No other vue-forms changes anticipated — the operator `<select>` next to a filter's value input is just an existing `Select`/`Input` pair, composed at the DataTable level.

## Phase 3 — `pinia-hydrate`: no change

Confirmed by reading `DataTable.vue`: the store's `fetchTable()` hits `TableController` directly over XHR for every sort/filter/search/page interaction — pinia-hydrate only does the *first* server-rendered snapshot. Any new filter metadata rides the same JSON payload `TableController`/`TablesHydrator` already build; nothing in the pinia-hydrate package itself needs to change. Skip this package.

## Phase 4 — PetVet backend: ship filter/action/column metadata

- **Badge column**: `TableColumn::asBadge(Closure $tone, ?Closure $icon = null): self`. `$tone` maps a row's value to one of five defaults — the four tones `StatusBadge.vue` already defines (`ok`/`due`/`overdue`/`neutral`, dot + color) plus the existing static shadcn `Badge` for a plain neutral tag (roles, categories — no progress implied, per the distinction already documented in `StatusBadge.vue`'s own comment). `$icon` optionally names a lucide icon to show instead of/alongside the dot. Ships `{value, tone, icon}` per cell instead of a bare scalar. Because tone/icon are closures per column (same pattern as `resolveUsing()`), any table maps its own domain values (species, relationship, export status) to a tone without inventing a new column type — this replaces the hand-written `<Badge variant="secondary">{{ capitalize(value) }}</Badge>` currently duplicated in `Pets.vue`'s `cell-status` slot.
- `TableColumn` also gains `asDate()` if it removes real remaining per-page duplication once badges are handled — small, opportunistic, not the main item.
- `TableDefinition::filters()` continues to return a `FilterSet`; add a method that maps each filter to its `describe()` metadata (key, label, type, operators, options) for the frontend payload — built once, reused for every table, added to `TableController`'s JSON response and to whatever the initial-hydration payload uses (`app/PiniaHydrators/*`). **This is the biggest win in the plan**: it's what lets the frontend stop hand-wiring filter inputs per page entirely (see Phase 5).
- Row actions: introduce a declarative shape server can emit per row — either as the existing `actions` column's resolved value (extend it from an opaque payload like `StaffActions` to a list of `{key, label, icon?, destructive?, url|route}` **pre-filtered by permission on the server**) so the Vue side never re-derives "can I see this button" from raw permission booleans. This tightens the current convention (`Staff.vue` hand-checks `organizationsStore.staff.canUpdateStaff` per button) without changing the actual authorization boundary — the destination route/controller still re-checks via its Policy regardless of what the menu shows.
- Record the invariant via Boost's `record-rule` (glob `app/Tables/**|resources/js/components/data-table/**`): **a hidden action is UX only, never the security boundary** — every action must hit a policy-checked route.

## Phase 5 — PetVet frontend: generic Filters + Actions in `DataTable.vue`

Target layout per the user's sketch — one row: **Actions (single/bulk) · Filters · Columns · Search**.

- **Filters dropdown**: replace each page's hand-built filter markup (see `Pets.vue`'s `#actions` slot with manual `Select`/`Input` per key) with a generic panel driven by the Phase 4 metadata — for each filter, an operator `Select` (from `allowedOperators()`) + a value control matched to `type` (`Input`, `Select` w/ `options`, `DatePicker`). Applied filters render as removable **chips** (new `Chip` from vue-forms) in a row below the trigger, each with a one-click clear. Keep the `#actions` slot as an escape hatch for the rare bespoke filter.
- **Actions dropdown (row + bulk)**: new shared `RowActions.vue` / reuse for the bulk-action bar, rendering the Phase 4 declarative action list through the existing shadcn `DropdownMenu` primitives (already accessible) instead of each page hand-rolling `DropdownMenuItem` + inline permission checks. `Staff.vue`'s current pattern is the reference to generalize from.
- **Badge cells**: `DataTable.vue` gains a generic renderer for any column marked as a badge — `StatusBadge` for the four dot tones, plain `Badge` for the neutral/tag case, optional lucide icon — so pages stop hand-writing badge markup and capitalization logic per cell slot.
- **Clickable column header menus**: replace the current bare click-to-toggle-sort button on each header with a small dropdown (same shadcn `DropdownMenu` primitive used throughout the file) offering "Sort ascending / Sort descending / Hide this column" — the fast path for the single-column action the user actually wants, instead of a click-only sort toggle plus a separate trip to the global Columns dropdown to hide one column. The global "Columns" trigger stays, repurposed mainly for restoring several hidden columns at once.
- **Column visibility & search**: already implemented (`Columns3` dropdown, debounced search `Input`) — reposition alongside the new Filters dropdown for the target layout; underlying toggle logic (`toggleColumn()`, `hiddenColumns`) is reused by the new header menu, not replaced.
- Migrate the 6 existing tables (`Pets`, `Clients`, `Staff`, `Assignments`, `Appointments`, plus `PetsTable`) one at a time onto the generic Filters/Actions components, deleting the per-page hand-wiring as each one moves over.

## Phase 6 — Security & reliability pass (apply throughout, verify at the end)

- Operator allowlisting proven in query-filters tests (Phase 1) — re-verify at the PetVet integration level: a table's live view and its export must honor the same operator identically (extend the existing export-scoping tests, e.g. `TableExportTest.php`, `OrganizationPetsTableTest.php`).
- `prepare()`/`apply()` queue-safety (`support-tables.md`) must keep holding once filter metadata resolution is added — metadata must not read `request()`.
- Confirm `canRead()` and per-row action filtering stay server-side; add the authorization-failure-path test for every new acceptance criterion per `CLAUDE.md`'s issue workflow.
- Two existing export gaps worth a deliberate decision (flagging, not silently changing): `GenerateTableExport` has `tries = 1` (no automatic retry on transient failure — confirm this is intentional fail-fast behavior); confirm there's a cleanup/TTL job for old files on `tables.export_disk` so it doesn't grow unbounded.
- Accessibility: new dropdowns reuse existing shadcn `DropdownMenu`/`Select` primitives rather than custom interaction patterns, so keyboard/aria behavior is inherited, not reinvented.
- Open question to resolve with the user before Phase 5 lands broadly: do table views of sensitive columns (e.g. anything gated by `records.view_external`) need the same "every view is logged" audit trail `CLAUDE.md` mandates for share links? Not assumed in scope here — flag explicitly rather than silently add or skip.
- Run `vendor/bin/pest`, `vendor/bin/pint`, `vendor/bin/phpstan` after each phase, per project convention.

## Phase 7 — The "should this become its own package" question

**Recommendation: build all of the above inside PetVet first; don't extract yet.** Reasoning:
- You need at least 2-3 tables migrated with genuinely different needs (Staff's row actions, Pets' multi-filter panel, an export-heavy one) before the generic/app-specific boundary is proven rather than guessed — extracting now risks baking in PetVet-specific assumptions (viewer-scoped `query()`, `canRead()`, medical retention rules) as if they were generic.
- Concretely gate the extraction decision on: (a) all 6 tables migrated onto the generic Filters/Actions components with no bespoke escape-hatch needed for more than one of them, (b) the query-filters operator work merged and used by at least two different filter types in anger, (c) you've hit a second project (or a clear near-term one) that would actually consume the package — a package with one consumer is just indirection.
- When that point is reached, the split is already visible from this plan: `laravel-query-filters` and the `vue-forms` `Chip` component are already generic and package-ready as-is; what would extract is a new `TableDefinition`/`DataTable.vue` pair, keeping PetVet's `query()`/`canRead()`/export-policy wiring as *required extension points* the consuming app implements, not something the package assumes.

## Verification

- Per phase: `vendor/bin/pest` (targeted, e.g. `--filter=Filter` or the touched table's test file), `vendor/bin/pint --dirty`, `vendor/bin/phpstan`.
- After Phase 5 per migrated table: exercise in the browser — apply a text filter with each new operator, confirm the chip appears and clears correctly, confirm column visibility/search still work, queue an export and confirm the downloaded file matches the on-screen filtered rows exactly (operator included).
- Full suite (`php artisan test --compact`) once all 6 tables are migrated.
