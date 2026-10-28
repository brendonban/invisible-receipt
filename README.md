# 🧾 The Invisible Work Receipt

A 2–3 minute counselling booth game: **mood check-in → pick "purchases" → funny receipt →
"which expense will you reduce?" → post-survey.** Built with Next.js, hosted on Vercel,
code on GitHub, data in Neon Postgres.

## How test vs real works

| Where it runs | Mode | Saved to |
|---|---|---|
| Vercel **Production** (`main`) with `APP_MODE=real` | REAL | `sessions` |
| Production URL + `?test=1` (facilitator practice) | TEST | `test_sessions` |
| Vercel **Preview** (any branch except `main`, e.g. `test`) | TEST | `test_sessions` |
| `npm run dev` on your laptop (with a `DATABASE_URL`) | TEST | `test_sessions` |

Real and test sessions go to **two separate tables** with the same columns, so they can
never mix. The server decides which table to use, so a player can't make test answers count
as real. Test mode shows a yellow banner; only real sessions count on the homepage.

**Preview deployments and test data:** the Vercel ↔ Neon integration can give each Preview
deployment its own database branch. If you want Preview test sessions to show on the live
admin page, turn that off (Neon integration settings → don't create preview branches) so
Preview uses the same `DATABASE_URL`. Otherwise use `?test=1` on the live site for testing.

## Setup (one time, ~15 min)

1. **GitHub** – create a repo, upload these files, then create a second branch called `test`.
2. **Vercel** – *Add New → Project → Import* your repo. Framework is auto-detected. Deploy.
3. **Database** – in the Vercel project: *Storage → Create → Neon (Postgres)* → connect it
   to the project. This adds `DATABASE_URL` automatically.
4. **Create the table** – open the database in Neon → SQL Editor → paste `sql/schema.sql` → Run.
5. **Set the admin password** – add `ADMIN_PASSWORD` (Production and Preview).
6. **Turn on real mode** – *Settings → Environment Variables* → add `APP_MODE` = `real`,
   tick **Production only**. Redeploy `main`.

## Referral links

Add a code to the end of the link and it fills in the referral code on the welcome screen
automatically, then gets saved with each session:

```
receipt.ruangmalaysia.org/um-booth
receipt.ruangmalaysia.org/instagram
receipt.ruangmalaysia.org/sunway-talk
receipt.ruangmalaysia.org/?ref=poster-a      (also works)
```

- Letters, numbers, `-` and `_`, up to 32 characters. Capitals are fine; they're saved in lowercase.
- The code stays filled in after "Next player", so a booth device keeps its code all day.
- Players can see and edit the code (or type one) on the welcome screen. It's optional.
- Use one code per place: a QR code on a poster, a link in an Instagram bio, a booth tablet.
- Links that aren't a valid code (e.g. with spaces or dots) show a 404 page.

## Results dashboard: /admin

`receipt.ruangmalaysia.org/admin`, locked with `ADMIN_PASSWORD` (any username works).

- **Real / Test tabs:** the two data sets are shown separately, never combined.
- **Filters:** referral code and date range (Malaysia time).
- **Summary:** completed sessions, average mood and energy change, "helpful" and "more aware"
  scores, energy spent and refunded, average time to finish.
- **Charts:** completed sessions per day, and sessions by referral code.
- **Every session:** timestamp, referral code, mood and energy before/after, what they
  bought, the expense to reduce, kind words and refund, survey answers and comments.
- **Download CSV:** every column for the current tab and filters, for Excel/Sheets/SPSS.
- **Referral link maker** (always gives `https://receipt.ruangmalaysia.org/<code>`; change with
  `PUBLIC_SITE_URL`) and a **Clear test data** button (test tab only; type DELETE).

## Prototype gallery: /prototypes

`receipt.ruangmalaysia.org/prototypes` lists every screen of the game. Each one opens a subpage
(e.g. `/prototypes/kindness-counter`) showing that screen on a phone and a desktop, side by side,
with sample answers. The previews are live (you can tap through them) but **never save data or
send email**. They use `/?demo=<screen>`, which you can also open full screen.

Titles, dates, descriptions and notes for each screen are in `lib/prototypes.js`.

## Homepage counter

The welcome screen shows "N receipts printed since 20 Oct". It counts **real** sessions only
(test count on Preview/local or with `?test=1`, marked "test"), refreshes about every
30 seconds, and uses Malaysia time. Change the start date with `COUNTER_SINCE`.

## Optional: email the receipt (email addresses are NOT saved)

On the thank-you screen players can type their email to get a copy of their receipt.

- The address goes straight from the browser to `/api/email` → Resend → their inbox.
- It is never written to the database, never logged, and is not sent with the survey answers.
- The email is rebuilt on the server from the checked purchases, so the form can't be
  used to send arbitrary messages to strangers.

Setup:
1. Make a free account at resend.com and create an API key.
2. Verify a domain you own in Resend (until you do, Resend only delivers to your own
   account's address — fine for testing, not for the event).
3. In Vercel → Settings → Environment Variables, add `RESEND_API_KEY` and
   `EMAIL_FROM` (e.g. `Invisible Work Receipt <receipt@yourdomain.com>`) for
   **Production and Preview**, so you can test emails on the `test` branch too.
4. Check Resend's own retention settings: Resend keeps a log of sent emails (including the
   recipient) on its side for a period. Mention this in your consent/privacy wording.

If the keys aren't set, the box simply says email isn't set up yet — the game still works.

## Day-to-day workflow

- Make changes on the `test` branch → Vercel gives you a Preview URL → try it freely.
- Happy? Merge `test` → `main` → the live (real) site updates.
- Event day: share the Production URL / QR code. Practice with `?test=1` on the end.

## Viewing data

Neon SQL Editor:

```sql
SELECT * FROM session_summary;                         -- one row per real session
SELECT avg(pre_mood), avg(post_mood), avg(post_mood - pre_mood) FROM sessions;
SELECT reduce_item, count(*) FROM sessions GROUP BY 1 ORDER BY 2 DESC;
```

What players wrote in "Add your own":

```sql
SELECT p->>'label' AS item, p->>'drain' AS drain, count(*) AS players, sum((p->>'qty')::int) AS total_qty
FROM sessions, jsonb_array_elements(purchases) p
WHERE (p->>'custom')::boolean
GROUP BY 1, 2 ORDER BY players DESC;
```

Export to CSV from the Neon results panel for Excel / SPSS.

## Kindness counter (refunds)

After choosing an expense to reduce, players pick kind words for it (or write their own)
and say how much they help: a little / quite a bit / a lot = 25% / 50% / 75% of that
expense back. Never 100%: the cost was real, kindness gives some of it back.

- Statements live in `lib/refunds.js`, with the writing principles at the top.
  **Have your counsellors review them before the event.**
- Already ran the old `sql/schema.sql`? Run it again; it only adds the new columns.
- Note for reports: the post-survey now comes after the refund, so mood change includes
  its effect. Don't compare these results with sessions run before this change.

Which words people chose:

```sql
SELECT reduce_item, refund_statement, refund_level, count(*)
FROM sessions WHERE refund_statement IS NOT NULL
GROUP BY 1, 2, 3 ORDER BY 4 DESC;

SELECT refund_own_text FROM sessions WHERE refund_statement = 'own';  -- words players wrote
```

## Customising

- Items and silly "energy costs": `lib/items.js`
- Survey questions & screens: `app/page.js`
- Colours, spacing, fonts: tokens at the top of `app/globals.css`
- "Need to talk now?" helplines: `lib/support.js` (re-check numbers before each event)

Layout: phones get one column with a sticky total bar; screens 960px+ get two columns with a
live receipt beside the list. Inter is bundled from npm (no Google Fonts call), the receipt
keeps its typewriter font.

## Ethics note

No names, emails or IPs are stored. If this is for a study, check with your
institution's ethics/IRB process about the consent wording on the welcome screen,
and make sure the booth has a counsellor or referral info available.
