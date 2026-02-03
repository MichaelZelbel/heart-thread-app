# Cherishly E2E Test Cases

This document contains comprehensive end-to-end test cases for browser-based testing of the Cherishly application.

---

## Test Personas

| Role  | Name  | Email              | Password   | Description |
|-------|-------|-------------------|------------|-------------|
| Free  | Fred  | `fred@free.com`   | `Dell@123` | Free tier user with limited features |
| Pro   | Peter | `peter@pro.com`   | `Dell@123` | Pro subscriber with full feature access |
| Admin | Alec  | `alec@admin.com`  | `Dell@123` | Administrator with user management access |

> **Setup**: Run `SELECT public.assign_role_by_email('email', 'role');` in Cloud View > Run SQL to assign roles after creating users.

---

## Expected Test Data Summary

| Artifact Type | Created During Tests | Test Owner |
|--------------|---------------------|------------|
| User Account | 1 new user (signup test) | N/A |
| Partner/Cherished | "Test Partner" | Fred, Peter |
| Event | "Test Anniversary" | Peter |
| Like Item | "Chocolate cake" | Peter |
| Dislike Item | "Loud noises" | Peter |
| Blog Post (Draft) | "Test Blog Post" | Alec |
| Blog Category | "Test Category" | Alec |
| Blog Tag | "test-tag" | Alec |

---

## Section 1: Authentication & Onboarding

### TC-AUTH-001: New User Signup with Email/Password

Navigate to `/auth`

1. Click "Sign Up" tab if not already selected
2. Enter email: `testuser+{timestamp}@cherishly.app`
3. Enter password: `TestPass123!`
4. Confirm password: `TestPass123!`
5. Click "Sign Up" button

Validate that:
- Success toast appears with verification message
- User is redirected to `/email-verification-pending` page
- Page displays email verification instructions

---

### TC-AUTH-002: Login with Valid Credentials (Free User)

Navigate to `/auth`

1. Ensure "Sign In" tab is selected
2. Enter email: `fred@free.com`
3. Enter password: `Dell@123`
4. Click "Sign In" button

Validate that:
- User is redirected to `/dashboard`
- Dashboard displays "Welcome" with user's display name
- "Unlock the full magic" upgrade button is visible in navbar

---

### TC-AUTH-003: Login with Valid Credentials (Pro User)

Navigate to `/auth`

1. Ensure "Sign In" tab is selected
2. Enter email: `peter@pro.com`
3. Enter password: `Dell@123`
4. Click "Sign In" button

Validate that:
- User is redirected to `/dashboard`
- Dashboard loads without "Unlock the full magic" upgrade button
- Full feature access indicators are visible

---

### TC-AUTH-004: Login with Valid Credentials (Admin User)

Navigate to `/auth`

1. Ensure "Sign In" tab is selected
2. Enter email: `alec@admin.com`
3. Enter password: `Dell@123`
4. Click "Sign In" button

Validate that:
- User is redirected to `/dashboard`
- Admin has access to all Pro features
- Settings/Account page will show "Open Admin Dashboard" link

---

### TC-AUTH-005: Login with Invalid Credentials

Navigate to `/auth`

1. Ensure "Sign In" tab is selected
2. Enter email: `invalid@example.com`
3. Enter password: `wrongpassword`
4. Click "Sign In" button

Validate that:
- Error toast appears with authentication failure message
- User remains on `/auth` page
- Password field is cleared

---

### TC-AUTH-006: Logout

Prerequisite: Logged in as any user

Navigate to `/dashboard`

1. Click "Log Out" button in the navbar

Validate that:
- Success toast appears "Logged out successfully"
- User is redirected to `/auth` page
- Attempting to navigate to `/dashboard` redirects back to `/auth`

---

### TC-AUTH-007: Password Change

Prerequisite: Logged in as `fred@free.com`

Navigate to `/account`

1. Scroll to "Password" section
2. Enter current password: `Dell@123`
3. Enter new password: `NewPass456!`
4. Confirm new password: `NewPass456!`
5. Click "Change Password" button

Validate that:
- Success toast appears "Password changed successfully"
- Password fields are cleared
- (Optional) Logout and login with new password works

> **Cleanup**: Reset password back to `Dell@123` for future tests

---

## Section 2: Partner/Cherished CRUD Lifecycle

