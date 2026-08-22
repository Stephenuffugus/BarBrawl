# HOSTINGER SUBDOMAIN DEPLOY — Handoff for the OTHER Claude

> Stephen's other project (e.g. Litter Bug / Bar Brawl / whatever) needs to deploy to a subdomain of `lucidwinds.com` like `barbrawl.lucidwinds.com` (or `litterbug.lucidwinds.com`, or `test.lucidwinds.com`, etc).
>
> **Read this entire file before touching anything.** The previous attempt wasted a day because the AI tried to do work it can't do (Hostinger panel access) and skipped work it had to do (repo prep). This doc separates the two cleanly.

---

## THE SHORT VERSION

There are **three roles** in a Hostinger subdomain deploy. Knowing who does what is the whole game:

| Role | Who | Can the AI do this? |
|---|---|---|
| 1. Create the subdomain in Hostinger hPanel | **Stephen only** | ❌ No. Requires Hostinger login. |
| 2. Connect Hostinger Git to your project's GitHub repo | **Stephen only** | ❌ No. Requires Hostinger login. |
| 3. Prep the repo so it deploys correctly | **The AI (you)** | ✅ Yes. This is your entire job. |

The previous Claude wasted Stephen's day because it tried to do (1) and (2), got confused, and never finished (3). **You only do (3).** You give Stephen the click-by-click for (1) and (2) and let him run them.

---

## WHAT YOU (THE AI) ACTUALLY DO

A Hostinger Git-auto-deploy site needs **four things** in the repo root:

1. `index.html` at the root (Hostinger serves this when someone hits the subdomain)
2. `.htaccess` at the root (forces HTTPS, sets cache headers, MIME types)
3. All asset paths in `index.html` must be **relative** (`assets/foo.png`, not `/assets/foo.png` and not `https://lucidwinds.com/assets/foo.png`) — Hostinger serves the subdomain from a subdirectory like `/public_html/barbrawl/`, so absolute-rooted paths break.
4. A cache-bust version constant in `index.html` (so when you push fixes, the browser actually re-fetches).

**Do not** try to add a build step. **Do not** try to add a CI workflow. **Do not** try to set up GitHub Actions. Hostinger's built-in Git integration pulls directly from `main` and writes files to the subdomain folder — no CI needed.

### Step-by-step for the AI

**A. Verify the project repo has these files at the root.** If any are missing, add them:

- [ ] `index.html` at repo root (not in a subfolder)
- [ ] `.htaccess` at repo root (copy the template at the bottom of this doc, line-for-line)
- [ ] `package.json` (only if you use `npm run smoke` or similar — not required by Hostinger)

**B. Audit `index.html` for absolute paths that will break on a subdomain.** Run:

```bash
grep -nE '(src|href)=["\047]/(assets|games|api|shared|core|app)' index.html
```

Every hit is a broken path. Fix each to be relative (drop the leading `/`). Common offenders:

- `<img src="/assets/foo.png">` → `<img src="assets/foo.png">`
- `<link href="/shared.css">` → `<link href="shared.css">`
- `<script src="/games/sift.js">` → `<script src="games/sift.js">`
- `fetch('/api/checkout.php')` → `fetch('api/checkout.php')`

If there's a `<base href="...">` tag, **delete it** unless you know exactly what you're doing.

**C. Add or verify the cache-bust constant.** Near the top of the `<script>` block in `index.html`:

```js
window.LB_VERSION = '2026.05.23.01'; // bump on every push
```

Then every asset URL that gets re-cut should use it:

```js
'<img src="assets/bugs/wing-01.png?v=' + (window.LB_VERSION || '0') + '">'
```

Without this, Cloudflare and the browser cache will trap Stephen on the old version no matter how many times you push.

**D. Confirm the smoke harness still passes** (if the project has one):

```bash
npm install && npm run smoke
```

If it red-lines, fix it before handing off. A broken smoke harness is a broken game.

**E. Commit and push to `main`.** Tell Stephen the commit hash.

**F. Hand Stephen the click-list below.** Your job is done.

---

## WHAT STEPHEN DOES (5 MINUTES IN HOSTINGER)

Stephen — here's the click path. The other Claude cannot do these for you.

### Step 1 — Create the subdomain

1. Log in at `hpanel.hostinger.com`
2. Pick the **lucidwinds.com** domain (or whichever main domain you want the subdomain under)
3. Left sidebar → **Domains** → **Subdomains**
4. **Create new subdomain**:
   - Subdomain: `barbrawl` (or `litterbug` or whatever — this becomes `barbrawl.lucidwinds.com`)
   - Custom folder: leave default. Hostinger will create `/public_html/barbrawl/`.
