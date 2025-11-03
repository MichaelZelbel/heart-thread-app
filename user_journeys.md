# Cherishly User Journeys

## 1. First Time User (Not Logged In)

### Landing & Onboarding
1. **Lands on Homepage** (`/`)
   - Sees hero section with Cherishly branding
   - Prominent "Cherish" button in hero
   - Explanation of how the app works below
   - Footer with links to Privacy Policy, Terms of Service, Cookies Policy

2. **Clicks "Cherish" Button**
   - Redirected to **Cherish Wizard** (`/partner-wizard`)
   - Multi-step guided form:
     - **Step 1**: Partner name & pronouns
     - **Step 2**: Relationship type
     - **Step 3**: Love Languages (5 heart ratings)
     - **Step 4**: Important dates (birthdate, anniversary)
     - **Step 5**: Likes & Dislikes
     - **Step 6**: Communication preferences
   - Can navigate back/forward through steps

3. **Completes Wizard**
   - Prompted to create account or continue without account
   - If **creates account**: Sign up form (email/password or Google sign-in)
   - If **continues anonymously**: Data stored locally (limited features)
   - Redirected to **Dashboard** (`/dashboard`)

---

## 2. New User (Just Signed Up)

### First Login Experience
1. **Lands on Dashboard** (`/dashboard`)
   - Sees their first partner card with avatar and name
   - **Claire Chat** panel (basic AI assistant)
   - **Activity Suggestions** section
   - **Upcoming Events** (empty initially)
   - **Recent Moments** section shows locked state with upgrade prompt
   - Top navigation: Dashboard | Profile | Archive | Account | Pricing

2. **First Partner Card**
   - Shows partner name, avatar, relationship type
   - "View Details" button
   - Click opens **Partner Detail** page (`/partner/:id`)

3. **Explores Partner Detail**
   - **Details Tab** (default): Shows all partner info from wizard
   - **Calendar Tab**: Empty state, can add events
   - **Moments Tab**: 🔒 **Locked** - Shows upgrade prompt for Pro
   - **Message Coach Tab**: 🔒 **Locked** - Shows upgrade prompt for Pro

---

## 3. Returning Free User

### Sign In
1. **Lands on Auth Page** (`/auth`)
   - Email/password or Google sign-in
   - Link to sign up if no account

2. **Redirected to Dashboard** (`/dashboard`)
   - Sees all partner cards
   - Claire Chat available (limited context/responses)
   - Activity Suggestions section (basic)
   - Upcoming Events calendar view
   - Recent Moments section: 🔒 **Locked** with upgrade prompt

### Common Actions
- **Add New Partner**: "Add Partner" button → Cherish Wizard flow
- **View Partner**: Click partner card → Partner Detail page
  - Can edit Details, manage Calendar
  - Moments tab: 🔒 Locked
  - Message Coach tab: 🔒 Locked
- **Request Activity Suggestion**: Click "Suggest Activity" → AI generates ideas
- **Archive Partner**: Settings menu on partner card → Moves to Archive page
- **View Profile**: Top nav → Self-profile page (`/profile`)
- **Account Settings**: Top nav → Account page (`/account`)
- **Upgrade**: Top nav Pricing or any 🔒 lock icon → Pricing page (`/pricing`)

---

## 4. Pro User (Paid Subscription)

### Sign In
1. **Lands on Auth Page** (`/auth`)
   - Email/password or Google sign-in

2. **Redirected to Dashboard** (`/dashboard`)
   - Sees all partner cards
   - **Claire Chat**: Full AI chat with enhanced context and personality
   - **Activity Suggestions**: Advanced AI-powered suggestions
   - **Upcoming Events**: Full calendar view
   - **Recent Moments**: ✅ **Unlocked** - Shows recent moments with images/notes

### Enhanced Actions
- **View Partner Detail** (`/partner/:id`)
  - **Details Tab**: Full editing capabilities
  - **Calendar Tab**: Full event management
  - **Moments Tab**: ✅ **Unlocked** - Create/view moments with photos, notes, ratings
  - **Message Coach Tab**: ✅ **Unlocked**
    - "Recent Conversation or Reflection" textarea (5000 char limit, tall)
    - "Message/Scenario to Draft" textarea (800 char limit)
    - Claire Chat panel (tall) for drafting assistance
    - Quick Tone buttons with icons (Loving ❤️, Calm 🌊, Playful ✨, Thoughtful 🧠, Assertive 🛡️)
    - "Get Coaching" button

- **Claire AI Chat**: Context-aware conversations about relationships
- **Activity Suggestions**: Personalized based on partner preferences, love languages, and past moments

---

## 5. Admin User

### Additional Access
1. **All Pro User features** (same sign-in flow)

2. **Admin Page** (`/admin`)
   - Navigate via top navigation (only visible to admin role)
   - **User Management**:
     - View all users in system
     - Delete user accounts
     - View user metadata (email, created date, etc.)
   - **System Analytics**:
     - Total users
     - Subscription stats
     - Usage metrics

---

## 6. Email Verification Flow

### Email/Password Sign-Up
1. **Sign Up** (`/auth`)
   - Enter email, password, confirm password
   - Submit form

2. **Redirected to Email Verification Pending** (`/email-verification-pending`)
   - Message: "Please check your email to verify your account"
   - Cannot access app until verified
   - "Resend Verification Email" button

3. **Click Verification Link in Email**
   - Opens verification URL
   - Auto-verified
   - Redirected to **Dashboard** (`/dashboard`)

---

## Common Navigation Flows

### From Any Page
- **Top Navigation** (logged in):
  - Logo (left) → Dashboard
  - Dashboard → `/dashboard`
  - Profile → `/profile` (self-profile)
  - Archive → `/archive` (archived partners)
  - Account → `/account` (settings, billing)
  - Pricing → `/pricing` (upgrade to Pro)
  - Sign Out → Logs out, returns to Home

- **Footer** (all pages):
  - Privacy Policy → `/privacy-policy`
  - Terms of Service → `/terms-of-service`
  - Cookies Policy → `/cookies-policy`

### Key Decision Points

#### Free vs. Pro Features
- **Free**: Basic Claire chat, activity suggestions, Details, Calendar
- **Pro**: Full Claire AI, Moments tab, Message Coach tab, advanced suggestions

#### Archive vs. Delete
- **Archive** (`/archive`): Soft delete, can restore partner
- **Delete**: Permanent deletion (confirmation required)

#### Claire AI Context
- Dashboard: General relationship advice
- Partner Detail: Partner-specific context (uses partner data)
- Message Coach: Drafting-specific assistance with tone control

---

## Summary

**Cherishly** is designed with a "cherish-first" approach:
1. New users start immediately with the Cherish Wizard
2. Dashboard provides quick access to all partners and AI assistance
3. Partner Detail is the hub for deep relationship management
4. Pro features (Moments, Message Coach) enhance the experience
5. Claire AI provides contextual support throughout the journey
