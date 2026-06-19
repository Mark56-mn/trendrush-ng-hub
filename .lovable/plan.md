
## TrendRush NG — Build Plan

### Stack
TanStack Start + React + Tailwind v4 + Lovable Cloud (Supabase) for DB, auth, storage. Dark theme, neon green (#39FF14) + orange (#FF6A00) accents, bold display type (Space Grotesk) + Inter body.

### Brand & Design
- Black bg (`#0A0A0A`), neon-green primary, orange secondary, subtle glow shadows.
- Mobile-first; sticky bottom CTA bar on product pages.
- Floating WhatsApp button on every page → `https://wa.link/...` (admin-configurable), pre-fill: "Hello, I want to ask about this product".

### Pages / Routes
- `/` — Homepage: hero (logo + slogan), Trending grid, PlugMarket section, HotPick NG section.
- `/category/$slug` — PlugMarket and HotPick NG listings.
- `/product/$id` — images carousel, price, description, Buy Now → `/checkout/$id`, WhatsApp button.
- `/checkout/$orderId` — bank transfer instructions, account number/name/bank from settings, unique amount (base + random kobo suffix), "I've paid" button.
- `/auth` — optional sign-in/up (managed Lovable layout).
- `/_authenticated/orders` — signed-in user's orders + status.
- `/orders/$id` — guest order tracking via order ID + phone.
- `/_authenticated/_admin/*` — admin panel:
  - `/admin/products` (CRUD + image upload)
  - `/admin/orders` (view, filter, manually mark paid)
  - `/admin/settings` (bank details, WhatsApp link, logo, banner)
- `/api/public/moniepoint-webhook` — signed webhook receiver.

### Checkout / Payment Flow
1. Buy Now → create `order` row with `status='pending'`, `amount = product.price + random(1..99) kobo` to make each payment amount unique. Stored in `orders.unique_amount`.
2. Show bank details + unique amount on checkout.
3. Moniepoint webhook posts payment notification → verify HMAC signature with `MONIEPOINT_WEBHOOK_SECRET` → match by amount (within ±10min window, status pending) → update `orders.status='paid'`, insert `payments` row.
4. Admin can also manually mark paid in `/admin/orders`.

### Backend (Lovable Cloud / Supabase)

Tables (all with grants + RLS):
- `profiles` (id→auth.users, full_name, phone, created_at)
- `app_role` enum (`admin`, `customer`) + `user_roles` table + `has_role()` SECURITY DEFINER fn. `tradebetter98@gmail.com` granted `admin` via seed.
- `categories` (id, slug, name) — seeded with `plugmarket`, `hotpick`.
- `products` (id, title, slug, description, price_naira, category_id, image_urls text[], is_trending bool, is_active bool, stock int, created_at)
- `orders` (id, user_id nullable, guest_name, guest_phone, guest_email, product_id, quantity, base_amount, unique_amount, status enum: pending|paid|cancelled, created_at, paid_at)
- `payments` (id, order_id, amount, reference, raw_payload jsonb, received_at)
- `site_settings` (singleton row: bank_name, account_number, account_name, whatsapp_link, logo_url, banner_url)

RLS:
- Products/categories/site_settings: public SELECT (anon).
- Products/site_settings writes: admin only.
- Orders: insert allowed anon (guest) + authenticated; SELECT own (user_id = auth.uid() OR via guest order-id lookup function); admin sees all.
- Payments/user_roles: admin only.

Storage buckets (public): `product-images`, `branding`.

### Server Functions (`src/lib/*.functions.ts`)
- `listProducts`, `getProduct`, `listByCategory`, `getSettings` (publishable-key client, anon-safe).
- `createOrder` (anon allowed; computes unique amount).
- `getMyOrders` (requireSupabaseAuth).
- `getOrderForTracking` (by id + phone).
- Admin (requireSupabaseAuth + has_role check): `upsertProduct`, `deleteProduct`, `uploadAsset`, `listAllOrders`, `markOrderPaid`, `updateSettings`.

### Server Route
- `/api/public/moniepoint-webhook` (POST): verify HMAC SHA256 of raw body using `MONIEPOINT_WEBHOOK_SECRET` (timing-safe), parse, match pending order by `unique_amount`, mark paid, store payment.

### Secrets needed
- `MONIEPOINT_WEBHOOK_SECRET` (will request via add_secret after Cloud is enabled).

### Out of scope (v1)
- Cart / multi-item checkout (single product per order; can expand later).
- Email/SMS notifications.
- Shipping address capture beyond phone/email/name.
- Refunds.

### Build order
1. Enable Lovable Cloud, configure social auth (Google) + email/password.
2. Migration: enums, tables, grants, RLS, has_role, seed categories & admin role, settings singleton.
3. Create storage buckets + policies.
4. Server fns + webhook route.
5. UI: design tokens in `src/styles.css`, layout (__root with header/footer/WhatsApp FAB), homepage, product, checkout, orders, auth.
6. Admin panel routes under `_authenticated/_admin`.
7. Request `MONIEPOINT_WEBHOOK_SECRET` secret.
8. Verify: build, view preview, invoke webhook with a signed test payload.
