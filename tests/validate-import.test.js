import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { validateImport } = require('../validate-import.js');

const goodPin = { id: 1700000000001, name: 'Stitch Surfing' };

describe('validateImport', () => {
    it('rejects text that is not JSON', () => {
        const result = validateImport('this is not json');
        expect(result.ok).toBe(false);
        expect(result.errors[0]).toMatch(/not valid JSON/);
    });

    it('rejects JSON that is not a list', () => {
        const result = validateImport(JSON.stringify({ name: 'one pin, not a list' }));
        expect(result.ok).toBe(false);
    });

    it('rejects a list with no valid pins', () => {
        const result = validateImport(JSON.stringify([{ id: 1 }, 'nope', null]));
        expect(result.ok).toBe(false);
        expect(result.errors[0]).toMatch(/No valid pins/);
    });

    it('skips a pin with no name but keeps the good ones', () => {
        const result = validateImport(JSON.stringify([goodPin, { id: 2 }]));
        expect(result.ok).toBe(true);
        expect(result.pins).toHaveLength(1);
        expect(result.skipped).toEqual([{ index: 1, reason: 'missing name' }]);
    });

    it('skips a pin whose id is the wrong type', () => {
        const result = validateImport(JSON.stringify([goodPin, { id: 'abc', name: 'Bad id' }]));
        expect(result.pins).toHaveLength(1);
        expect(result.skipped[0].reason).toMatch(/invalid id/);
    });

    it('drops unknown fields instead of importing them', () => {
        const result = validateImport(JSON.stringify([{ ...goodPin, admin: true, secret: 'x' }]));
        expect(result.pins[0]).not.toHaveProperty('admin');
        expect(result.pins[0]).not.toHaveProperty('secret');
    });

    it('fixes bad optional values with safe defaults', () => {
        const result = validateImport(JSON.stringify([
            { ...goodPin, status: 'hacked', rarity: 'Mythic', currentValue: -5, tags: 'not-a-list' }
        ]));
        const pin = result.pins[0];
        expect(pin.status).toBe('own');
        expect(pin.rarity).toBe('Common');
        expect(pin.currentValue).toBe(0);
        expect(pin.tags).toEqual([]);
    });

    it('rejects a file with too many pins', () => {
        const tooMany = Array.from({ length: 1001 }, (_, i) => ({ id: i, name: `Pin ${i}` }));
        const result = validateImport(JSON.stringify(tooMany));
        expect(result.ok).toBe(false);
        expect(result.errors[0]).toMatch(/Too many pins/);
    });

    it('accepts the real sample-pins.json file', () => {
        const text = readFileSync(new URL('../sample-pins.json', import.meta.url), 'utf8');
        const result = validateImport(text);
        expect(result.ok).toBe(true);
        expect(result.pins).toHaveLength(2);
        expect(result.skipped).toHaveLength(0);
    });
});
