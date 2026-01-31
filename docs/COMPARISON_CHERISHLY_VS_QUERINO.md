# AI Credit System: Cherishly vs Querino Comparison

This document compares the two different architectural approaches for handling user plans and AI credit systems.

---

## The Core Difference: User Role Architecture

### Cherishly Approach: Dedicated `user_roles` Table

```
┌────────────────┐     ┌────────────────┐
│  auth.users    │     │   user_roles   │
│  (Supabase)    │◄────│  user_id       │
└────────────────┘     │  role          │  ← enum: free | pro | pro_gift | admin
                       │  created_at    │
                       └────────────────┘
                              │
                    RPC: get_user_role(user_id)
                    RPC: is_admin(user_id)
                    RPC: has_role(role, user_id)
```

**Key Characteristics:**
- Roles stored in dedicated `user_roles` table with `app_role` enum
- Database functions (`get_user_role`, `is_admin`, `has_role`) encapsulate logic
- Plan types (`pro`, `pro_gift`) are distinct from admin role
- One user can technically have multiple role rows (though typically one)

### Querino Approach: Columns on `profiles` Table

```
┌────────────────┐     ┌──────────────────────┐
│  auth.users    │     │      profiles        │
│  (Supabase)    │◄────│  id (= user_id)      │
└────────────────┘     │  plan_type           │  ← 'free' | 'premium'
                       │  role                │  ← 'user' | 'admin'
                       │  display_name, etc.  │
                       └──────────────────────┘
                              │
                    Direct query: profiles.role = 'admin'
                    Direct query: profiles.plan_type = 'premium'
```

**Key Characteristics:**
- `plan_type` and `role` are columns directly on `profiles` table
- No separate table or RPC functions needed
- Clear separation: `plan_type` for billing tier, `role` for permissions
- Single source of truth per user

---

## Side-by-Side Comparison

| Aspect | Cherishly | Querino |
|--------|-----------|---------|
| **Plan Storage** | `user_roles.role` enum | `profiles.plan_type` column |
| **Admin Check** | `user_roles.role = 'admin'` via RPC | `profiles.role = 'admin'` direct |
| **Role Types** | `free \| pro \| pro_gift \| admin` | plan: `free \| premium`, role: `user \| admin` |
| **Query Pattern** | RPC: `get_user_role(user_id)` | Direct: `profiles.plan_type` |
| **Multiple Roles** | Possible (multiple rows) | Not possible (single row) |
| **Plan vs Admin** | Combined in one enum | Separated into two columns |
| **Hook Complexity** | `useUserRole` calls RPC with timeout | `useUserRole` queries profiles directly |
| **Edge Function Check** | Query `user_roles` table | Query `profiles.plan_type` |

---

## How Each Affects the AI Credit System

### Cherishly's ensure-token-allowance

```typescript
// Get user's role to determine plan type
const { data: roleData } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", userId)
  .order("role")  // Get admin first if multiple roles
  .limit(1)
  .maybeSingle();

const userRole = roleData?.role || "free";
const isPremium = userRole === "pro" || userRole === "pro_gift" || userRole === "admin";
```

### Querino's ensure-token-allowance

```typescript
// Get user's plan type directly from profiles
const { data: profile } = await supabase
  .from("profiles")
  .select("plan_type")
  .eq("id", userId)
  .single();

const isPremium = profile?.plan_type === "premium";
```

---

## Advantages of Each Approach

### Cherishly Advantages

| ✅ Advantage | Explanation |
|-------------|-------------|
| **Granular Role Types** | Distinguishes between `pro` (paid), `pro_gift` (gifted), and `admin` |
| **Multiple Roles Support** | User could theoretically have both `pro` and `admin` |
| **Encapsulated Logic** | RPC functions (`is_admin`, `has_role`) centralize checks |
| **Easier Role History** | Can track when roles were added via `created_at` |
| **RLS Reusability** | RPC functions can be used directly in RLS policies |

### Querino Advantages

| ✅ Advantage | Explanation |
|-------------|-------------|
| **Simpler Schema** | Two columns vs entire separate table |
| **Fewer Queries** | Direct column access vs RPC call |
| **Clear Separation** | `plan_type` (billing) vs `role` (permissions) are distinct |
| **No RPC Overhead** | Avoids function call latency |
| **Easier Onboarding** | New developers understand immediately |
| **Natural Join** | Profile data and plan in one query |