5. Click **Create**. DNS propagates in ~5 minutes (often instant because the domain is at Hostinger).

### Step 2 — Connect Git auto-deploy

1. Same hPanel, left sidebar → **Advanced** → **Git**
2. Click **Create new repository**
3. Fill in:
   - **Repository address**: `https://github.com/Stephenuffugus/<project-repo-name>.git`
   - **Branch**: `main`
   - **Install path**: `/public_html/barbrawl` (or whatever folder Step 1 created — Hostinger usually fills this in if you pick the subdomain from the dropdown)
4. If the repo is private, you'll be prompted for a GitHub deploy key — Hostinger generates one, you paste it into the repo's **Settings → Deploy keys** on GitHub with "Allow write access" UNchecked.
5. Click **Create**.

### Step 3 — Enable auto-deploy on push

After the repo is created in Step 2:

1. Click into the repo from the Git list
2. Toggle **Auto-deployment** to **ON**
3. Hostinger gives you a webhook URL like `https://webhooks.hostinger.com/deploy/<hash>`
4. Go to your GitHub repo → **Settings → Webhooks → Add webhook**
   - Payload URL: the webhook URL Hostinger gave you
   - Content type: `application/json`
   - Trigger: **Just the push event**
   - Active: ✓
5. Click **Add webhook**.

From now on, every push to `main` auto-deploys to the subdomain in ~30 seconds.

### Step 4 — First deploy

In hPanel → Git → click your repo → **Deploy now** (or **Pull**). This does the first pull manually so you don't have to wait for the next push.

### Step 5 — Test it

1. Open `https://barbrawl.lucidwinds.com` in a browser
2. Should see the game
3. Check DevTools console — no 404s, no CORS errors, no path errors
4. If it works, you're done.

---

## TROUBLESHOOTING — IF SOMETHING IS BROKEN

The previous Claude likely hit one of these. Knowing the symptom → cause map saves another day:

### Symptom: subdomain shows Hostinger default landing page

**Cause:** `index.html` is not at the root of the deployed folder. Either:
- The repo doesn't have `index.html` at its root (it's in a subfolder)
- The Hostinger install path is wrong (e.g. pointing to `/public_html` instead of `/public_html/barbrawl`)

**Fix:** Make sure `index.html` is at repo root. In hPanel → File Manager, navigate to `/public_html/barbrawl/` and confirm `index.html` is there. If not, manually trigger a deploy.

### Symptom: subdomain loads but all images/scripts are 404

**Cause:** Absolute paths in `index.html`. A path like `/assets/foo.png` on `barbrawl.lucidwinds.com` resolves to `https://barbrawl.lucidwinds.com/assets/foo.png`, but on Hostinger the actual file is at `/public_html/barbrawl/assets/foo.png` and the URL maps correctly… **unless** the path is rooted at the main domain's `/public_html/`, which can happen if Hostinger sets up the subdomain inside the main folder rather than as a separate vhost. **The safe fix is always: use relative paths.**

**Fix:** Run the grep from Step B above. Drop leading slashes.

### Symptom: subdomain works in incognito but stale in normal browser

**Cause:** Cloudflare / browser is serving cached `index.html`. The `.htaccess` from this repo caches HTML for 5 minutes — your fix may not be live yet.

**Fix:** Wait 5 min. Then bump `LB_VERSION` in `index.html` and re-push. The version change forces a hard reload via the cache-bust query string on every asset URL that uses it.

### Symptom: 500 Internal Server Error

**Cause:** Bad `.htaccess` syntax, or an Apache module the rules reference isn't enabled on Hostinger's plan.

**Fix:** Check Hostinger → hPanel → Files → Error log. If it complains about `mod_rewrite` or `mod_headers`, you're on a plan that doesn't support them (very rare — almost all Hostinger plans do). More likely: a stray character in `.htaccess`. Compare line-for-line with the template at the bottom of this doc.

### Symptom: Git deploy says "permission denied" pulling from GitHub

**Cause:** Private repo without a deploy key, or deploy key not added to GitHub.

**Fix:** In hPanel Git, the repo settings page shows a public SSH key. Copy it. In GitHub → repo → **Settings → Deploy keys → Add deploy key**. Paste. Leave **Allow write access UNchecked** (read-only is enough and safer). Re-trigger deploy.

### Symptom: pushed but the subdomain hasn't updated

**Cause:** Webhook didn't fire, or auto-deploy is off.

**Fix:** GitHub → repo → **Settings → Webhooks** → click the Hostinger webhook → **Recent Deliveries** tab. If the most recent push isn't there or shows a red X, the webhook is broken — recreate it. If it shows green, the deploy fired and the file might just be cached (see "stale in normal browser" above).

