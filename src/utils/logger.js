import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, splat } = winston.format;
const splatKey = Symbol.for('splat');

const customFormat = printf((info) => {
    const extraValues = info[splatKey] || [];
    const serializedExtras = extraValues
        .map(value => value instanceof Error ? value.stack || value.message : typeof value === 'object' ? JSON.stringify(value) : String(value))
        .join(' ');

    const renderedMessage = [info.stack || info.message, serializedExtras].filter(Boolean).join(' ');
    return `${info.timestamp} [${info.level}]: ${renderedMessage}`;
});

export const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        splat(),
        errors({ stack: true }),
        customFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                splat(),
                errors({ stack: true }),
                customFormat
            )
        }),
        new winston.transports.File({
            filename: 'error.log',
            level: 'error'
        })
    ]
});