### TC-PARTNER-001: Create New Cherished (Full Wizard)

Prerequisite: Logged in as `peter@pro.com`

Navigate to `/dashboard`

1. Click "Add Cherished" button
2. Step 1 - Nickname:
   - Enter nickname: "Test Partner"
   - Click "Next"
3. Step 2 - Special Day:
   - Select event type: "Anniversary"
   - Select month: "June"
   - Select day: "15"
   - Click "Next"
4. Step 3 - Details:
   - Add like: "Chocolate cake" (type and press Enter or click +)
   - Add dislike: "Loud noises" (type and press Enter or click +)
   - Set love language "Physical Touch" to 5 hearts
   - Click "Next"
5. Step 4 - Notes:
   - Enter notes: "This is a test partner for E2E testing"
   - Click "Save Cherished"

Validate that:
- Success toast appears "{Name} added to your cherished!"
- User is redirected to `/partner/{id}` detail page
- Partner name "Test Partner" is displayed
- Dashboard shows new partner in the list

---

### TC-PARTNER-002: Read/View Cherished Details

Prerequisite: Partner "Test Partner" exists

Navigate to `/dashboard`

1. Click on "Test Partner" in the partner list

Validate that:
- Partner detail page loads at `/partner/{id}`
- Four tabs are visible: "Conversation", "Timeline", "Documents", "Profile"
- Profile tab shows:
  - Name: "Test Partner"
  - Birthday/Anniversary event visible
  - Love language ratings displayed

---

### TC-PARTNER-003: Update Cherished Name

Prerequisite: On partner detail page for "Test Partner"

Navigate to `/partner/{id}` (Profile tab)

1. Click "Profile" tab
2. Locate the Name field
3. Clear and enter new name: "Updated Partner"
4. Click outside the field or wait for auto-save

Validate that:
- "Saved" toast appears
- Page title/header updates to show "Updated Partner"
- Dashboard reflects the name change

---

### TC-PARTNER-004: Update Love Languages

Prerequisite: On partner detail page for "Updated Partner"

Navigate to `/partner/{id}` (Profile tab)

1. Click "Profile" tab
2. Locate "Love Languages" section
3. Click heart rating for "Words of Affirmation" to set to 4
4. Click heart rating for "Acts of Service" to set to 2

Validate that:
- Love language values update visually
- Auto-save "Saved" toast appears
- Refreshing page shows persisted values

---

### TC-PARTNER-005: Archive Cherished

Prerequisite: Partner "Updated Partner" exists

Navigate to `/partner/{id}`

1. Click "Archive" button in the navbar

Validate that:
- Success toast appears "Partner archived successfully"
- User is redirected to `/dashboard`
- Partner no longer appears in active partner list
- Partner appears in `/archive` page

---

### TC-PARTNER-006: Recover Archived Cherished

Prerequisite: "Updated Partner" is archived

Navigate to `/archive`

1. Locate "Updated Partner" in the archived list
2. Click "Recover" button next to the partner

Validate that:
- Success toast appears "{Name} recovered successfully"
- Partner is removed from archive list
- Partner reappears on `/dashboard`

---

### TC-PARTNER-007: Delete Cherished Permanently

Prerequisite: Partner exists (not archived)

Navigate to `/partner/{id}`

1. Click "Delete" button in the navbar
2. Confirm deletion in the dialog by clicking "Delete Permanently"

Validate that:
- Success toast appears "Cherished deleted permanently"
- User is redirected to `/dashboard`
- Partner is completely removed from all lists
- Partner does not appear in `/archive`

---

## Section 3: Likes/Dislikes CRUD

### TC-LIKES-001: Add Like Item

Prerequisite: Partner exists, on Profile tab

Navigate to `/partner/{id}` (Profile tab)

1. Scroll to "Things they love" section
2. Enter in input field: "Italian food"
3. Click the "+" button or press Enter

Validate that:
- "Added!" toast appears
- "Italian food" appears in the likes list
- Drag handle is visible for reordering

---

### TC-LIKES-002: Edit Like Item

Prerequisite: Like item "Italian food" exists

Navigate to `/partner/{id}` (Profile tab)

1. Locate "Italian food" in likes list
2. Click the edit (pencil) icon
3. Change text to "Pasta carbonara"
4. Press Enter or click checkmark

