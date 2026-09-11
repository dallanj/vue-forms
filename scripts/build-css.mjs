import { writeFileSync } from 'node:fs';
import * as sass from 'sass';

/**
 * `src/style.css` is what the JS entry imports, while `src/scss` is the
 * themeable source shipped to consumers. They were kept in sync by hand, so a
 * change to the SCSS could silently never reach the bundle. This compiles one
 * from the other, so the two cannot drift.
 *
 * The layer wrapper is applied here rather than in the SCSS because `@use`
 * must be the first rule in a file and so cannot be nested inside `@layer`.
 */
const { css } = sass.compile('src/scss/index.scss', { style: 'expanded' });

const indented = css
    .trimEnd()
    .split('\n')
    .map((line) => (line.trim() ? `    ${line}` : line))
    .join('\n');

writeFileSync('src/style.css', `@layer components {\n${indented}\n}\n`);
console.log(`src/style.css written from src/scss (${indented.length} bytes)`);