---

## Pitfalls to Watch For

### Cherishly Pitfalls

| ⚠️ Pitfall | Risk |
|-----------|------|
| **Role Confusion** | Is `admin` a plan or a permission? Both? |
| **Multiple Roles Ambiguity** | Which role takes precedence if user has multiple? |
| **RPC Timeout** | Network latency adds to role checks (8s timeout in code) |
| **Enum Lock-in** | Adding new roles requires database migration |
| **Extra Table Overhead** | More complex joins, more RLS policies to maintain |

### Querino Pitfalls

| ⚠️ Pitfall | Risk |
|-----------|------|
| **No Gift Tier** | Can't distinguish paid vs gifted premium |
| **Admin Is Not Premium** | Must check both `role` AND `plan_type` for admin AI access |
| **Column Bloat** | Adding more tiers means more columns or switching to enum |
| **No Role History** | Can't easily track when plan changed |
| **Tight Coupling** | Profile table becomes responsible for too many concerns |

---

## Hybrid Approach (Recommended)

For future SaaS apps, consider a **hybrid approach** that combines the best of both:

```sql
-- profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  display_name TEXT,
  email TEXT,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'premium')),
  plan_source TEXT CHECK (plan_source IN ('subscription', 'gift', 'trial')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Separate roles table (for RBAC - multiple roles possible)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'moderator', 'support')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Helper function for AI credit eligibility
CREATE FUNCTION is_premium(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND plan_type = 'premium'
  ) OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = $1 
    AND role = 'admin'
  );
$$ LANGUAGE SQL STABLE;
```

### Why This Works

| Aspect | How It's Handled |
|--------|------------------|
| **Plan Tier** | `profiles.plan_type` = `free` or `premium` |
| **Plan Origin** | `profiles.plan_source` = `subscription`, `gift`, or `trial` |
| **Permissions** | `user_roles.role` = `admin`, `moderator`, etc. |
| **AI Credits** | Premium OR admin gets credits via `is_premium()` |
| **History** | Both tables have `created_at` for audit |
| **Flexibility** | Admins auto-get premium access without storing duplicate data |

---

## Final Recommendation

### For New SaaS Projects

| If Your App... | Use... | Reason |
|----------------|--------|--------|
| Has simple free/paid tiers | **Querino** (profiles columns) | Simpler, faster, less overhead |
| Needs gift/trial/promo tracking | **Hybrid** (profiles + source) | Track origin without role table |
| Has multiple permission levels | **Cherishly** (user_roles) | Supports moderators, support staff, etc. |
| Will integrate with Stripe | **Hybrid** | Map subscription status to `plan_type`, origin to `plan_source` |

### Decision Matrix

```
                    Simple Billing          Complex Permissions
                          │                        │
                          ▼                        ▼
                    ┌──────────┐             ┌──────────┐
                    │ Querino  │             │Cherishly │
                    │ (2 cols) │             │ (table)  │
                    └──────────┘             └──────────┘
                          │                        │
                          └──────────┬─────────────┘
                                     │
                                     ▼
                              ┌────────────┐
                              │  HYBRID    │
                              │ profiles + │
                              │ user_roles │
                              └────────────┘
```

### TL;DR

- **Cherishly** is better for apps with complex permission hierarchies (admin, moderator, support) and needs to track HOW someone got premium (paid vs gift).

- **Querino** is better for simple SaaS with just free/premium and no need for granular permissions beyond admin.

- **Hybrid** is best for production apps that need billing tier separation from RBAC and want future flexibility.

---

## Migration Path

If you want to migrate Cherishly to the hybrid approach:

1. Add `plan_type` and `plan_source` columns to `profiles`
2. Migrate data: `pro` → `plan_type='premium', plan_source='subscription'`
3. Migrate data: `pro_gift` → `plan_type='premium', plan_source='gift'`
4. Keep `admin` in `user_roles` for RBAC
5. Update `ensure-token-allowance` to check `profiles.plan_type` OR admin role
6. Remove `pro`/`pro_gift` from `user_roles` enum (keep just `admin`, future roles)
