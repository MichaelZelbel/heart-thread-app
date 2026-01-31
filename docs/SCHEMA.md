# Database Schema Documentation

## AI Credit System

The AI credit system uses a **token-as-source-of-truth** architecture. Credits are never stored directly—they are always calculated dynamically from tokens using the configurable `tokens_per_credit` ratio.

### Key Principles

1. **Tokens are the source of truth** - All balances and usage are tracked in tokens
2. **Credits are calculated dynamically** - `credits = tokens / tokens_per_credit`
3. **Changing `tokens_per_credit` affects everyone immediately** - No migration needed
4. **Rollover is capped** - Users can roll over up to their plan's monthly allowance
5. **Audit trail is immutable** - All LLM calls are logged to `llm_usage_events`

---

## Tables

### `ai_credit_settings`

Global configuration for the AI credit system. These settings affect all users.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | text | - | Setting identifier (primary key) |
| `value_int` | integer | - | Integer value for the setting |
| `description` | text | null | Human-readable description |

**Default Settings:**

| Key | Default Value | Description |
|-----|---------------|-------------|
| `tokens_per_credit` | 200 | How many tokens equal 1 credit |
| `credits_free_per_month` | 0 | Monthly credits for free users |
| `credits_premium_per_month` | 1500 | Monthly credits for pro/admin users |

**Important:** Changing `tokens_per_credit` immediately affects all credit calculations across the entire application—no data migration required.

---

### `ai_allowance_periods`

Tracks token allowances per user per billing period. This is the core balance table.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | - | Reference to auth.users |
| `tokens_granted` | bigint | 0 | Total tokens available (base + rollover) |
| `tokens_used` | bigint | 0 | Tokens consumed by LLM calls |
| `period_start` | timestamptz | - | Start of billing period (1st of month) |
| `period_end` | timestamptz | - | End of billing period (1st of next month) |
| `source` | text | null | How tokens were granted: `subscription`, `free_tier`, `admin_grant` |
| `metadata` | jsonb | {} | Additional context |
| `created_at` | timestamptz | now() | Record creation time |
| `updated_at` | timestamptz | now() | Last update time |

**Metadata Structure:**
```json
{
  "base_tokens": 300000,      // Tokens from plan (credits × tokens_per_credit)
  "rollover_tokens": 50000,   // Tokens carried from previous period
  "user_role": "pro"          // User's role at time of creation
}
```

**Balance Calculation:**
- `remaining_tokens = tokens_granted - tokens_used`
- `remaining_credits = remaining_tokens / tokens_per_credit`

**Rollover Logic:**
- Rollover = min(previous_remaining_tokens, base_tokens)
- Users cannot roll over more than their monthly plan allows

---

### `llm_usage_events`

Immutable audit ledger of all LLM API calls. Used for debugging, analytics, and compliance.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `user_id` | uuid | - | User who made the request |
| `idempotency_key` | text | - | Unique key to prevent duplicates (e.g., `claire_chat_{userId}_{timestamp}`) |
| `feature` | text | null | Which feature triggered the call: `claire_chat`, `suggest_activity`, `refine_prompt` |
| `model` | text | null | LLM model used (e.g., `gpt-4o-mini`) |
| `provider` | text | null | API provider (e.g., `openai`, `anthropic`) |
| `prompt_tokens` | bigint | 0 | Tokens in the prompt |
| `completion_tokens` | bigint | 0 | Tokens in the response |
| `total_tokens` | bigint | 0 | prompt_tokens + completion_tokens |
| `credits_charged` | numeric | 0 | Historical snapshot: total_tokens / tokens_per_credit at time of call |
| `metadata` | jsonb | {} | Additional context (partner_id, etc.) |
| `created_at` | timestamptz | now() | When the call was made |

**Important Notes:**
- `credits_charged` is a **historical snapshot** for reporting purposes
- The actual balance deduction uses `total_tokens` against `ai_allowance_periods.tokens_used`
- This table is append-only—records should never be updated or deleted

---

## Views

### `v_ai_allowance_current`

Convenience view that calculates current credit balances dynamically.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Period ID |
| `user_id` | uuid | User ID |
| `tokens_granted` | bigint | Total tokens available |
| `tokens_used` | bigint | Tokens consumed |
| `remaining_tokens` | bigint | `tokens_granted - tokens_used` |
| `tokens_per_credit` | integer | Current conversion ratio |
| `credits_granted` | bigint | `tokens_granted / tokens_per_credit` |
| `credits_used` | bigint | `tokens_used / tokens_per_credit` |
| `remaining_credits` | bigint | `remaining_tokens / tokens_per_credit` |
| `period_start` | timestamptz | Period start date |
| `period_end` | timestamptz | Period end date |
| `source` | text | How tokens were granted |
| `metadata` | jsonb | Period metadata |
| `created_at` | timestamptz | Period creation time |
| `updated_at` | timestamptz | Period update time |

**View Definition Logic:**
- Joins `ai_allowance_periods` with `ai_credit_settings`
- Filters to current period (`period_start <= now() < period_end`)
- Calculates all credit values dynamically using current `tokens_per_credit`

---

## Architecture Flow

### Token Initialization (Daily Cron Job)

A `pg_cron` job runs daily at 00:05 UTC:

```
cron.schedule('daily-token-allowance-reset', '5 0 * * *', ...)
```

This calls the `ensure-token-allowance` edge function with `batch_init: true` to:
1. Create new periods for users on the 1st of each month
2. Calculate rollover from previous period
3. Ensure users don't wait for lazy initialization

### Token Consumption Flow

1. **Frontend** calls `checkCredits()` from `useAICreditsGate` hook
2. If credits available, proceeds with AI API call
3. **Edge function** makes LLM request
4. On success, edge function:
   - Inserts record into `llm_usage_events`
   - Increments `tokens_used` in `ai_allowance_periods`
5. **Frontend** calls `refetchCredits()` to update display

### Credit Display

The `CreditsDisplay` component:
1. Reads from `v_ai_allowance_current` view
2. Shows progress bar with base vs rollover breakdown
3. Triggers low-credit warning at 15% remaining

---

## RLS Policies

### `ai_credit_settings`
- **SELECT**: Anyone can read (needed for calculations)
- **UPDATE**: Admins only

### `ai_allowance_periods`
- **SELECT**: Users see their own; admins see all
- **INSERT/UPDATE**: Admins only (created by edge functions with service role)
- **DELETE**: Not allowed

### `llm_usage_events`
- **SELECT**: Users see their own; admins see all
- **INSERT/UPDATE/DELETE**: Not allowed via client (service role only)

---

## Example Queries

### Get user's current balance
```sql
SELECT remaining_credits, remaining_tokens
FROM v_ai_allowance_current
WHERE user_id = 'USER_UUID';
```

### Get user's usage history
```sql
SELECT feature, model, total_tokens, credits_charged, created_at
FROM llm_usage_events
WHERE user_id = 'USER_UUID'
ORDER BY created_at DESC
LIMIT 50;
```

### Calculate total usage this month
```sql
SELECT 
  SUM(total_tokens) as total_tokens,
  SUM(credits_charged) as total_credits
FROM llm_usage_events
WHERE user_id = 'USER_UUID'
  AND created_at >= date_trunc('month', now());
```

### Admin: Get all users' current balances
```sql
SELECT 
  user_id,
  remaining_credits,
  credits_granted,
  source
FROM v_ai_allowance_current
ORDER BY remaining_credits ASC;
```