Validate that:
- "Updated!" toast appears
- Item now shows "Pasta carbonara"
- List order is preserved

---

### TC-LIKES-003: Delete Like Item

Prerequisite: Like item exists

Navigate to `/partner/{id}` (Profile tab)

1. Locate the like item to delete
2. Click the delete (trash) icon

Validate that:
- "Deleted" toast appears
- Item is removed from the list
- List reflows correctly

---

### TC-LIKES-004: Reorder Like Items (Drag and Drop)

Prerequisite: At least 2 like items exist

Navigate to `/partner/{id}` (Profile tab)

1. Locate the drag handle (grip icon) of the first item
2. Drag the first item below the second item
3. Release

Validate that:
- Items swap positions visually
- Refreshing page maintains new order
- Position is persisted in database

---

### TC-DISLIKES-001: Add Dislike Item

Prerequisite: Partner exists, on Profile tab

Navigate to `/partner/{id}` (Profile tab)

1. Scroll to "Things they dislike" section
2. Enter in input field: "Cold weather"
3. Click the "+" button

Validate that:
- "Added!" toast appears
- "Cold weather" appears in the dislikes list

---

## Section 4: Events/Calendar

### TC-EVENTS-001: Create Custom Event

Prerequisite: Partner exists

Navigate to `/partner/{id}` (Profile tab)

1. Scroll to "Calendar" or "Events" section
2. Click "Add Event" button
3. Enter title: "Test Anniversary"
4. Select date: Tomorrow's date
5. Toggle "Recurring yearly" on
6. Click "Save"

Validate that:
- Success toast appears
- Event appears in partner's calendar section
- Event appears on dashboard "Upcoming Events" if within 7 days

---

### TC-EVENTS-002: View Birthday Event (Auto-created)

Prerequisite: Partner has birthdate set

Navigate to `/dashboard`

1. Check "Upcoming Events" section

Validate that:
- If birthday is within 7 days, it appears in upcoming events
- Birthday displays as "{Name}'s Birthday"
- Birthday is marked as recurring

---

### TC-EVENTS-003: Edit Event

Prerequisite: Custom event exists

Navigate to `/partner/{id}` (Profile tab)

1. Locate the event in calendar section
2. Click on event to edit
3. Change title to "Updated Anniversary"
4. Click "Save"

Validate that:
- Event title is updated
- Changes persist after page refresh

---

### TC-EVENTS-004: Delete Event

Prerequisite: Custom event exists

Navigate to `/partner/{id}` (Profile tab)

1. Locate the event in calendar section
2. Click delete icon on the event
3. Confirm deletion if prompted

Validate that:
- Event is removed from calendar
- Event no longer appears in dashboard upcoming events

---

## Section 5: Premium Feature Gating

### TC-PREMIUM-001: Free User Sees Upgrade Prompt for Claire AI

Prerequisite: Logged in as `fred@free.com` (Free user)

Navigate to `/partner/{id}` (any partner)

1. Click "Conversation" tab

Validate that:
- UpgradePrompt component is displayed instead of Claire chat
- Prompt shows "Conversation with Claire" as the gated feature
- "Upgrade to Pro" or similar CTA is visible
- AI chat input is NOT available

---

### TC-PREMIUM-002: Pro User Can Access Claire AI

Prerequisite: Logged in as `peter@pro.com` (Pro user)

Navigate to `/partner/{id}` (any partner)

1. Click "Conversation" tab

Validate that:
- MessageCoach component loads with Claire chat
- Context textarea is available
- Intent textarea is available
- Tone selector buttons are visible
- Chat interface is functional

---

### TC-PREMIUM-003: Free User Dashboard Shows Upgrade CTA

Prerequisite: Logged in as `fred@free.com` (Free user)

Navigate to `/dashboard`

Validate that:
- "Unlock the full magic" button is visible in navbar
- Clicking it navigates to `/pricing`
- Free plan is shown as current on pricing page

---

### TC-PREMIUM-004: Pricing Page Pro Upgrade Flow

Prerequisite: Logged in as `fred@free.com` (Free user)

Navigate to `/pricing`

1. Locate "Upgrade to Pro" button
2. Click the button

Validate that:
- Loading state appears on button
- Stripe checkout session is created (new tab opens to Stripe)
- No console errors appear

