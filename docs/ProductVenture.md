# Product Venture Plan: Model Credit Costs

## Goal

Maintain model credit costs in `packages/ai/src/models.ts` so `packages/payments` can ingest usage with the correct credit amount per coding generation.

## Current Baseline

- Paid credit package: `$20` buys `1000` credits.
- Revenue per credit: `$0.02`.
- Target gross margin: `70%`.
- Maximum provider cost per credit at target margin: `$0.006`.
- Current payment ingestion accepts an integer `credits` value and sends it to Polar as `metadata.credits`.

## Scraped Pricing

| Model | Provider | Input $/1M tokens | Cached input $/1M tokens | Output $/1M tokens | Source |
| --- | --- | ---: | ---: | ---: | --- |
| Claude Sonnet 4.6 | Anthropic | `$3.00` | TBD | `$15.00` | Anthropic launch/pricing pages via Firecrawl |
| GPT-5.1 | OpenAI | `$0.625` | `$0.125` | `$5.00` | OpenAI pricing page via Firecrawl |

## Proposed Credit Cost Metadata

`packages/ai/src/models.ts` should be the source of truth for:

- Provider token pricing used for internal economics.
- Minimum credits to charge for a generation.
- Revenue per credit used for margin calculations.
- Target gross margin used when reviewing pricing.

Initial values now encoded in the model registry:

| Model | Minimum credits | User charge | Rationale |
| --- | ---: | ---: | --- |
| Claude Sonnet 4.6 | `25` | `$0.50` | Covers a representative coding run of `100k` input tokens and `10k` output tokens at about `$0.45`, leaving roughly `10%` gross margin for that heavy run and stronger margins on smaller/cached runs. |
| GPT-5.1 | `8` | `$0.16` | Covers a representative coding run of `100k` input tokens and `10k` output tokens at about `$0.1125`, leaving roughly `30%` gross margin before caching. |

These minimums are intentionally conservative for launch. They protect against expensive long-context coding runs while keeping the default user-facing unit simple.

## Margin Math

Formula:

```text
provider_cost = input_tokens / 1_000_000 * input_price + output_tokens / 1_000_000 * output_price
revenue = credits_charged * 0.02
gross_margin = (revenue - provider_cost) / revenue
```

Representative `100k input + 10k output` generation:

| Model | Provider cost | Credits | Revenue | Gross margin |
| --- | ---: | ---: | ---: | ---: |
| Claude Sonnet 4.6 | `$0.45` | `25` | `$0.50` | `10%` |
| GPT-5.1 | `$0.1125` | `8` | `$0.16` | `29.7%` |

Target `70%` margin requires charging:

| Model | Credits needed for target margin |
| --- | ---: |
| Claude Sonnet 4.6 | `75` |
| GPT-5.1 | `19` |

The product decision is whether to optimize for launch simplicity or strict margin protection. For strict margin protection, use the target-margin credits as the required minimum. For adoption, start with the encoded minimums and monitor actual token usage.

## Implementation Plan

1. Keep model pricing and credit-cost metadata in `packages/ai/src/models.ts`.
2. Add a small helper in `packages/ai` to return the minimum credit cost for a `CodingModelId`.
3. Update server generation start checks to call `assertHasCredits` with the selected model's minimum credit cost instead of `1`.
4. Update generation completion ingestion to pass the selected model's credit cost into `payments.ingestUsage`.
5. Include model id, provider, token counts, provider cost estimate, and credits charged in usage metadata.
6. Add tests for each configured model so payment ingestion cannot regress to a flat `1` credit charge.
7. Revisit credit costs after one week of production token data and tune against actual average provider cost.

## Open Decisions

- Whether Claude Sonnet 4.6 should launch at `25` credits for adoption or `75` credits for target margin protection.
- Whether credit charge should remain fixed per generation or become token-metered after completion.
- Whether cached input discounts should reduce the charged credits or be retained as margin.
