/**
 * CHART CONFIGURATION - Analytics Dashboard
 * ==========================================
 * 
 * This file handles all Chart.js visualizations for the analytics dashboard.
 * Uses Chart.js library for rendering charts.
 * 
 * Charts included:
 * - Value History (line chart)
 * - Rarity Distribution (doughnut chart)
 * - Origin Distribution (bar chart)
 * - Top Tags (horizontal bar chart)
 * - Sold Comps (scatter/line chart)
 * - Price History (line chart with trend)
 */

class AnalyticsCharts {
    constructor() {
        this.charts = {};
        this.chartColors = {
            primary: '#764ba2',
            secondary: '#667eea',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8',
            dark: '#2d1b4e',
            light: '#f5f5f5'
        };
    }
    
    /**
     * Create or update value history line chart
     * Shows collection value progression over time
     * @param {Object} data - { dates: [], values: [] }
     */
    createValueHistoryChart(data) {
        const ctx = document.getElementById('valueHistoryChart');
        if (!ctx) return;
        
        const canvasContext = ctx.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.valueHistory) {
            this.charts.valueHistory.destroy();
        }
        
        this.charts.valueHistory = new Chart(canvasContext, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [{
                    label: 'Total Collection Value ($)',
                    data: data.values,
                    borderColor: this.chartColors.primary,
                    backgroundColor: `rgba(118, 75, 162, 0.1)`,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: this.chartColors.primary,
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `$${context.raw.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Value ($)', font: { size: 12 } },
                        ticks: { callback: (value) => `$${value}` }
                    },
                    x: {
                        title: { display: true, text: 'Date', font: { size: 12 } }
                    }
                }
            }
        });
    }
    
    /**
     * Create rarity distribution doughnut/pie chart
     * @param {Object} rarityCounts - { Common: 5, Rare: 2, etc. }
     */
    createRarityChart(rarityCounts) {
        const ctx = document.getElementById('rarityDistributionChart');
        if (!ctx) return;
        
        const canvasContext = ctx.getContext('2d');
        
        if (this.charts.rarity) {
            this.charts.rarity.destroy();
        }
        
        const rarityColors = {
            'Common': '#28a745',
            'Uncommon': '#17a2b8',
            'Rare': '#ffc107',
            'Super Rare': '#fd7e14',
            'Grail': '#dc3545'
        };
        
        const labels = Object.keys(rarityCounts);
        const data = Object.values(rarityCounts);
        const backgroundColors = labels.map(label => rarityColors[label] || this.chartColors.primary);
        
        this.charts.rarity = new Chart(canvasContext, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 } } },
                    tooltip: { callbacks: { label: (context) => `${context.label}: ${context.raw} pins (${((context.raw / data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)` } }
                }
            }
        });
    }
    
    /**
     * Create origin distribution bar chart
     * @param {Object} originCounts - { 'Disneyland': 10, 'WDW': 5, etc. }
     */
    createOriginChart(originCounts) {
        const ctx = document.getElementById('originChart');
        if (!ctx) return;
        
        const canvasContext = ctx.getContext('2d');
        
        if (this.charts.origin) {
            this.charts.origin.destroy();
        }
        
        // Sort by count (highest first)
        const sorted = Object.entries(originCounts).sort((a, b) => b[1] - a[1]);
        const labels = sorted.map(item => this.truncateLabel(item[0], 20));
        const data = sorted.map(item => item[1]);
        
        this.charts.origin = new Chart(canvasContext, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Pins',
                    data: data,
                    backgroundColor: this.chartColors.primary,
                    borderRadius: 8,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (context) => `${context.raw} pins` } }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { stepSize: 1, precision: 0 },
                        title: { display: true, text: 'Number of Pins' }
                    },
                    x: { ticks: { rotation: -45, autoSkip: true, maxRotation: 45, minRotation: 45 } }
                }
            }
        });
    }
    
    /**
     * Create top tags horizontal bar chart
     * @param {Object} tagCounts - { 'Stitch': 5, 'Glitter': 3, etc. }
     */
    createTagsChart(tagCounts) {
        const ctx = document.getElementById('tagsChart');
        if (!ctx) return;
        
        const canvasContext = ctx.getContext('2d');
        
        if (this.charts.tags) {
            this.charts.tags.destroy();
        }
        
        // Get top 10 tags
        const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const labels = sorted.map(item => item[0]);
        const data = sorted.map(item => item[1]);
        
        this.charts.tags = new Chart(canvasContext, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pin Count',
                    data: data,
                    backgroundColor: this.chartColors.info,
                    borderRadius: 8,
                    barPercentage: 0.7
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (context) => `${context.raw} pins` } }
                },
                scales: {
                    x: { 
                        beginAtZero: true, 
                        ticks: { stepSize: 1, precision: 0 },
                        title: { display: true, text: 'Number of Pins' }
                    }
                }
            }
        });
    }
    
    /**
     * Create sold comps scatter/line chart
     * @param {Array} comps - Array of { date, price, condition, platform }
     */
    createSoldCompsChart(comps) {
        const ctx = document.getElementById('soldCompsChart');
        if (!ctx) return;
        
        const canvasContext = ctx.getContext('2d');
        
        if (this.charts.soldComps) {
            this.charts.soldComps.destroy();
        }
        
        // Group by platform for different colors
        const ebayData = comps.filter(c => c.platform === 'eBay').map(c => ({ x: c.date, y: parseFloat(c.price) }));
        const mercariData = comps.filter(c => c.platform === 'Mercari').map(c => ({ x: c.date, y: parseFloat(c.price) }));
        
        this.charts.soldComps = new Chart(canvasContext, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'eBay Sold',
                        data: ebayData,
                        backgroundColor: this.chartColors.primary,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        showLine: false
                    },
                    {
                        label: 'Mercari Sold',
                        data: mercariData,
                        backgroundColor: this.chartColors.success,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: { callbacks: { label: (context) => `$${context.raw.y} - ${context.dataset.label}` } }
                },
                scales: {
                    y: { 
                        title: { display: true, text: 'Price ($)' },
                        ticks: { callback: (value) => `$${value}` }
                    },
                    x: { 
                        title: { display: true, text: 'Date' },
                        type: 'time',
                        time: { unit: 'month', displayFormats: { month: 'MMM YYYY' } }
                    }
                }
            }
        });
    }
    
    /**
     * Create price history chart with trend line
     * @param {Object} historyData - { dates: [], prices: [], trendLine: [] }
     */
    createPriceHistoryChart(historyData) {
        const ctx = document.getElementById('priceHistoryChart');
        if (!ctx) return;
        
        const canvasContext = ctx.getContext('2d');
        
        if (this.charts.priceHistory) {
            this.charts.priceHistory.destroy();
        }
        
        this.charts.priceHistory = new Chart(canvasContext, {
            type: 'line',
            data: {
                labels: historyData.dates,
                datasets: [
                    {
                        label: 'Actual Sale Price',
                        data: historyData.prices,
                        borderColor: this.chartColors.primary,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Trend Line',
                        data: historyData.trendLine,
                        borderColor: this.chartColors.warning,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: { callbacks: { label: (context) => `$${context.raw.toFixed(2)}` } }
                },
                scales: {
                    y: { 
                        title: { display: true, text: 'Price ($)' },
                        ticks: { callback: (value) => `$${value}` }
                    }
                }
            }
        });
    }
    
    /**
     * Destroy all charts (useful when refreshing data)
     */
    destroyAllCharts() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                try {
                    this.charts[key].destroy();
                } catch (e) {
                    console.warn(`Failed to destroy chart ${key}:`, e);
                }
                delete this.charts[key];
            }
        });
    }
    
    /**
     * Truncate long labels for display
     * @param {string} label 
     * @param {number} maxLength 
     * @returns {string}
     */
    truncateLabel(label, maxLength) {
        if (!label) return 'Unknown';
        if (label.length <= maxLength) return label;
        return label.substring(0, maxLength - 3) + '...';
    }
}

// Create global instance
const analyticsCharts = new AnalyticsCharts();