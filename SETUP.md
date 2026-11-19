# Family Trip app: setup (about 10 minutes, free)

You need two free accounts: **Supabase** (stores the data) and **Netlify** (puts the app online). Your family needs neither. They only get the link plus the username and password you make for them.

## 1. Create the database (Supabase)
1. Go to https://supabase.com and sign up (Google sign-in works).
2. Click **New project**. Pick any name (e.g. `egypt-trip`), set a database password (save it somewhere), and choose the region closest to you (e.g. Frankfurt). Wait about 2 minutes until it's ready.
3. In the left menu open **SQL Editor**, then **New query**. Open `supabase/schema.sql` from this folder, copy everything, paste it in, and press **Run**. It should say "Success". The day-by-day plan, day briefs and places are already filled in.
4. Open **Project Settings → API keys** (or **Data API**). Copy:
   - the **Project URL** (looks like `https://abcd1234.supabase.co`)
   - the **anon / publishable** key (starts with `eyJ…` or `sb_publishable_…`). Do **not** use the `service_role` / secret key.

Send both to Claude in the thread and you'll get back a ready-to-upload zip. Or paste them into `web/config.js` yourself.

## 2. Put the app online (Netlify)
1. Go to https://app.netlify.com/drop and sign up.
2. Unzip `family-trip-app-web.zip` and drag the **web** folder onto the page. You get a link like `https://random-name.netlify.app`.
3. Optional: under **Site configuration → Change site name** you can set something like `ourfamily-egypt.netlify.app`.

## 3. Claim it right away
Open the link **straight away**. The first person to open it creates the organizer account, so that should be you. Pick your username and a strong password.

## 4. Add the family
In **More → Add member**, enter each person's name, username, a starting password (6 characters or more), their email, and their family/household (e.g. "Abu Ahmad family"). The household lets you settle money per family instead of per person.
Each member has **permission switches**: what they can see (plan, places, photos, ideas, money, or only their own money) and what they can do (add expenses, suggest, comment, upload photos, edit the plan, edit places, post announcements). Making someone an Organizer gives them full access.

Send each person the link, their username and password. On their phone: iPhone → Share → **Add to Home Screen**; Android → menu → **Install app**.

## Good to know
- **Bills by email:** on any expense, the ✉️ button opens your mail app with that person's bill filled in, and 💬 does the same for WhatsApp. At the end, use **More → Final statements** to send everyone their full statement and who to pay.
- **Currencies:** expenses can be in EGP, JOD or USD. Balances are converted with the rates in **More → Exchange rates** (default is 1 JOD = 68 EGP). Update it before the trip.
- **Keep it awake:** free Supabase projects pause after **7 days with no activity**. Open the app at least once a week before the trip. If it pauses, press **Restore** in the Supabase dashboard and nothing is lost.
- **Photos** are shrunk on the phone before uploading. The free plan holds a few thousand photos.
- **Updating the app later:** drag the new `web` folder onto your site's **Deploys** page in Netlify.
