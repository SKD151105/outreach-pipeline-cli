import Joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = Joi.object({
    OCEAN_API_KEY: Joi.string().trim().min(1).required().messages({
        'any.required': 'CRITICAL: OCEAN_API_KEY is missing from your .env file.'
    }),
    PROSPEO_API_KEY: Joi.string().trim().min(1).required().messages({
        'any.required': 'CRITICAL: PROSPEO_API_KEY is missing from your .env file.'
    }),
    BREVO_API_KEY: Joi.string().trim().min(1).required().messages({
        'any.required': 'CRITICAL: BREVO_API_KEY is missing from your .env file.'
    }),
    SENDER_EMAIL: Joi.string().trim().email().required().messages({
        'any.required': 'CRITICAL: SENDER_EMAIL is missing from your .env file.',
        'string.email': 'CRITICAL: SENDER_EMAIL must be a valid email address.'
    }),
    SENDER_NAME: Joi.string().trim().min(1).required().messages({
        'any.required': 'CRITICAL: SENDER_NAME is missing from your .env file.'
    }),
}).unknown(true);

const { error, value } = envSchema.validate(process.env, {
    abortEarly: false
});

// Fail-fast mechanism to handle missing environment variables
if (error) {
    console.error('\n🛑 [ENVIRONMENT VALIDATION FAILED]');
    console.error(error.message);
    console.error('Please check your .env file and try again.\n');
    process.exit(1);
}

export const envConfig = {
    oceanKey: value.OCEAN_API_KEY,
    prospeoKey: value.PROSPEO_API_KEY,
    brevoKey: value.BREVO_API_KEY,
    senderEmail: value.SENDER_EMAIL,
    senderName: value.SENDER_NAME
};