> **Note**: Completing actual payment requires Stripe test mode and is typically tested separately

---

### TC-PREMIUM-005: Pro User Sees Manage Subscription

Prerequisite: Logged in as `peter@pro.com` (Pro user)

Navigate to `/pricing`

Validate that:
- "Manage Subscription" button is visible instead of upgrade button
- Clicking opens Stripe customer portal in new tab

---

## Section 6: Admin Dashboard

### TC-ADMIN-001: Admin Can Access Admin Dashboard

Prerequisite: Logged in as `alec@admin.com` (Admin)

Navigate to `/account`

1. Locate "Admin Access" card
2. Click "Open Admin Dashboard" button

Validate that:
- User is navigated to `/admin`
- User list table is displayed
- Stats cards show Total Users, Admins, Pro Users, Free Users

---

### TC-ADMIN-002: Non-Admin Cannot Access Admin Dashboard

Prerequisite: Logged in as `fred@free.com` (Free user)

Navigate to `/admin` directly via URL

Validate that:
- Error toast appears "Access denied. Admin privileges required."
- User is redirected to `/` (home page)
- Admin dashboard is NOT displayed

---

### TC-ADMIN-003: Admin Can Search Users

Prerequisite: On `/admin` as admin

Navigate to `/admin`

1. Enter "fred" in the search input

Validate that:
- User list filters to show only users matching "fred"
- Search is case-insensitive
- Clearing search shows all users again

---

### TC-ADMIN-004: Admin Can Change User Role

Prerequisite: On `/admin` as admin

Navigate to `/admin`

1. Locate a test user in the list
2. Click the role dropdown for that user
3. Select a different role (e.g., "Pro" → "Free")

Validate that:
- Success toast appears "User role updated successfully"
- Role badge updates in the table
- Change persists after page refresh

> **Cleanup**: Reset role to original value

---

### TC-ADMIN-005: Admin Can Toggle Email Notifications

Prerequisite: On `/admin` as admin

Navigate to `/admin`

1. Locate a user in the list
2. Click the "On/Off" button in Email Notifications column

Validate that:
- Button toggles between "On" and "Off"
- Success toast appears
- Change persists after refresh

---

### TC-ADMIN-006: Admin Can Delete User

Prerequisite: Test user exists for deletion

Navigate to `/admin`

1. Locate the test user
2. Click the trash icon
3. Confirm deletion in dialog

Validate that:
- Success toast appears "User deleted successfully"
- User is removed from the list
- User count stats update

> **Warning**: Only delete test accounts created for testing

---

### TC-ADMIN-007: Admin AI Credit Settings

Prerequisite: On `/admin` as admin

Navigate to `/admin`

1. Scroll to "AI Credit Settings" section

Validate that:
- Credit settings form is visible
- Current values are displayed
- Settings can be viewed (modification is admin-only action)

---

### TC-ADMIN-008: Admin User Token Management

Prerequisite: On `/admin` as admin

Navigate to `/admin`

1. Locate a user in the list
2. Click the coins icon (Manage tokens)

Validate that:
- Token modal opens showing user's name
- Current token/credit information is displayed
- Modal can be closed

---

## Section 7: Profile & Account Settings

### TC-ACCOUNT-001: Update Display Name

Prerequisite: Logged in

Navigate to `/account`

1. Locate "Name" field
2. Clear and enter new name: "Updated Name"
3. Click "Save Changes"

Validate that:
- Success toast appears "Account settings saved"
- Dashboard header shows new name
- Profile reflects the change

---

### TC-ACCOUNT-002: Update Timezone

Prerequisite: Logged in

Navigate to `/account`

1. Click timezone dropdown
2. Select a different timezone (e.g., "Pacific Time (PT)")
3. Click "Save Changes"

Validate that:
- Success toast appears
- Timezone is saved
- Persists after page refresh

---

### TC-ACCOUNT-003: View AI Credits (Pro User)

Prerequisite: Logged in as `peter@pro.com` (Pro user)

Navigate to `/account/profile`

1. Locate "AI Credits" section

Validate that:
- Credits display shows remaining credits
- Progress bar indicates usage
- Rollover information is displayed
- Reset date is shown

---

## Section 8: AI Features (Pro Only)

