# Outreach Pipeline CLI

<p align="center">
  <img
    src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='240' viewBox='0 0 1200 240'><rect width='1200' height='240' rx='24' fill='%230b1320'/><rect x='24' y='24' width='1152' height='192' rx='18' fill='%23141f34' stroke='%232b3f66' stroke-width='2'/><text x='60' y='95' font-family='Segoe UI, Arial, sans-serif' font-size='40' font-weight='700' fill='%23f5f7fb'>Outreach Pipeline CLI</text><text x='60' y='138' font-family='Segoe UI, Arial, sans-serif' font-size='20' fill='%23bfd1ee'>Node.js automation for company discovery, contact enrichment, and controlled outbound outreach</text><rect x='60' y='162' width='178' height='34' rx='17' fill='%231f5eff'/><text x='88' y='184' font-family='Segoe UI, Arial, sans-serif' font-size='16' font-weight='600' fill='white'>ES Modules</text><rect x='255' y='162' width='168' height='34' rx='17' fill='%231f7a4d'/><text x='286' y='184' font-family='Segoe UI, Arial, sans-serif' font-size='16' font-weight='600' fill='white'>API Driven</text><rect x='440' y='162' width='228' height='34' rx='17' fill='%23714d00'/><text x='470' y='184' font-family='Segoe UI, Arial, sans-serif' font-size='16' font-weight='600' fill='white'>Operator Approval Gate</text></svg>"
    alt="Outreach Pipeline CLI banner"
  />
</p>

A production-style command-line pipeline for discovering lookalike companies, identifying decision-makers, enriching verified contact data, and dispatching personalized outreach emails through a human-approved delivery step.

The project is intentionally structured as a layered Node.js backend script rather than a monolithic automation file. It emphasizes operational clarity, integration boundaries, defensive validation, credit-conscious API usage, and interview-ready separation of concerns.

## Overview

This repository orchestrates a four-stage outbound workflow:

1. Discover lookalike companies from a seed domain using Ocean.io.
2. Search executive-level contacts for each discovered company using Prospeo.
3. Enrich each selected contact with a verified work email address.
4. Present the final lead set for operator review before sending outreach through Brevo.

The pipeline is optimized for controlled execution rather than maximum throughput. It favors predictable behavior, transparent logging, and budget protection for limited API plans.

## Key Characteristics

- Native ES Modules with a clean service-oriented structure.
- Fail-fast environment validation using Joi.
- Layered API clients to isolate third-party concerns.
- Retry logic for rate limits, transient server failures, and network interruptions.
- Manual approval checkpoint before any outbound email is sent.
- Lead deduplication and normalization to reduce wasted enrichment and send volume.
- Pagination safeguards to avoid looping on invalid cursors or unusable pages.
- Domain normalization at the CLI boundary to prevent malformed seed inputs.

## System Architecture

```text
CLI Input
  -> Input Normalization and Validation
  -> Company Discovery Service
      -> Ocean.io Client
  -> Contact Enrichment Service
      -> Prospeo Search Client
      -> Prospeo Enrichment Client
  -> Email Dispatch Service
      -> Operator Approval Prompt
      -> Brevo Client
  -> Structured Logging and Error Handling
```

## Repository Structure

```text
.
|-- src
|   |-- clients
|   |   |-- brevoClient.js
|   |   |-- oceanClient.js
|   |   `-- prospeoClient.js
|   |-- config
|   |   `-- env.js
|   |-- services
|   |   |-- companyDiscovery.js
|   |   |-- contactEnrichment.js
|   |   `-- emailDispatcher.js
|   |-- utils
|   |   |-- logger.js
|   |   `-- retryHelper.js
|   `-- index.js
|-- .env.example
|-- package.json
`-- README.md
```

## Execution Flow

### 1. Seed Input Normalization

The CLI accepts a seed company domain as an argument:

```bash
npm start stripe.com
```

The input is normalized before any API call is made:

- protocol prefixes such as `https://` are removed
- `www.` is stripped
- paths and query strings are discarded
- the result must still look like a real domain

This prevents invalid inputs such as `juspay` from reaching Ocean.io and failing as unnecessary billable requests.

### 2. Lookalike Company Discovery

The discovery layer calls Ocean.io with a seed domain and paginates until one of the following conditions is met:

- the target number of unique domains is reached
- Ocean.io returns no more results
- the API repeats a cursor
- a page returns result objects but no extractable domains

The implementation deduplicates domains with a `Set` and includes a first-page diagnostic log to inspect the real third-party payload shape when debugging integrations.

### 3. Contact Search and Enrichment

For each discovered domain, the pipeline:

- searches Prospeo for senior contacts
- restricts selection to a capped number of profiles per company
- enriches only the selected profiles for verified work emails
- normalizes email addresses and contact names
- drops duplicates before they progress to delivery

This stage is intentionally conservative to preserve limited API credits.

### 4. Human Approval Gate

Before any email is sent, the final lead list is displayed in a terminal table. The operator must explicitly confirm the send operation. If approval is not granted, the pipeline exits without delivering any messages.

This design keeps the system safer for demos, evaluations, and real-world testing scenarios.

### 5. Email Delivery

Each approved lead receives a personalized HTML email via Brevo. The send step runs sequentially to preserve clear logs and reduce the risk of triggering avoidable rate limits on entry-level plans.

