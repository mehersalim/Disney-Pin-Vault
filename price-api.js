/**
 * PRICE API - eBay and Mercari Integration
 * ==========================================
 * 
 * This file handles marketplace price checking and historical data.
 * 
 * NOTE: This is a MOCK implementation for learning/demo purposes.
 * 
 * FOR PRODUCTION:
 * - eBay: Need eBay Developer Account and API key
 * - Mercari: Need official API access (limited availability)
 * - Alternative: Use web scraping (requires careful rate limiting)
 * 
 * The mock data demonstrates the functionality patterns.
 */

class PriceAPI {
    constructor() {
        // In production, you would set these from environment variables
        this.ebayAppId = 'MOCK_EBAY_APP_ID';
        this.mercariToken = 'MOCK_MERCARI_TOKEN';
        this.cache = new Map(); // Cache results to avoid repeated API calls
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    }
    
    /**
     * Search eBay for active listings of a pin
     * @param {string} pinName - Name of the pin to search
     * @returns {Promise<Array>} List of listings
     */
    async searchEBay(pinName) {
        if (!pinName) return [];
        
        // Check cache
        const cacheKey = `ebay_${pinName.toLowerCase()}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
        
        // MOCK IMPLEMENTATION - Replace with actual eBay API call
        // Real API endpoint would be something like:
        // https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(pinName + ' Disney pin')}
        
        return new Promise((resolve) => {
            // Simulate network delay
            setTimeout(() => {
                // Generate realistic mock data based on pin name
                const basePrice = this.generateBasePrice(pinName);
                const mockListings = [];
                
                // Generate 2-5 random listings
                const numListings = Math.floor(Math.random() * 4) + 2;
                
                for (let i = 0; i < numListings; i++) {
                    const priceVariance = 0.8 + (Math.random() * 0.6); // 0.8 to 1.4
                    const price = (basePrice * priceVariance).toFixed(2);
                    
                    mockListings.push({
                        title: `${pinName} - Disney Pin ${this.getRandomCondition()}`,
                        price: price,
                        shipping: (Math.random() * 8).toFixed(2),
                        condition: this.getRandomCondition(),
                        seller: `disney_trader_${Math.floor(Math.random() * 1000)}`,
                        url: `https://ebay.com/mock-listing-${i}`,
                        imageUrl: `https://via.placeholder.com/100?text=${encodeURIComponent(pinName.substring(0, 10))}`,
                        endTime: new Date(Date.now() + (Math.random() * 14 + 1) * 24 * 60 * 60 * 1000).toISOString(),
                        bidding: Math.random() > 0.7,
                        bids: Math.floor(Math.random() * 15)
                    });
                }
                
                // Sort by price (lowest first)
                mockListings.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                
                this.setCached(cacheKey, mockListings);
                resolve(mockListings);
            }, 800); // Simulate network latency
        });
    }
    
    /**
     * Search Mercari for active listings
     * @param {string} pinName 
     * @returns {Promise<Array>}
     */
    async searchMercari(pinName) {
        if (!pinName) return [];
        
        const cacheKey = `mercari_${pinName.toLowerCase()}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                const basePrice = this.generateBasePrice(pinName);
                const mockListings = [];
                const numListings = Math.floor(Math.random() * 3) + 1;
                
                for (let i = 0; i < numListings; i++) {
                    const priceVariance = 0.7 + (Math.random() * 0.8);
                    mockListings.push({
                        title: pinName,
                        price: (basePrice * priceVariance).toFixed(2),
                        shipping: Math.random() > 0.5 ? (Math.random() * 6).toFixed(2) : "0.00",
                        condition: this.getRandomCondition(),
                        seller: `mercari_user_${Math.floor(Math.random() * 1000)}`,
                        url: `https://mercari.com/mock-listing-${i}`,
                        likes: Math.floor(Math.random() * 50),
                        location: this.getRandomLocation()
                    });
                }
                
                this.setCached(cacheKey, mockListings);
                resolve(mockListings);
            }, 600);
        });
    }
    
    /**
     * Get sold/completed listings for price comparison
     * @param {string} pinName 
     * @returns {Promise<Array>} Historical sales data
     */
    async getSoldComps(pinName) {
        if (!pinName) return [];
        
        const cacheKey = `sold_${pinName.toLowerCase()}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                const basePrice = this.generateBasePrice(pinName);
                const comps = [];
                const now = new Date();
                
                // Generate 12-24 months of historical data
                const months = Math.floor(Math.random() * 12) + 12;
                
                // Create a price trend (slight upward or downward)
                const trend = Math.random() > 0.5 ? 1.02 : 0.98;
                
                for (let i = 0; i < months; i++) {
                    const date = new Date(now);
                    date.setMonth(date.getMonth() - (months - i));
                    
                    // Add some random variation
                    const variation = 0.85 + (Math.random() * 0.3);
                    let price = basePrice * Math.pow(trend, i) * variation;
                    
                    comps.push({
                        date: date.toISOString().split('T')[0],
                        price: Math.max(5, price).toFixed(2),
                        condition: this.getRandomCondition(),
                        platform: Math.random() > 0.5 ? 'eBay' : 'Mercari',
                        seller: `seller_${Math.floor(Math.random() * 100)}`
                    });
                }
                
                // Sort by date (oldest first for charts)
                comps.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                this.setCached(cacheKey, comps);
                resolve(comps);
            }, 1000);
        });
    }
    
    /**
     * Analyze price trend from sold comps
     * @param {Array} soldComps 
     * @returns {Object} Trend analysis
     */
    analyzePriceTrend(soldComps) {
        if (!soldComps || soldComps.length < 3) {
            return {
                trend: 'insufficient_data',
                message: 'Not enough data for trend analysis (need at least 3 sales)',
                averagePrice: null,
                recentPrice: null,
                percentChange: null
            };
        }
        
        const prices = soldComps.map(c => parseFloat(c.price));
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        // Get last 3 months vs first 3 months
        const recentPrices = prices.slice(-3);
        const olderPrices = prices.slice(0, 3);
        
        const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
        
        const percentChange = ((recentAvg - olderAvg) / olderAvg * 100).toFixed(1);
        const percentChangeNum = parseFloat(percentChange);
        
        let trend, emoji;
        if (percentChangeNum > 10) {
            trend = 'Rising';
            emoji = '📈';
        } else if (percentChangeNum < -10) {
            trend = 'Falling';
            emoji = '📉';
        } else {
            trend = 'Stable';
            emoji = '➡️';
        }
        
        return {
            trend: `${emoji} ${trend}`,
            percentChange: percentChangeNum,
            averagePrice: avgPrice.toFixed(2),
            recentPrice: recentAvg.toFixed(2),
            oldestPrice: olderAvg.toFixed(2),
            message: `Prices are ${trend.toLowerCase()} with ${Math.abs(percentChangeNum)}% change over 3 months`,
            dataPoints: soldComps.length
        };
    }
    
    /**
     * Predict future value based on historical data
     * Uses linear regression for prediction
     * @param {Array} soldComps 
     * @returns {Object|null} Prediction data
     */
    predictFutureValue(soldComps) {
        if (!soldComps || soldComps.length < 6) {
            return null;
        }
        
        const prices = soldComps.map(c => parseFloat(c.price));
        const indices = prices.map((_, i) => i);
        const n = prices.length;
        
        // Calculate linear regression: y = mx + b
        const sumX = indices.reduce((a, b) => a + b, 0);
        const sumY = prices.reduce((a, b) => a + b, 0);
        const sumXY = indices.reduce((sum, x, i) => sum + x * prices[i], 0);
        const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Predict next 3 months
        const predictions = [];
        for (let i = 1; i <= 3; i++) {
            const predictedPrice = Math.max(0, slope * (n + i) + intercept);
            predictions.push({
                month: i,
                price: predictedPrice.toFixed(2),
                date: this.getFutureDateString(i)
            });
        }
        
        // Calculate confidence based on data consistency
        const residuals = prices.map((y, i) => Math.abs(y - (slope * i + intercept)));
        const avgResidual = residuals.reduce((a, b) => a + b, 0) / n;
        const priceRange = Math.max(...prices) - Math.min(...prices);
        const confidence = Math.min(85, Math.max(50, 100 - (avgResidual / priceRange * 100)));
        
        return {
            predictions: predictions,
            trend: slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'stable',
            slope: slope,
            confidence: Math.round(confidence),
            recommendation: this.getRecommendation(slope, predictions[2].price, prices[prices.length - 1])
        };
    }
    
    /**
     * Generate a realistic base price for a pin based on name keywords
     * @param {string} pinName 
     * @returns {number}
     */
    generateBasePrice(pinName) {
        const name = pinName.toLowerCase();
        let basePrice = 15; // Starting price
        
        // Rarity keywords
        if (name.includes('le') || name.includes('limited')) basePrice += 30;
        if (name.includes('chaser')) basePrice += 40;
        if (name.includes('rare')) basePrice += 25;
        if (name.includes('grail')) basePrice += 75;
        
        // Character popularity
        if (name.includes('stitch')) basePrice += 15;
        if (name.includes('mickey')) basePrice += 5;
        if (name.includes('simba') || name.includes('lion')) basePrice += 10;
        if (name.includes('ariel') || name.includes('princess')) basePrice += 8;
        
        return Math.max(10, Math.min(200, basePrice));
    }
    
    /**
     * Get random condition string
     * @returns {string}
     */
    getRandomCondition() {
        const conditions = ['Mint', 'Like New', 'Excellent', 'Very Good', 'Good'];
        return conditions[Math.floor(Math.random() * conditions.length)];
    }
    
    /**
     * Get random location
     * @returns {string}
     */
    getRandomLocation() {
        const locations = ['United States', 'Japan', 'Canada', 'United Kingdom', 'Australia', 'Germany'];
        return locations[Math.floor(Math.random() * locations.length)];
    }
    
    /**
     * Get future date string for prediction
     * @param {number} monthsFromNow 
     * @returns {string}
     */
    getFutureDateString(monthsFromNow) {
        const date = new Date();
        date.setMonth(date.getMonth() + monthsFromNow);
        return date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
    }
    
    /**
     * Get investment recommendation
     * @param {number} slope 
     * @param {number} predictedPrice 
     * @param {number} currentPrice 
     * @returns {string}
     */
    getRecommendation(slope, predictedPrice, currentPrice) {
        const predicted = parseFloat(predictedPrice);
        const current = parseFloat(currentPrice);
        const percentChange = ((predicted - current) / current * 100).toFixed(0);
        
        if (slope > 0.5) {
            return `📈 Expected to increase ~${percentChange}% in 3 months. Good hold.`;
        } else if (slope < -0.5) {
            return `📉 Expected to decrease ~${Math.abs(percentChange)}% in 3 months. Consider selling.`;
        } else {
            return `➡️ Stable value expected. Hold for long-term collection.`;
        }
    }
    
    /**
     * Get cached data if still valid
     * @param {string} key 
     * @returns {any|null}
     */
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log(`Cache hit for ${key}`);
            return cached.data;
        }
        return null;
    }
    
    /**
     * Set cache data
     * @param {string} key 
     * @param {any} data 
     */
    setCached(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
    
    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Price API cache cleared');
    }
}

// Create global instance
const priceAPI = new PriceAPI();