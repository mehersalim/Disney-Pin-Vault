import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// ml-model.js is a plain browser script, so load it the Node way
const require = createRequire(import.meta.url);
const { PinRecognizer } = require('../ml-model.js');

describe('cosineSimilarity', () => {
    const recognizer = new PinRecognizer();

    it('returns 1 for identical vectors', () => {
        expect(recognizer.cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    });

    it('returns 0 for vectors that share nothing (orthogonal)', () => {
        expect(recognizer.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });

    it('ignores vector length: [1,2,3] and [2,4,6] point the same way', () => {
        expect(recognizer.cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    });

    it('returns 0 instead of crashing when a vector is all zeros', () => {
        expect(recognizer.cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    });
});
