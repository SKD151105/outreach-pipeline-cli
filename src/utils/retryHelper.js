import { logger } from './logger.js';

/**
 * Wraps an asynchronous HTTP request with smart retry logic.
 * Specifically handles 429 Rate Limit errors using API-provided delay headers.
 * 
 * @param {Function} fn - The asynchronous function to execute
 * @param {number} retries - Maximum number of retry attempts
 */
export async function withRetry(fn, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const statusCode = error.response?.status;
            const isRateLimit = statusCode === 429;
            const isServerError = statusCode >= 500 && statusCode < 600;
            const isNetworkError = !statusCode && Boolean(error.code);
            const isRetryable = isRateLimit || isServerError || isNetworkError;

            if (attempt === retries || !isRetryable) {
                throw error;
            }

            const retryAfterHeader = error.response?.headers?.['retry-after'];
            const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
            const retryAfterDate = retryAfterHeader ? Date.parse(retryAfterHeader) : Number.NaN;
            const delayMs = Number.isFinite(retryAfterSeconds)
                ? retryAfterSeconds * 1000
                : Number.isFinite(retryAfterDate)
                    ? Math.max(retryAfterDate - Date.now(), 0)
                    : (1000 * (2 ** attempt)) + Math.floor(Math.random() * 500);

            logger.warn(
                `Retryable request failure detected. Attempt ${attempt}/${retries}. Status: ${statusCode || 'NETWORK'}. Retrying in ${Math.round(delayMs)}ms...`
            );

            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
