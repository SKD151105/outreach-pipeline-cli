import { fetchLookalikeCompanies } from '../clients/oceanClient.js';
import { withRetry } from '../utils/retryHelper.js';
import { logger } from '../utils/logger.js';

/**
 * Orchestrates Phase 1 of the pipeline: expanding a seed domain into a list
 * of unique, qualified lookalike company domains using pagination.
 * @param {string} seedDomain - The corporate domain used as a baseline profile
 * @param {number} targetCount - Minimum number of matching domains to discover
 * @returns {Promise<string[]>} A deduplicated array of target company domains
 */
export async function discoverLookalikeCompanies(seedDomain, targetCount = 50) {
    logger.info(`🟢 Starting company discovery phase for seed profile: ${seedDomain}`);

    const uniqueDomains = new Set();
    const seenCursors = new Set();
    let currentCursor = null;
    let hasNextPage = true;
    let pageCount = 1;

    while (hasNextPage && uniqueDomains.size < targetCount) {
        logger.info(`Fetching page ${pageCount} of lookalikes from Ocean.io...`);

        try {
            const data = await withRetry(() => fetchLookalikeCompanies(seedDomain, currentCursor));

            const companies = data?.companies || [];
            const nextCursor = data?.searchAfter;

            if (pageCount === 1 && companies.length > 0) {
                console.log('\n[DIAGNOSTIC] FIRST COMPANY OBJECT SHAPE:', JSON.stringify(companies[0], null, 2));
            }

            if (companies.length === 0) {
                logger.warn('Ocean.io returned an empty company array. Halting discovery lookups.');
                break;
            }

            let domainsAddedThisPage = 0;

            for (const company of companies) {
                const companyDomain = company?.company?.domain || company?.domain;

                if (companyDomain) {
                    const normalizedDomain = companyDomain.toLowerCase().trim();

                    if (!uniqueDomains.has(normalizedDomain)) {
                        domainsAddedThisPage++;
                    }

                    uniqueDomains.add(normalizedDomain);
                }
            }

            if (domainsAddedThisPage === 0) {
                logger.warn('Ocean.io returned result objects, but no usable company domains were extracted from this page. Halting discovery to avoid wasting credits.');
                break;
            }

            logger.info(`Page ${pageCount} processed. Total unique target domains found so far: ${uniqueDomains.size}`);

            if (nextCursor && uniqueDomains.size < targetCount) {
                if (seenCursors.has(nextCursor)) {
                    logger.warn('Ocean.io returned a repeated pagination cursor. Halting discovery loop to avoid duplicate fetch cycles.');
                    hasNextPage = false;
                    continue;
                }

                seenCursors.add(nextCursor);
                currentCursor = nextCursor;
                pageCount++;
            } else {
                hasNextPage = false;
            }

        } catch (error) {
            logger.error(`Fatal failure during Ocean.io discovery loop page ${pageCount}:`, error);
            throw error;
        }
    }

    const finalDomainList = Array.from(uniqueDomains);
    logger.info(`✅ Company discovery phase finalized. Sourced ${finalDomainList.length} total domains.`);

    return finalDomainList;
}