### Symptom: PHP file (Stripe checkout etc.) returns blank page or 500

**Cause:** Hostinger's PHP version is wrong, or the file expects a `stripe-config.php` that isn't on the server.

**Fix:** hPanel → Advanced → PHP Configuration → set PHP version to 8.1+. The `stripe-config.php` (with real keys) is the one file you do NOT commit to git — upload it manually via File Manager into the api/ folder on the server. The committed `stripe-config.example.php` is just a template.

---

## .HTACCESS TEMPLATE — COPY THIS EXACTLY

Save as `.htaccess` at the **root** of the project repo. This is a trimmed version of the Lucid Winds production `.htaccess` — it's been battle-tested for months.

```apache
# ── 1. FORCE HTTPS ──
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

# ── 2. GZIP COMPRESSION ──
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE text/javascript
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/json
  AddOutputFilterByType DEFLATE image/svg+xml
</IfModule>

# ── 3. CACHING ──
<IfModule mod_headers.c>
  # HTML: short cache so deploys go live fast
  <FilesMatch "\.html$">
    Header set Cache-Control "public, max-age=300, stale-while-revalidate=86400"
  </FilesMatch>

  # Core JS/CSS: revalidate every load so fixes ship immediately
  <FilesMatch "^(core|app|shared|engagement)\.(js|css)$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>

  # Game modules with versioned paths: cache hard (cache-bust via ?v=)
  <FilesMatch "^games/.*\.js$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>

  # Images: cache 1 year (unique filenames, or cache-busted via ?v=)
  <FilesMatch "\.(jpg|jpeg|png|webp|gif|svg|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>

  # Fonts: cache 1 year
  <FilesMatch "\.(woff|woff2|ttf|otf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>

  # Manifest: cache 1 day
  <FilesMatch "\.(json|webmanifest)$">
    Header set Cache-Control "public, max-age=86400"
  </FilesMatch>
</IfModule>

# ── 4. SECURITY HEADERS ──
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# ── 5. MIME TYPES ──
<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType application/json .json
  AddType application/manifest+json .webmanifest
  AddType image/svg+xml .svg
</IfModule>

# ── 6. NO DIRECTORY LISTING ──
Options -Indexes
```

If the project needs Pi Browser embedding (it doesn't, unless it's a Pi app), add this to section 4:

```apache
Header unset X-Frame-Options
Header set Content-Security-Policy "frame-ancestors 'self' https://*.minepi.com https://minepi.com"
```

---

## VERIFICATION CHECKLIST — DON'T SAY "DONE" UNTIL ALL GREEN

For the AI:
- [ ] `index.html` exists at repo root
- [ ] `.htaccess` exists at repo root (matches template)
- [ ] `grep -nE '(src\|href)=["\047]/' index.html` returns no asset paths starting with `/`
- [ ] `LB_VERSION` (or equivalent) constant exists and is bumped
- [ ] Smoke harness passes (if project has one)
- [ ] Committed and pushed to `main`
- [ ] Commit hash given to Stephen

For Stephen:
- [ ] Subdomain created in Hostinger hPanel
- [ ] Git repo connected with `main` branch and correct install path
- [ ] Auto-deploy webhook added to GitHub
- [ ] First manual deploy triggered from hPanel
- [ ] `https://<subdomain>.lucidwinds.com` loads the game
- [ ] DevTools console shows zero 404s or path errors
- [ ] An asset that's supposed to have art shows the art (not a broken-image icon)

If any box on Stephen's side won't tick green, the AI debugs from the **Troubleshooting** section above — it doesn't guess, it doesn't refactor, it doesn't "fix it while it's in there."

---

## RULES OF ENGAGEMENT FOR THE OTHER CLAUDE

Stephen has been burned. Follow these or expect to be replaced:

1. **Tell Stephen the commit hash after every push.** He pulls and tests on his phone via the deployed subdomain. He needs to know what's live.
2. **Do not promise timelines.** "I'll fix it" not "I'll fix it in 10 min".
3. **Do not refactor while you're in there.** Touch only what Stephen asked you to touch.
4. **When you hit a real Hostinger question, ask Stephen.** Don't guess what plan he has, what domains are registered, what folders exist. Ask.
5. **When a deploy doesn't work, trace it.** Webhook delivered? File on server? Path correct? Cache bypassed? Don't ship "fixes" until you know what failed.
6. **Do not edit this handoff doc** unless Stephen tells you to. If something here is wrong, tell Stephen — he'll update Lucid Winds' copy directly.

---

*End of handoff. The deploy pattern above is the exact one running `lucidwinds.com` in production today. If the AI follows it, Stephen's other game ships to its subdomain in one session.*
