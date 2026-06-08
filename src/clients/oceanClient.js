import axios from 'axios';
import { envConfig } from '../config/env.js';

// Centralized connection parameters and security credentials for Ocean.io
const oceanApi = axios.create({
    baseURL: 'https://api.ocean.io',
    headers: {
        'x-api-token': envConfig.oceanKey,
        'Content-Type': 'application/json'
    },
    timeout: 15000
});

/**
 * Makes a single HTTP request to fetch a page of lookalike companies from Ocean.io.
 * @param {string} targetDomain - The seed domain to search against
 * @param {string|null} searchAfter - The cursor token for pagination (null for the first page)
 * @returns {Promise<Object>} The raw JSON response
 */
export async function fetchLookalikeCompanies(targetDomain, searchAfter = null) {
    const payload = {
        size: 50,
        companiesFilters: {
            lookalikeDomains: [targetDomain]
        }
    };

    if (searchAfter) {
        payload.searchAfter = searchAfter;
    }

    try {
        const response = await oceanApi.post('/v3/search/companies', payload);
        return response.data;
    } catch (error) {
        if (error.response) {
            const statusCode = error.response.status;
            const apiMessage = error.response.data?.message || error.response.data?.error || error.response.data?.detail;

            if (statusCode === 402) {
                error.message = 'Ocean.io request failed with status 402. Your account has likely hit a billing or credit limit.';
            } else {
                error.message = `Ocean.io request failed with status ${statusCode}${apiMessage ? `: ${apiMessage}` : ''}`;
            }

            error.oceanDetails = error.response.data;
            error.oceanPayload = payload;
        }

        throw error;
    }
}