### TC-AI-001: Claire Chat - Send Message

Prerequisite: Logged in as `peter@pro.com`, on partner detail

Navigate to `/partner/{id}` (Conversation tab)

1. Enter context: "We had a disagreement yesterday"
2. Enter intent: "I want to apologize"
3. Select tone: "Sincere"
4. Type message in chat: "Help me write an apology"
5. Submit message

Validate that:
- Message appears in chat
- Loading indicator shows while AI responds
- AI response appears in chat
- Credits are deducted (check credits display if visible)

---

### TC-AI-002: Claire Chat - Clear Fields

Prerequisite: Context and intent fields have content

Navigate to `/partner/{id}` (Conversation tab)

1. Click "Clear fields" link
2. Confirm in dialog

Validate that:
- Context textarea is cleared
- Intent textarea is cleared
- Chat history remains intact
- Toast confirms "Fields cleared"

---

### TC-AI-003: Activity Suggestion (if applicable)

Prerequisite: Logged in as Pro user, on dashboard

Navigate to `/dashboard`

1. Locate activity suggestion widget (if present)
2. Click to get AI suggestion

Validate that:
- AI generates activity suggestion
- Suggestion is relevant to cherished people
- Credits are consumed

---

## Section 9: Blog CMS (Admin)

### TC-BLOG-001: Access Blog Admin Dashboard

Prerequisite: Logged in as `alec@admin.com` (Admin)

Navigate to `/blog/admin`

Validate that:
- Blog admin dashboard loads
- Stats cards show: Total Posts, Published, Drafts, Scheduled, Categories, Tags, Media Files
- Quick Actions section is visible

---

### TC-BLOG-002: Create Blog Category

Prerequisite: On blog admin

Navigate to `/blog/admin/categories`

1. Click "Add Category" or similar button
2. Enter name: "Test Category"
3. Enter slug: "test-category"
4. Enter description: "A test category for E2E testing"
5. Click Save

Validate that:
- Success message appears
- Category appears in the list
- Category is accessible at `/blog/category/test-category`

---

### TC-BLOG-003: Create Blog Tag

Prerequisite: On blog admin

Navigate to `/blog/admin/tags`

1. Click "Add Tag" or similar button
2. Enter name: "Test Tag"
3. Enter slug: "test-tag"
4. Click Save

Validate that:
- Success message appears
- Tag appears in the list

---

### TC-BLOG-004: Create Blog Post (Draft)

Prerequisite: Category exists

Navigate to `/blog/admin/posts/new`

1. Enter title: "Test Blog Post"
2. Enter slug: "test-blog-post"
3. Enter content: "This is test content for E2E testing."
4. Enter excerpt: "Test excerpt"
5. Select category: "Test Category"
6. Add tag: "Test Tag"
7. Set status to "Draft"
8. Click Save

Validate that:
- Success message appears
- Post appears in posts list with "Draft" badge
- Post is NOT visible on public `/blog` page

---

### TC-BLOG-005: Publish Blog Post

Prerequisite: Draft post exists

Navigate to `/blog/admin/posts`

1. Click on "Test Blog Post" to edit
2. Change status from "Draft" to "Published"
3. Click Save

Validate that:
- Post status changes to "Published"
- Post is now visible on public `/blog` page
- Post is accessible at `/blog/test-blog-post`

---

### TC-BLOG-006: Verify Blog Post SEO

Prerequisite: Published post exists

Navigate to `/blog/test-blog-post`

1. Inspect page source or use browser dev tools

Validate that:
- `<title>` contains post title and site name
- `<meta name="description">` contains excerpt
- Open Graph tags (`og:title`, `og:description`, `og:image`) are present
- Twitter Card tags are present
- JSON-LD structured data is in the page

---

### TC-BLOG-007: Verify RSS Feed

Navigate to `/functions/v1/rss-feed`

Validate that:
- XML content is returned with `Content-Type: application/rss+xml`
- RSS 2.0 structure is valid
- Published posts appear as `<item>` elements
- Feed includes title, link, description, pubDate

---

### TC-BLOG-008: Delete Blog Post

Prerequisite: Test post exists

Navigate to `/blog/admin/posts`

1. Locate "Test Blog Post"
2. Click delete button
3. Confirm deletion

Validate that:
- Post is removed from list
- Post is no longer accessible on public blog
- Category/tag post counts update

