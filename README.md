# @dallanj/vue-forms

Accessible Vue 3 form fields with framework-neutral error handling and Laravel 13-inspired defaults.

```bash
npm install @dallanj/vue-forms
```

Import the default Laravel 13-inspired stylesheet once in your application:

```ts
import '@dallanj/vue-forms/style.css';
```

```vue
<script setup lang="ts">
import { FormProvider, Input } from '@dallanj/vue-forms';
</script>

<template>
  <FormProvider :errors="errors" @clear-error="clearError">
    <Input v-model="form.email" name="email" label="Email" />
  </FormProvider>
</template>
```

Field IDs are derived from their `name`, so they remain stable during SSR
hydration. When two forms on the same page use the same field names, give each
provider a stable `id` to scope them:

```vue
<FormProvider id="billing">
  <Input name="email" label="Email" />
</FormProvider>
```

Import `@dallanj/vue-forms/style.css` for the default theme or `@dallanj/vue-forms/scss` to configure Sass variables. Override CSS custom properties at application or component scope.

Inertia integration is optional:

```ts
import { InertiaFormProvider } from '@dallanj/vue-forms/inertia';
```
