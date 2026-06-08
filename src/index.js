import { discoverLookalikeCompanies } from './services/companyDiscovery.js';
import { extractAndEnrichContacts } from './services/contactEnrichment.js';
import { dispatchOutreachCampaign } from './services/emailDispatcher.js';
import { logger } from './utils/logger.js';

function normalizeSeedDomain(rawInput) {
    const sanitizedInput = rawInput.trim().toLowerCase();
    const withoutProtocol = sanitizedInput.replace(/^https?:\/\//, '');
    const withoutPath = withoutProtocol.split('/')[0];
    const withoutQuery = withoutPath.split('?')[0];
    const normalizedDomain = withoutQuery.replace(/^www\./, '');

    return normalizedDomain;
}

async function main() {
    const rawSeedInput = process.argv[2] || 'stripe.com';
    const seedDomain = normalizeSeedDomain(rawSeedInput);

    logger.info('================= INITIALIZING MASTER ORCHESTRATOR =================\n');
    logger.info(`Target Seed Baseline: ${seedDomain}`);

    if (!seedDomain.includes('.')) {
        logger.error(
            `Invalid seed input "${rawSeedInput}". Ocean.io lookalike discovery expects a real company domain such as "stripe.com" or "juspay.in".`
        );
        process.exit(1);
    }

    try {
        const targetCompanies = await discoverLookalikeCompanies(seedDomain, 5);

        if (targetCompanies.length === 0) {
            logger.warn('Orchestrator halt: No lookalike company profiles discovered. Exiting loop.');
            return;
        }

        const verifiedLeads = await extractAndEnrichContacts(targetCompanies, 1);

        await dispatchOutreachCampaign(verifiedLeads);

        logger.info('================= PIPELINE RUNTIME FINALIZED SUCCESSFULLY =================\n');
    } catch (error) {
        logger.error('💥 Critical application failure captured in master orchestrator context:', error.message || error);
        process.exit(1);
    }
}

// Global process safeguard 
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection captured at runtime process layer:', reason);
    process.exit(1);
});

main();
