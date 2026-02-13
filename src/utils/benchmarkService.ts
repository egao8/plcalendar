// Benchmark data service — fetches SPY daily returns for alpha decomposition
// Uses Yahoo Finance v8 API (no key required)

interface BenchmarkReturn {
    date: string; // YYYY-MM-DD
    return: number; // daily percentage return (e.g., 0.015 = 1.5%)
}

let cachedReturns: BenchmarkReturn[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Fetch SPY daily returns for the last 2 years
export const fetchBenchmarkReturns = async (symbol: string = 'SPY'): Promise<BenchmarkReturn[]> => {
    // Return cached data if fresh
    if (cachedReturns && Date.now() - cacheTimestamp < CACHE_DURATION) {
        return cachedReturns;
    }

    try {
        const now = Math.floor(Date.now() / 1000);
        const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60;

        // Yahoo Finance v8 chart API
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${twoYearsAgo}&period2=${now}&interval=1d`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!response.ok) {
            console.warn(`Benchmark fetch failed: ${response.status}. Trying fallback.`);
            return await fetchBenchmarkReturnsFallback(symbol);
        }

        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if (!result) {
            console.warn('No chart data in response. Trying fallback.');
            return await fetchBenchmarkReturnsFallback(symbol);
        }

        const timestamps: number[] = result.timestamp || [];
        const closes: number[] = result.indicators?.quote?.[0]?.close || [];

        const returns: BenchmarkReturn[] = [];
        for (let i = 1; i < timestamps.length; i++) {
            if (closes[i] != null && closes[i - 1] != null && closes[i - 1] !== 0) {
                const date = new Date(timestamps[i] * 1000);
                const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
                const dailyReturn = (closes[i] - closes[i - 1]) / closes[i - 1];
                returns.push({ date: dateStr, return: dailyReturn });
            }
        }

        cachedReturns = returns;
        cacheTimestamp = Date.now();
        return returns;
    } catch (error) {
        console.warn('Benchmark data fetch failed:', error);
        return await fetchBenchmarkReturnsFallback(symbol);
    }
};

// Fallback: use a CORS proxy if direct Yahoo Finance is blocked
const fetchBenchmarkReturnsFallback = async (symbol: string): Promise<BenchmarkReturn[]> => {
    try {
        const now = Math.floor(Date.now() / 1000);
        const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60;
        const url = `https://corsproxy.io/?${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${twoYearsAgo}&period2=${now}&interval=1d`)}`;

        const response = await fetch(url);
        if (!response.ok) {
            console.warn('Fallback fetch also failed');
            return [];
        }

        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if (!result) return [];

        const timestamps: number[] = result.timestamp || [];
        const closes: number[] = result.indicators?.quote?.[0]?.close || [];

        const returns: BenchmarkReturn[] = [];
        for (let i = 1; i < timestamps.length; i++) {
            if (closes[i] != null && closes[i - 1] != null && closes[i - 1] !== 0) {
                const date = new Date(timestamps[i] * 1000);
                const dateStr = date.toISOString().split('T')[0];
                const dailyReturn = (closes[i] - closes[i - 1]) / closes[i - 1];
                returns.push({ date: dateStr, return: dailyReturn });
            }
        }

        cachedReturns = returns;
        cacheTimestamp = Date.now();
        return returns;
    } catch (error) {
        console.warn('All benchmark fetch methods failed:', error);
        return [];
    }
};

// Clear the cache (useful for testing)
export const clearBenchmarkCache = (): void => {
    cachedReturns = null;
    cacheTimestamp = 0;
};
