# Test Users Setup Guide

This document describes how to set up test users with different roles (Free, Pro, Admin) for testing Cherishly's feature access controls.

## Test Personas

| Role  | Name  | Description |
|-------|-------|-------------|
| Free  | Fred  | Free tier user with limited features |
| Pro   | Peter | Pro subscriber with full feature access |
| Admin | Alec  | Administrator with user management access |

> **Note**: Test credentials will be provided to testers separately and should not be stored in version control.

## Setup Instructions

### Step 1: Create User Accounts

1. Navigate to `/auth` page
2. Sign up each test user with their designated credentials
3. User accounts and credentials are managed outside of version control

### Step 2: Assign Roles

After creating the users, run the following SQL commands in Cloud View > Run SQL to assign roles:

```sql
-- Assign Free role to Fred
SELECT public.assign_role_by_email('<fred_email>', 'free');

-- Assign Pro role to Peter
SELECT public.assign_role_by_email('<peter_email>', 'pro');

-- Assign Admin role to Alec
SELECT public.assign_role_by_email('<alec_email>', 'admin');
```

### Step 3: Verify Role Assignment

You can verify the roles were assigned correctly by checking the user_roles table.

## Feature Access by Role

### Free User (Fred)
- ✅ Create and save Cherished people
- ✅ Add basic details, likes, and dislikes
- ✅ View love calendar
- ✅ Access from any device
- 🔒 See Pro features as teasers with upgrade prompts

### Pro User (Peter)
- ✅ All Free features
- ✅ AI chats with Claire
- ✅ Email notifications for special dates
- ✅ Full "Moments Log"
- ✅ Full access to advanced details (Relationships, Favorites, Friends & Family)

### Admin User (Alec)
- ✅ All Pro features
- ✅ Full administrative access

## Notes

- All new users automatically start with the "Free" role
- The `assign_role_by_email` function will replace any existing role
- Make sure email confirmation is disabled in auth settings for easier testing
