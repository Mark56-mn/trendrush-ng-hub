# WAP Container Deployment Checklist

## Pre-Deployment (Local Testing)

### Code Quality
- [x] TypeScript compilation passes (0 errors)
- [x] All dependencies installed (`cheerio`, `csv-parse`)
- [x] Build succeeds without errors
- [x] No console warnings or errors

### Feature Testing (Local Dev)
- [ ] Admin page loads without errors
- [ ] WAP Container tab visible in admin menu
- [ ] Single import tab renders correctly
- [ ] Batch import tab renders correctly
- [ ] Try importing a test product URL
- [ ] Verify product appears in imported list

### Database
- [ ] Supabase project is active and accessible
- [ ] Migration SQL is correct (check syntax)
- [ ] No conflicts with existing tables

## Deployment Steps

### Step 1: Database Migration

**Option A: Via Supabase Dashboard (Recommended)**
```
1. Open Supabase dashboard → Select your project
2. Navigate to SQL Editor
3. Click "+ New query"
4. Copy entire contents from:
   supabase/migrations/20260622120000_imported-products-wap-container.sql
5. Paste into SQL editor
6. Review SQL carefully
7. Click "Run" button
8. Wait for success message
```

**Option B: Via Supabase CLI**
```bash
supabase migration up
```

**Verify Migration Success:**
- [ ] No error messages
- [ ] Table `imported_products` appears in database
- [ ] Columns match schema specification
- [ ] Indexes are created
- [ ] RLS policies are enabled

### Step 2: Code Commit & Push

```bash
# Stage all changes
git add .

# Create descriptive commit
git commit -m "feat: add WAP Container product import feature

- Add product scraper for AliExpress, Temu, Amazon, generic URLs
- Create single and batch product import functionality
- Add WAP Container admin interface with editing
- Set up imported_products database table with RLS
- Support for CSV and URL list batch imports"

# Push to main branch
git push origin main
```

### Step 3: Vercel Deployment

**Option A: Automatic (via Git Integration)**
- [ ] Commit pushed to main branch
- [ ] GitHub webhook triggers Vercel build
- [ ] Wait for deployment to complete (~3-5 min)
- [ ] Check deployment status in Vercel dashboard
- [ ] Verify "✓ Ready" status

**Option B: Manual via CLI**
```bash
vercel --prod
```

**Verify Deployment:**
- [ ] Build completed successfully
- [ ] No build errors or warnings
- [ ] Deployment status shows "Ready"
- [ ] Preview URL is accessible
- [ ] Production URL is working

## Post-Deployment Verification

### Access & Navigation
- [ ] Application loads without errors
- [ ] Admin panel accessible (requires login)
- [ ] WAP Container tab appears in admin menu
- [ ] Tab is clickable and renders component

### Single Import Test
- [ ] Navigate to "Single Import" tab
- [ ] Paste test product URL
- [ ] Click "Import Product"
- [ ] Wait for completion
- [ ] No errors in browser console
- [ ] Product appears in imported list below
- [ ] Product data (name, price, image) visible

### Batch Import Test
- [ ] Navigate to "Batch Import" tab
- [ ] Toggle between "URL List" and "CSV Format"
- [ ] Paste multiple test URLs (3-5)
- [ ] Click "Import Batch"
- [ ] Results show success/failure for each
- [ ] Successful products appear in imported list

### Product Management
- [ ] Click "Edit" on an imported product
- [ ] Modify product name, description, price
- [ ] Click "Save"
- [ ] Changes persisted in list
- [ ] Click "Delete" on a product
- [ ] Confirm deletion dialog appears
- [ ] Product removed from list

### Database Verification
- [ ] Supabase dashboard shows data in `imported_products` table
- [ ] Only current user's products are visible
- [ ] Data structure matches schema
- [ ] Timestamps are correct
- [ ] User IDs are properly set

### Security Verification
- [ ] Non-admin users cannot access WAP Container
- [ ] Logged-out users redirected to login
- [ ] Users only see their own imported products
- [ ] Delete works only on own products
- [ ] Edit works only on own products

## Performance Checks

- [ ] Single import completes in <10 seconds
- [ ] Batch import processes multiple URLs
- [ ] No request timeouts (30 sec Vercel limit)
- [ ] Page loads quickly after import
- [ ] No memory leaks or hanging processes

## Error Handling

### Test Error Cases
- [ ] Invalid URL format → Shows error message
- [ ] Already imported URL → Shows duplicate error
- [ ] Unreachable website → Shows error message
- [ ] Website without detectable product → Shows error
- [ ] Network timeout → Shows timeout error
- [ ] Batch import with mixed results → Shows per-URL status

## Rollback Plan

If issues occur:

**Rollback Vercel Deployment:**
```bash
# Redeploy previous version
vercel rollback

# Or revert commits
git revert HEAD
git push origin main
```

**Rollback Database:**
```sql
-- Drop the table if needed
DROP TABLE IF EXISTS imported_products CASCADE;
```

**Verify Rollback:**
- [ ] Previous version deployed
- [ ] WAP Container no longer visible
- [ ] No database errors
- [ ] Admin panel works normally

## Monitor After Deployment

### For First 24 Hours
- [ ] Check error logs in Vercel dashboard
- [ ] Monitor Supabase database usage
- [ ] Watch for user-reported issues
- [ ] Check browser console for errors

### Ongoing
- [ ] Weekly check of import success rate
- [ ] Monthly database backup
- [ ] Track number of imported products
- [ ] Monitor scraper performance
- [ ] Review error logs for patterns

## Success Criteria

✅ Deployment is successful when:
1. TypeScript compiles with 0 errors
2. Vercel build completes successfully
3. WAP Container tab appears in admin
4. Single product import works end-to-end
5. Batch import processes multiple URLs
6. Product data persists in database
7. User isolation via RLS is working
8. No errors in browser console
9. No errors in Vercel logs
10. Users cannot access without admin role

## Timeline Estimate

| Step | Time |
|------|------|
| Database migration | 2-5 min |
| Code commit | 1 min |
| Vercel build | 3-5 min |
| Deployment | 1-2 min |
| Post-deployment tests | 10-15 min |
| **Total** | **~20-30 min** |

## Support Contacts

If you encounter issues:

1. **Vercel Issues** → Check Vercel dashboard logs
2. **Database Issues** → Check Supabase dashboard
3. **Code Issues** → Review console errors
4. **Deployment Issues** → Check Git integration settings

## Additional Resources

- Full documentation: `WAP_CONTAINER_README.md`
- Quick start guide: `WAP_QUICK_START.md`
- Migration SQL: `supabase/migrations/20260622120000_imported-products-wap-container.sql`

---

**Created:** June 22, 2026
**Version:** 1.0
**Status:** Ready for Production Deployment
