import { describe, expect, it } from 'vitest';
import { normalizeError, normalizeErrors, useFormErrors } from '../src';

describe('error handling', () => {
    it('normalizes strings, arrays, API payloads, and dotted keys', () => {
        expect(normalizeError(['First', 'Second'])).toBe('First');
        expect(normalizeErrors({ errors: { 'items.0.price': ['Required'] } })).toEqual({
            'items.0.price': 'Required',
        });
    });

    it('sets and clears literal dotted keys', () => {
        const form = useFormErrors();
        form.set('users.1.email', 'Invalid');
        expect(form.get('users.1.email')).toBe('Invalid');
        form.clear('users.1.email');
        expect(form.has('users.1.email')).toBe(false);
    });
});
