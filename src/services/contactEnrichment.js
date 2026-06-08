import { searchDecisionMakers, enrichPersonEmail } from '../clients/prospeoClient.js';
import { withRetry } from '../utils/retryHelper.js';
import { logger } from '../utils/logger.js';

/**
 * Orchestrates Phase 2 & 3: Iterates over domains, searches for executive targets,
 * and contextually enriches profiles to harvest verified work emails.
 * @param {string[]} domains - Array of company domains sourced from Phase 1
 * @param {number} maxPerCompany - Credit safeguard cap (defaults to 1 for demo safety)
 * @returns {Promise<Object[]>} Array of fully verified, actionable lead objects
 */
export async function extractAndEnrichContacts(domains, maxPerCompany = 1) {
    logger.info(`Sizing up contact enrichment pipeline for ${domains.length} targeted domains.`);
    const actionableLeads = [];
    const seenEmails = new Set();

    for (const domain of domains) {
        logger.info(`Scanning company domain profiles: ${domain}`);

        try {
            const searchData = await withRetry(() => searchDecisionMakers(domain));

            if (searchData.error || !searchData.results || searchData.results.length === 0) {
                logger.warn(`No qualified C-suite/VP profiles matched for domain: ${domain}. Skipping.`);
                continue;
            }

            const targetedProfiles = searchData.results.slice(0, maxPerCompany);
            logger.info(`Found ${searchData.results.length} targets at ${domain}. Extracting top ${targetedProfiles.length} to safeguard demo credits.`);

            for (const profile of targetedProfiles) {
                const person = profile.person;
                if (!person || !person.person_id) continue;

                try {
                    logger.info(`Resolving verified identity tracking coordinates for: ${person.full_name}`);

                    const enrichmentData = await withRetry(() => enrichPersonEmail(person.person_id));

                    if (enrichmentData.error || !enrichmentData.person?.email?.email) {
                        logger.warn(`Prospeo could not secure a bounce-protected verified email for ${person.full_name}. Skipping lead generation.`);
                        continue;
                    }

                    const normalizedEmail = enrichmentData.person.email.email.trim().toLowerCase();
                    const normalizedName = person.full_name?.trim() || [person.first_name, person.last_name].filter(Boolean).join(' ').trim();
                    const normalizedJobTitle = person.current_job_title?.trim() || 'Executive';

                    if (!normalizedName) {
                        logger.warn(`Prospeo returned an incomplete profile for contact ID ${person.person_id}. Missing usable name data, so the lead was skipped.`);
                        continue;
                    }

                    if (seenEmails.has(normalizedEmail)) {
                        logger.warn(`Duplicate lead detected for ${normalizedEmail}. Skipping to avoid redundant outreach and credit waste.`);
                        continue;
                    }

                    seenEmails.add(normalizedEmail);

                    actionableLeads.push({
                        name: normalizedName,
                        email: normalizedEmail,
                        companyDomain: domain,
                        jobTitle: normalizedJobTitle,
                        linkedinUrl: person.linkedin_url
                    });

                    logger.info(`Secured actionable lead: ${normalizedName} <${normalizedEmail}>`);

                } catch (enrichmentError) {
                    logger.error(`Non-fatal breakdown resolving credentials for contact ID ${person.person_id}:`, enrichmentError.message || enrichmentError);
                }
            }

        } catch (searchError) {
            logger.error(`Gracefully skipped processing searches for domain ${domain}:`, searchError.message || searchError);
        }
    }

    logger.info(`☑️ Contact harvesting complete. Secured ${actionableLeads.length} total outreach-ready leads.`);
    return actionableLeads;
}
