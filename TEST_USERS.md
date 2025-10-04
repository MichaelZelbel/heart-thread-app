# Test Users Setup Guide

This document describes how to set up test users with different roles (Free, Pro, Admin) for testing Cherishly's feature access controls.

## Test User Credentials

| Role  | Name  | Email            | Password   |
| ----- | ----- | ---------------- | ---------- |
| Free  | Fred  | `fred@free.com`  | `Dell@123` |
| Pro   | Peter | `peter@pro.com`  | `Dell@123` |
| Admin | Alec  | `alec@admin.com` | `Dell@123` |

## Setup Instructions

### Step 1: Create User Accounts

1. Navigate to `/auth` page
2. Sign up each test user with their credentials above
3. Make sure to use the correct email and password for each user

### Step 2: Assign Roles

After creating the users, run the following SQL commands in your Supabase SQL Editor or via the backend dashboard:

```sql
-- Assign Free role to Fred
SELECT public.assign_role_by_email('fred@free.com', 'free');

-- Assign Pro role to Peter
SELECT public.assign_role_by_email('peter@pro.com', 'pro');

-- Assign Admin role to Alec
SELECT public.assign_role_by_email('alec@admin.com', 'admin');
```

### Step 3: Verify Role Assignment

You can verify the roles were assigned correctly by running:

```sql
SELECT u.email, ur.role 
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email IN ('fred@free.com', 'peter@pro.com', 'alec@admin.com');
```

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
- Make sure email confirmation is disabled in Supabase Auth settings for easier testing