## Technology Stack

| Category | Technology |
|---|---|
| Runtime | Node.js 22+ |
| Module System | Native ES Modules |
| HTTP Client | Axios |
| Configuration | dotenv |
| Validation | Joi |
| Logging | Winston |
| Discovery Provider | Ocean.io |
| Contact Search and Enrichment | Prospeo |
| Email Delivery | Brevo |

## Environment Variables

Create a `.env` file in the repository root.

```env
OCEAN_API_KEY=your_ocean_key
PROSPEO_API_KEY=your_prospeo_key
BREVO_API_KEY=your_brevo_key
SENDER_EMAIL=you@yourdomain.com
SENDER_NAME="Your Name"
```

The runtime validates all required variables at startup and terminates immediately if configuration is incomplete or malformed.

## Getting Started

### Prerequisites

- Node.js 22 or later
- npm
- Active API credentials for Ocean.io, Prospeo, and Brevo
- A verified sender identity configured in Brevo

### Installation

```bash
git clone https://github.com/SKD151105/outreach-pipeline-cli.git
cd outreach-pipeline-cli
npm install
```

### Configuration

```bash
copy .env.example .env
```

Then populate `.env` with your live credentials.

### Run

```bash
npm start stripe.com
```

Another valid example:

```bash
npm start juspay.in
```

## Sample Runtime Behavior

At a high level, a successful run looks like this:

```text
1. Normalize and validate the seed domain
2. Fetch lookalike company pages from Ocean.io
3. Extract unique company domains
4. Search and enrich one or more decision-makers per company
5. Display a terminal review table
6. Wait for explicit operator confirmation
7. Send outreach emails through Brevo
8. Log completion or failures
```

## Cost and Credit Controls

This repository is designed with free-tier and limited-credit usage in mind.

Current safeguards include:

- `maxPerCompany = 1` to limit contact enrichment cost
- sequential processing for simpler rate control
- retry logic only for retryable failures
- duplicate email detection before delivery
- stop conditions for repeated cursors and non-productive discovery pages
- early input validation to prevent invalid billable requests

If you want to increase throughput later, the safest next step would be a bounded concurrency pool with explicit per-provider limits rather than full parallelism.

## Reliability and Defensive Design

Several implementation choices are there specifically to make the workflow more robust:

- Startup environment validation prevents partially configured execution.
- Unhandled promise rejections terminate the process instead of leaving the CLI in an uncertain state.
- Ocean.io request errors are enriched with response context to improve debugging.
- Retry delays respect `Retry-After` when supplied by the provider.
- Discovery halts if pagination becomes untrustworthy or unproductive.
- Contact enrichment skips malformed or duplicate records rather than risking poor-quality outreach.

## Security Considerations

This project follows basic 12-factor configuration practices by loading secrets from environment variables rather than hardcoding credentials in source files.

Recommended production hardening steps:

- never commit `.env`
- rotate provider credentials regularly
- mask sensitive request and response data in any shared logs
- move from local `.env` to a proper secret manager for hosted execution
- review outbound email copy and recipients before every live send

## Known Limitations

- The pipeline depends entirely on external API quality and availability.
- Current execution is sequential by design and not optimized for large-scale throughput.
- Email copy is currently embedded in the dispatcher rather than templated.
- The repository does not yet include automated unit or integration tests.
- Some console output strings still contain encoding artifacts from earlier edits and can be cleaned up separately if needed.

## Troubleshooting

### Invalid seed input

If the run fails before discovery starts, ensure you are passing a real domain:

```bash
npm start razorpay.com
```

Not:

```bash
npm start razorpay
```

### Ocean.io returns `402`

This typically indicates a billing or credit limit issue with the provider account.

### Discovery returns zero domains

Use the first-page diagnostic output to inspect the vendor payload and confirm the current response shape still includes a usable nested company domain.

### No contacts are found

Prospeo may not have relevant seniority matches for a discovered company, or the account may have enrichment limitations on the current plan.

## Development Notes

The codebase is organized so each layer owns a specific concern:

- `clients/` handles raw HTTP contracts
- `services/` orchestrate business workflow
- `config/` validates runtime configuration
- `utils/` provide reusable cross-cutting behavior
- `index.js` remains a thin entrypoint

This separation makes the project easier to reason about during interviews and easier to extend later with features such as concurrency pools, typed custom error classes, persistence, analytics, or alternate provider adapters.

## Suggested Next Improvements

- Introduce a bounded concurrency utility for controlled parallel enrichment.
- Externalize email templates into dedicated view files.
- Add unit tests around domain normalization, retry classification, and lead deduplication.
- Add structured custom error classes for provider, validation, and credit-exhaustion failures.
- Introduce persistent run artifacts for audit history and replay safety.
- Add a dry-run mode for non-sending demonstrations.

## Interview Positioning

If you are presenting this repository in an interview, the strongest framing is:

- it demonstrates layered backend architecture in a CLI form
- it integrates multiple third-party systems behind clean client boundaries
- it shows defensive programming around paid APIs
- it balances automation with operator control at the final delivery step
- it prioritizes observability, validation, and cost-awareness over flashy complexity

## License

This project is currently published under the `ISC` license as declared in `package.json`.
