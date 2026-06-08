import axios from 'axios';
import { envConfig } from '../config/env.js';

// Centralized connection parameters and security credentials for Brevo
const brevoApi = axios.create({
    baseURL: 'https://api.brevo.com/v3',
    headers: {
        'api-key': envConfig.brevoKey,
        'content-type': 'application/json',
        'accept': 'application/json'
    },
    timeout: 15000 // Mitigate open socket hangs on unstable networks
});

/**
 * Dispatches an automated, personalized transactional outreach email.
 * @param {Object} recipient - Target contact coordinates
 * @param {string} recipient.email - Target's verified email address
 * @param {string} recipient.name - Target's full name
 * @param {string} subject - Email subject header
 * @param {string} htmlBody - Valid HTML content defining the email layout and copy
 * @returns {Promise<Object>} Raw response containing the unique messageId for deliverability tracking
 */
export async function sendOutreachEmail({ email, name }, subject, htmlBody) {
    const payload = {
        sender: {
            name: envConfig.senderName,
            email: envConfig.senderEmail
        },
        to: [
            {
                email: email,
                name: name
            }
        ],
        subject: subject,
        htmlContent: htmlBody
    };

    // POST request to the 'send transactional email' endpoint with the constructed payload
    const response = await brevoApi.post('/smtp/email', payload);
    return response.data;
}