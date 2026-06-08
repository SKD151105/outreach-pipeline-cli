import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { sendOutreachEmail } from '../clients/brevoClient.js';
import { withRetry } from '../utils/retryHelper.js';
import { logger } from '../utils/logger.js';

/**
 * Renders a clean terminal summary grid and forces a manual interactive validation
 * check before authorizing the delivery layer to initialize transactions.
 * @param {Object[]} leads - Compiled array of enriched contact leads
 * @returns {Promise<boolean>} True if manually authorized by the operator, false otherwise
 */
async function requestUserAuthorization(leads) {
    console.log('\n  ================ SYSTEM SAFETY CHECKPOINT ================ \n');
    logger.info(`Reviewing final structural payload compilation for ${leads.length} outreach targets:`);

    console.table(leads.map(lead => ({
        Name: lead.name,
        Email: lead.email,
        Company: lead.companyDomain,
        Title: lead.jobTitle
    })));

    const rl = readline.createInterface({ input, output });

    try {
        const answer = await rl.question('\n❓ Force execute pipeline and fire personalized outreach sequences to these contacts? (y/yes to confirm): ');
        const normalizedAnswer = answer.trim().toLowerCase();
        return normalizedAnswer === 'yes' || normalizedAnswer === 'y';
    } finally {
        rl.close();
    }
}

/**
 * Orchestrates Phase 4: Validates targeted lists, assembles individual personalized
 * context copy blocks, and pipelines delivery vectors sequentially.
 * @param {Object[]} leads - Actionable data targets populated via Step 9
 */
export async function dispatchOutreachCampaign(leads) {
    if (!leads || leads.length === 0) {
        logger.warn('No outreach-ready prospects available to target. Aborting dispatcher service loop.');
        return;
    }

    const isAuthorized = await requestUserAuthorization(leads);

    if (!isAuthorized) {
        logger.warn('🛑 Pipeline deployment safely aborted by user. Zero outreach messages were fired.');
        return;
    }

    logger.info('🟢 Live confirmation captured! Initializing transactional outreach campaign transmission sequence...');

    for (const lead of leads) {
        logger.info(`Composing contextual layout strings for prospect: ${lead.name} <${lead.email}>`);

        const firstName = lead.name.trim().split(/\s+/)[0] || lead.name;

        const htmlBody = `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <p>Hi ${firstName},</p>
            
            <p>I was looking into how engineering and business operations are scaling over at <strong>${lead.companyDomain}</strong> and wanted to reach out to you directly as the <em>${lead.jobTitle}</em>.</p>
            
            <p>As a full-stack engineer specializing in the MERN stack, I focus on designing robust software systems and custom automation frameworks that integrate modern AI workflows directly into corporate operations to eliminate manual data bottlenecks.</p>
            
            <p>In fact, the very email you are reading right now was targeted, enriched, and dispatched entirely through a custom automated node pipeline I engineered to demonstrate high-efficiency scraping and outreach logic.</p>
            
            <p>I would love to connect for a brief, 5-minute conversation early next week to discuss how my technical background in full-stack engineering and automated workflow systems can add immediate value to your development cycles.</p>
            
            <p>Are you open to a quick touchbase?</p>
            
            <p>Best regards,<br>
            <strong>Shubham</strong><br>
            Full-Stack & Automation Engineer</p>
            </body>
        </html>
        `.trim();

        const subject = `Workflow optimization query regarding ${lead.companyDomain}`;

        try {
            const result = await withRetry(() => sendOutreachEmail(lead, subject, htmlBody));
            logger.info(`✅ Outreach email successfully processed for ${lead.name}. Brevo ID: ${result.messageId}`);
        } catch (deliveryError) {
            logger.error(`Non-fatal failure delivering outreach payload to endpoint ${lead.email}:`, deliveryError.message || deliveryError);
        }
    }

    logger.info('☑️ Automated outreach pipeline runtime execution loop closed out completely.');
}
