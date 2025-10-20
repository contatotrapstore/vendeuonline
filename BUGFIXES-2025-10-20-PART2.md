# 🐛 Bug Fixes - Part 2 (October 20, 2025)

## 📋 Issues Reported by User (Second Round)

Based on user feedback with screenshots, the following issues were identified and fixed:

### 1. **Admin Plans - toUpperCase Error (AINDA PERSISTIA)**
- **Issue**: Error "Cannot read properties of undefined (reading 'toUpperCase')" still appeared
- **Root Cause**: Select element didn't have default value for billingPeriod
- **Fix**: Added default value to select element `value={plan.billingPeriod || 'monthly'}`
- **File**: [src/app/admin/plans/page.tsx](src/app/admin/plans/page.tsx#L316)

### 2. **Admin Users - Edit Not Saving City/State/Phone (CRÍTICO)**
- **Issue**: User feedback: "em editar, cidades e dados do usuário, não está salvando"
- **Root Cause**: UserFormModal wasn't pre-filling phone, city, state fields from user object
- **Fix**: Updated defaultValues and reset() to load from user object
- **Files Modified**:
  - [src/components/admin/UserFormModal.tsx](src/components/admin/UserFormModal.tsx#L61-L70) - Lines 65, 68-69
  - [src/components/admin/UserFormModal.tsx](src/components/admin/UserFormModal.tsx#L84-L93) - Lines 88, 91-92

**Before:**
```typescript
defaultValues: {
  phone: "",
  city: "",
  state: "",
}
```

**After:**
```typescript
defaultValues: {
  phone: user?.phone || "",
  city: user?.city || "",
  state: user?.state || "",
}
```

### 3. **Admin Users - Not Showing Current Plan (CRÍTICO)**
- **Issue**: User feedback: "Não mostra qual plano ele é, e em edita, não consigo mudar o plano"
- **Root Cause**: Plan selector existed but wasn't pre-filling current plan value
- **Fix**: Already fixed in Part 1, just needed to ensure user.subscription.planId was loaded
- **File**: [src/components/admin/UserFormModal.tsx](src/components/admin/UserFormModal.tsx#L90)
- **Status**: ✅ Already working (planId loaded from user.subscription.planId)

### 4. **Admin Users - Plan Changes Not Saving (CRÍTICO)**
- **Issue**: Plan selector existed but backend didn't save planId changes
- **Root Cause**: Backend PUT /users/:id didn't handle planId field
- **Fix**: Added planId handling to create/update Subscription for sellers
- **File**: [server/routes/admin.js](server/routes/admin.js#L1352)
- **Lines**: 1352 (add planId to destructure), 1417-1467 (subscription logic)

**Implementation:**
```javascript
// Extract planId from request
const { planId } = req.body;

// After updating user, handle subscription for sellers
if ((updateData.type === "SELLER" || user.type === "SELLER") && planId) {
  // Check if plan exists
  const { data: plan } = await supabase
    .from("plans")
    .select("id, name, price")
    .eq("id", planId)
    .maybeSingle();

  // Check if subscription exists
  const { data: existingSub } = await supabase
    .from("Subscription")
    .select("id")
    .eq("userId", id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (existingSub) {
    // Update existing subscription
    await supabase.from("Subscription").update({
      planId: planId,
      updatedAt: new Date().toISOString(),
    }).eq("id", existingSub.id);
  } else {
    // Create new subscription (1 month duration)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    await supabase.from("Subscription").insert({
      userId: id,
      planId: planId,
      status: "ACTIVE",
      startDate: new Date().toISOString(),
      endDate: endDate.toISOString(),
      autoRenew: true,
    });
  }
}
```

### 5. **Seller Plans - Upgrade Error (CRÍTICO)**
- **Issue**: User feedback: "quando clica Fazer Upgrade, aparece este novo erro"
- **Root Cause**: Subscription queries/inserts used `sellerId` instead of `userId`
- **Fix**: Changed all Subscription operations to use `userId` (primary relationship)
- **File**: [server/routes/sellers.js](server/routes/sellers.js#L415-L450)

**Before:**
```javascript
// Wrong - used sellerId
.eq("sellerId", seller.id)

.insert({ sellerId: seller.id, ... })
```

**After:**
```javascript
// Correct - use userId
.eq("userId", userId)

.insert({
  userId: userId,
  sellerId: seller.id,  // Optional secondary reference
  ...
})
```

## 📊 Summary of Fixes

### Files Modified:
1. ✅ [src/app/admin/plans/page.tsx](src/app/admin/plans/page.tsx#L316) - Added default billingPeriod value to select
2. ✅ [src/components/admin/UserFormModal.tsx](src/components/admin/UserFormModal.tsx#L61-L93) - Pre-fill phone/city/state from user object
3. ✅ [server/routes/admin.js](server/routes/admin.js#L1352-L1467) - Handle planId updates for sellers
4. ✅ [server/routes/sellers.js](server/routes/sellers.js#L415-L450) - Fix subscription userId relationship
5. ✅ [server/routes/upload.js](server/routes/upload.js#L108-L132) - Use bucket/folder from request body

### Testing Recommendations:

#### 1. Admin Plans Page
- [ ] Open Admin Plans page
- [ ] Click "Editar" on any plan
- [ ] Verify billingPeriod dropdown shows current value (not blank)
- [ ] Change billingPeriod and save
- [ ] Verify no toUpperCase error

#### 2. Admin Users - Edit User
- [ ] Open Admin Users page
- [ ] Click "Editar" on a user with phone/city/state data
- [ ] Verify all fields are pre-filled correctly:
  - [ ] Name
  - [ ] Email
  - [ ] Phone
  - [ ] City
  - [ ] State
- [ ] Change any field and save
- [ ] Verify changes persist after page reload

#### 3. Admin Users - Change Seller Plan
- [ ] Open Admin Users page
- [ ] Click "Editar" on a SELLER user
- [ ] Verify "Plano de Assinatura" dropdown appears
- [ ] Verify current plan is selected (if user has subscription)
- [ ] Change plan and save
- [ ] Verify new plan appears in user table "Plano" column
- [ ] Check database: Subscription table should have new planId

#### 4. Seller Plans - Upgrade
- [ ] Login as seller
- [ ] Go to /seller/plans
- [ ] Click "Fazer Upgrade" on a higher-tier plan
- [ ] Verify success message (not error)
- [ ] Verify "Plano Atual" updates to new plan
- [ ] Check database: Subscription table should have new record with userId

#### 5. Product Image Upload
- [ ] Login as seller
- [ ] Go to product creation/edit page
- [ ] Try uploading an image (< 5MB)
- [ ] Verify upload completes (no "Enviando..." stuck)
- [ ] Check browser console for any errors
- [ ] Verify image appears in product preview
- [ ] Check Supabase Storage bucket "products" has the image

## 🔍 Database Schema Reference

### Subscription Table Structure:
```prisma
model Subscription {
  id              String             @id @default(cuid())
  userId          String             // PRIMARY relationship to User
  user            User               @relation(fields: [userId], references: [id])
  sellerId        String?            // OPTIONAL secondary reference to Seller
  seller          Seller?            @relation(fields: [sellerId], references: [id])
  planId          String
  plan            Plan               @relation(fields: [planId], references: [id])
  status          SubscriptionStatus @default(PENDING)
  startDate       DateTime?
  endDate         DateTime?
  autoRenew       Boolean            @default(false)
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
}
```

**Key Insight**: Always query/insert Subscription using `userId` (not `sellerId`). The `sellerId` is optional and should be included as secondary reference when available.

### 6. **Image Upload Stuck (FIXED)**
- **Issue**: Product images stuck on "Enviando foto.jpg..."
- **Root Cause**: Backend upload endpoint didn't use `bucket` parameter from frontend request
- **Fix**: Updated upload.js to extract and use `bucket` and `folder` from request body
- **File**: [server/routes/upload.js](server/routes/upload.js#L108-L132)

**Before:**
```javascript
const { type = "general" } = req.body;
let bucket = "stores"; // Hardcoded, ignoring request
let folder = "images";
```

**After:**
```javascript
const { bucket: requestBucket, folder: requestFolder, type = "general" } = req.body;
let bucket = requestBucket || "stores"; // Use request bucket if provided
let folder = requestFolder || "images";

// Fallback to type-based logic if no bucket specified
if (!requestBucket) {
  if (type === "product") {
    bucket = "products";
    folder = "products";
  }
}
```

**Why This Matters**: ImageUploader was sending `bucket: "products"` but backend was ignoring it and uploading to "stores" bucket, which could cause permission issues or missing bucket errors.

## ⚠️ Potential Remaining Issues

### Image Upload - Bucket Configuration
- **Possible Issue**: Supabase Storage buckets may not exist
- **Test Steps**:
  1. Run verification script: `node scripts/check-supabase-storage.js`
  2. Check browser console for errors during upload
  3. Verify SUPABASE_SERVICE_ROLE_KEY is correct in .env
  4. Test with smaller image files first (< 1MB)

### 7. Tracking Pixel Preview (PARTIALLY FIXED)
- **Status**: PUT endpoint added in Part 1, but may need frontend testing
- **Next Steps**: Test editing pixel IDs and verify preview updates

## 📁 Related Documentation
- [BUGFIXES-2025-10-20.md](BUGFIXES-2025-10-20.md) - Part 1 fixes
- [docs/api/API_REFERENCE.md](docs/api/API_REFERENCE.md) - API documentation

---

**Generated**: October 20, 2025
**Last Updated**: October 20, 2025
