import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PriceAPI } = require('../price-api.js');

// Build fake "sold" listings from a list of prices
const comps = (prices) => prices.map((price, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    price: String(price)
}));

describe('analyzePriceTrend', () => {
    const api = new PriceAPI();

    it('says there is not enough data with fewer than 3 sales', () => {
        const result = api.analyzePriceTrend(comps([10, 12]));
        expect(result.trend).toBe('insufficient_data');
    });

    it('detects a rising trend', () => {
        const result = api.analyzePriceTrend(comps([10, 10, 10, 10, 10, 20, 20, 20]));
        expect(result.trend).toContain('Rising');
        expect(result.percentChange).toBe(100);
    });

    it('detects a falling trend', () => {
        const result = api.analyzePriceTrend(comps([20, 20, 20, 10, 10, 10]));
        expect(result.trend).toContain('Falling');
        expect(result.percentChange).toBe(-50);
    });

    it('calls small changes stable', () => {
        const result = api.analyzePriceTrend(comps([10, 10, 10, 10, 10, 10]));
        expect(result.trend).toContain('Stable');
    });
});

describe('predictFutureValue', () => {
    const api = new PriceAPI();

    it('returns null with fewer than 6 sales', () => {
        expect(api.predictFutureValue(comps([10, 11, 12]))).toBeNull();
    });

    it('projects an upward line forward 3 months', () => {
        const result = api.predictFutureValue(comps([10, 12, 14, 16, 18, 20]));
        expect(result.trend).toBe('upward');
        expect(result.predictions).toHaveLength(3);
        expect(result.predictions[0].price).toBe('24.00'); // slope 2 per step: 10 + 2*7
    });

    it('projects a downward line and never goes below zero', () => {
        const result = api.predictFutureValue(comps([20, 18, 16, 14, 12, 10]));
        expect(result.trend).toBe('downward');
        expect(result.predictions[0].price).toBe('6.00');
        result.predictions.forEach(p => expect(parseFloat(p.price)).toBeGreaterThanOrEqual(0));
    });

    it('keeps confidence a real number between 50 and 85, even when prices are flat', () => {
        const result = api.predictFutureValue(comps([10, 10, 10, 10, 10, 10]));
        expect(Number.isNaN(result.confidence)).toBe(false);
        expect(result.confidence).toBeGreaterThanOrEqual(50);
        expect(result.confidence).toBeLessThanOrEqual(85);
    });
});