---

## Section 10: Public Blog

### TC-PUBLIC-BLOG-001: View Blog List

Navigate to `/blog`

Validate that:
- Published posts are displayed
- Post cards show title, excerpt, date, categories
- Sidebar shows categories and tags
- RSS autodiscovery link is in page head

---

### TC-PUBLIC-BLOG-002: View Single Blog Post

Prerequisite: Published post exists

Navigate to `/blog/{slug}`

Validate that:
- Full post content is displayed
- Author information is shown (if available)
- Categories and tags are displayed
- Related posts or sidebar is visible

---

### TC-PUBLIC-BLOG-003: Filter by Category

Prerequisite: Category with posts exists

Navigate to `/blog`

1. Click on a category in the sidebar

Validate that:
- URL changes to `/blog/category/{slug}`
- Only posts in that category are displayed
- Category name is shown in page title/header

---

### TC-PUBLIC-BLOG-004: Filter by Tag

Prerequisite: Tag with posts exists

Navigate to `/blog`

1. Click on a tag

Validate that:
- URL changes to `/blog/tag/{slug}`
- Only posts with that tag are displayed

---

## Section 11: API Endpoints (Blog API)

### TC-API-001: List Published Posts

Make GET request to `/functions/v1/blog-api/posts`

Validate that:
- Response is JSON
- `posts` array contains only published posts
- `pagination` object includes total, limit, offset
- Each post includes: id, title, slug, excerpt, published_at, author, categories, tags

---

### TC-API-002: Get Single Post by Slug

Make GET request to `/functions/v1/blog-api/posts/{slug}`

Validate that:
- Response is JSON
- Post object includes full content
- Related data (author, categories, tags) is included
- 404 returned for non-existent or draft posts

---

### TC-API-003: List Categories with Post Counts

Make GET request to `/functions/v1/blog-api/categories`

Validate that:
- Response is JSON array of categories
- Each category includes post_count
- Proper caching headers are set

---

### TC-API-004: List Tags with Post Counts

Make GET request to `/functions/v1/blog-api/tags`

Validate that:
- Response is JSON array of tags
- Each tag includes post_count

---

## Section 12: Cleanup

### TC-CLEANUP-001: Delete Test Partner

Prerequisite: Test partner exists

Navigate to `/partner/{id}`

1. Click "Delete" button
2. Confirm permanent deletion

Validate that:
- Partner is removed
- All associated data (likes, dislikes, events) is deleted

---

### TC-CLEANUP-002: Delete Test Blog Content

Prerequisite: Test blog posts/categories/tags exist

Navigate to `/blog/admin`

1. Delete test posts
2. Delete test categories
3. Delete test tags

Validate that:
- All test content is removed
- Public blog shows no test content

---

### TC-CLEANUP-003: Delete Test User Account

> **Warning**: Only perform if the test user was created during testing

Prerequisite: Admin logged in

Navigate to `/admin`

1. Search for test user
2. Delete the user account

Validate that:
- User is removed from system
- User cannot log in

---

## Additional Edge Cases

### TC-EDGE-001: Session Timeout Handling

1. Log in as any user
2. Wait for session to approach expiry (or manually invalidate)
3. Attempt an authenticated action

Validate that:
- Session is refreshed transparently, OR
- User is redirected to `/auth` with appropriate message
- No data loss occurs

---

### TC-EDGE-002: Mobile Responsive - Dashboard

1. Set viewport to mobile size (390x844)
2. Navigate to `/dashboard`

Validate that:
- Layout adapts to mobile viewport
- Partner list is scrollable
- All buttons are tappable
- Navigation menu collapses appropriately

---

### TC-EDGE-003: Mobile Responsive - Partner Detail

1. Set viewport to mobile size
2. Navigate to `/partner/{id}`

Validate that:
- Tabs are accessible
- Forms are usable on mobile
- Claire chat (if Pro) is functional

---

## Notes

- **Test Data Isolation**: Always clean up test data after test runs
- **Stripe Testing**: Use Stripe test mode and test card numbers
- **Email Verification**: May need to be disabled in dev/staging for faster testing
- **AI Credits**: Tests consuming AI credits should be run sparingly
- **Admin Actions**: Be careful with admin delete operations - verify target before confirming
