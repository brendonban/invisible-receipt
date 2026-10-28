// ───────────────────────────────────────────────────────────────────────────
// Prototype gallery: receipt.ruangmalaysia.org/prototypes
//
// One entry per screen of the game. Each opens /prototypes/<slug>, which shows
// that screen on a phone and a desktop with sample answers (nothing is saved).
//   slug         part of the address: /prototypes/<slug>
//   step         which game screen to show (welcome, pre, shop, receipt,
//                reduce, refund, post, thanks)
//   number       shown top-left
//   date         'YYYY-MM-DD', last updated
//   title        short name
//   description  one line
//   notes        a few things to look at on this screen
// ───────────────────────────────────────────────────────────────────────────

export const GALLERY = {
  quote: 'I\u2019m fine. Just a bit tired.',
  title: 'The Invisible Work Receipt',
  subtitle: 'Every screen of the game, one at a time. Open a screen to see how it looks on a phone and on a desktop, with sample answers.',
};

export const PROTOTYPES = [
  {
    slug: 'welcome', step: 'welcome', number: '01', date: '2026-10-21',
    title: 'Welcome & referral code',
    description: 'What players see first: the idea in one line, the anonymity note, a referral code and the live counter.',
    notes: [
      'Opening a referral link (e.g. /um-booth) fills in the code automatically.',
      'The counter shows real receipts printed since 20 Oct.',
      'On desktop, a sample receipt sits beside the title.',
    ],
  },
  {
    slug: 'check-in', step: 'pre', number: '02', date: '2026-10-20',
    title: 'Mood check-in',
    description: 'A quick mood and energy check before the game starts.',
    notes: [
      'Five moods from Drained to Great, then an energy slider from 0 to 10.',
      'The progress line along the top follows the EHP “line of choice”.',
    ],
  },
  {
    slug: 'shop', step: 'shop', number: '03', date: '2026-10-28',
    title: 'Shop: what did you buy today?',
    description: 'Players add up the invisible work of their day, tapping or typing amounts, or adding their own.',
    notes: [
      'Every item starts at 0. Players can tap − / + or type a number.',
      '“Add your own” allows 40 characters and up to 5 items.',
      'Desktop shows the receipt updating live; phones show the total in a bar at the bottom.',
    ],
  },
  {
    slug: 'receipt', step: 'receipt', number: '04', date: '2026-10-20',
    title: 'The receipt',
    description: 'The bill for the day: every item, the total Mental Energy Spent, and a hint about the kindness counter.',
    notes: [
      'The receipt keeps its typewriter font.',
      '“Change something” goes back to the shop without losing answers.',
    ],
  },
  {
    slug: 'reduce', step: 'reduce', number: '05', date: '2026-10-20',
    title: 'Choose what to reduce',
    description: 'Which expense would you like to reduce this week? Players pick just one.',
    notes: ['Only the items they actually bought are listed, with what each one cost.'],
  },
  {
    slug: 'kindness-counter', step: 'refund', number: '06', date: '2026-10-20',
    title: 'Kindness counter',
    description: 'Players choose kind words for that expense, or write their own, and get part of the energy back.',
    notes: [
      'Three statements per expense, written for Malaysian young adults.',
      'A little / quite a bit / a lot gives 25%, 50% or 75% back, never 100%.',
      'Desktop shows the refund appearing on the receipt.',
    ],
  },
  {
    slug: 'check-out', step: 'post', number: '07', date: '2026-10-20',
    title: 'Post-survey',
    description: 'Mood and energy again, two 1–5 questions and an optional comment.',
    notes: ['Mood and energy repeat the check-in, so you can see the change for each player.'],
  },
  {
    slug: 'thank-you', step: 'thanks', number: '08', date: '2026-10-20',
    title: 'Thank you & email',
    description: 'Their one small step for the week, their kind words to take home, and an optional emailed receipt.',
    notes: [
      'The email address is used once to send the receipt and is never saved.',
      '“Next player” resets the game but keeps the referral code.',
    ],
  },
];

export const findPrototype = slug => PROTOTYPES.find(p => p.slug === slug) ?? null;

export const fmtDate = iso => new Date(`${iso}T00:00:00Z`)
  .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
