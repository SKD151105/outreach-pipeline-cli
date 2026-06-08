import axios from 'axios';
import { envConfig } from '../config/env.js';

// Centralized configuration and security headers for all Prospeo requests
const prospeoApi = axios.create({
    baseURL: 'https://api.prospeo.io',
    headers: {
        'X-KEY': envConfig.prospeoKey,
        'Content-Type': 'application/json'
    },
    timeout: 15000 // Safeguard against open sockets or network hangs
});

/**
 * Searches for C-suite and VP-level decision makers associated with a company domain.
 * @param {string} domain - The target company website domain
 * @param {number} page - The pagination page number (defaults to 1)
 * @returns {Promise<Object>} The raw JSON search results containing person profiles and IDs
 */
export async function searchDecisionMakers(domain, page = 1) {
    const payload = {
        page,
        filters: {
            company: {
                websites: {
                    include: [domain]
                }
            },
            person_seniority: {
                include: ['C-Suite', 'VP']
            }
        }
    };

    // POST request to the 'search-person' endpoint with the constructed payload
    const response = await prospeoApi.post('/search-person', payload);
    return response.data;
}

/**
 * Enriches a specific contact profile with a verified work email using their unique profile identifier.
 * @param {string} personId - The unique identifier obtained from searchDecisionMakers
 * @returns {Promise<Object>} The enriched profile payload containing verified email data
 */
export async function enrichPersonEmail(personId) {
    const payload = {
        only_verified_email: true,
        data: {
            person_id: personId
        }
    };

    // POST request to the 'enrich-person' endpoint with the constructed payload
    const response = await prospeoApi.post('/enrich-person', payload);
    return response.data;
}