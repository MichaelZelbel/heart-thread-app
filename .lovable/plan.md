

# Consolidate `events` and `moments` into a Single `moments` Table

## Summary

Drop the `events` table entirely and expand the `moments` table to absorb all event functionality. Every timeline entry becomes a "Moment" -- some of which are celebrated annually and trigger reminders.

## What Changes

### 1. Database Migration

Alter the `moments` table to add the columns currently unique to `events`:

- `is_celebrated_annually` (boolean, default false) -- replaces `is_recurring`
- `event_type` (text, nullable) -- preserves event categorization (Birthday, Anniversary, etc.) for icon display and reminders
- `partner_id` (uuid, nullable) -- single-partner shortcut kept for backward compatibility alongside `partner_ids`

After migrating, copy all rows from `events` into `moments` (mapping `event_date` to `moment_date`, `is_recurring` to `is_celebrated_annually`, etc.), then drop the `events` table.

Also update `event_notifications` to reference `moment_id` instead of `event_id` (rename column), since reminders will now point to moments.

### 2. Reminder Logic Update

Update the `send-event-reminders` edge function to:
- Query `moments` instead of `events`
- Match on `is_celebrated_annually = true` OR `moment_date` is tomorrow (for future one-off moments coming up)
- Continue deduplicating by `partner_id + event_type` as before
- Reference `moment_id` in `event_notifications`

### 3. Components to Refactor

| File | Change |
|------|--------|
| `CherishedTimeline.tsx` | Query only `moments`. Remove dual-fetch and merge logic. Single entry type. |
| `TimelineItemDialog.tsx` | Single form for all moments. Remove `mode` prop. Add "Celebrated Annually" toggle (replaces event vs. memory distinction). Keep event type selector as optional categorization. |
| `EventManager.tsx` | Rewrite to query `moments` filtered by partner. Keep Birthday special-case logic. |
| `AllEventsCalendar.tsx` | Query `moments` where `is_celebrated_annually = true` or `moment_date` is in the future. |
| `MomentManager.tsx` | Update to use the new columns. Remove since its functionality is now fully covered by the timeline. |
| `Dashboard.tsx` | Update `loadUpcomingEvents` and `loadMoments` to both query `moments`. |
| `PartnerDetail.tsx` | Birthday sync logic writes to `moments` instead of `events`. |
| `CherishWizard.tsx` | Wizard inserts into `moments` instead of `events`. |
| `PartnerWizard.tsx` | Same as above. |
| `EmailVerificationPending.tsx` | Same as above. |

### 4. Data Migration Details

```text
For each row in `events`:
  INSERT INTO moments (
    user_id, title, description, moment_date,
    partner_ids, is_celebrated_annually, event_type, photo_url
  ) VALUES (
    events.user_id, events.title, events.description, events.event_date,
    ARRAY[events.partner_id], events.is_recurring, events.event_type, NULL
  )
```

Then update `event_notifications.event_id` to point to the new moment IDs using a mapping table, and rename the column to `moment_id`.

### 5. Final `moments` Table Schema

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | Owner |
| title | text | Required |
| description | text | Optional |
| moment_date | date | Required |
| partner_ids | uuid[] | One or more partners |
| is_celebrated_annually | boolean | Default false. Enables reminders. |
| event_type | text | Optional categorization (Birthday, Anniversary, etc.) |
| photo_url | text | For future photo attachment |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### 6. UI Simplification

- The Timeline tab shows a single unified feed -- no more "Add Event" vs "Add Memory" split buttons; just "Add Moment"
- The dialog shows an optional "Type" dropdown and a "Celebrated Annually" toggle
- When "Celebrated Annually" is on, the moment appears in the calendar and triggers email reminders
- The "Milestones" filter in the timeline filters by moments that have a recognized `event_type`

### 7. RLS

The existing `moments` RLS policies already cover all CRUD for `user_id = auth.uid()`. No policy changes needed.

## Technical Details

### Migration SQL (high-level)

1. `ALTER TABLE moments ADD COLUMN is_celebrated_annually boolean NOT NULL DEFAULT false`
2. `ALTER TABLE moments ADD COLUMN event_type text`
3. Insert all `events` rows into `moments`
4. Create a temp mapping of old event IDs to new moment IDs
5. Update `event_notifications` to use new IDs and rename column
6. `DROP TABLE events`
7. Drop unused `events` RLS policies (handled automatically by DROP)

### Edge Function Changes

The `send-event-reminders` function will query:
- `moments` where `is_celebrated_annually = true` and month/day match tomorrow
- `moments` where `moment_date` equals tomorrow (upcoming future moments)
- Partner birthdates (unchanged -- these come from `partners.birthdate`)

### Risk Mitigation

- Check Live environment for existing `events` data before migration
- The migration will copy all events data into moments first, then drop events
- The `event_notifications` foreign key will be updated in the same migration transaction

