// ───────────────────────────────────────────────────────────────────────────
// Refund counter: kind statements a player can "redeem" against the expense
// they chose to reduce. Drafted for Malaysian young adults (18–30).
//
// Writing principles (for counsellors editing this file):
//  • Validate first, never dismiss. The cost was real; kindness gives SOME back.
//  • No "should", no "just think positive", no promises that things will be fine.
//  • Family, respect and harmony matter here. Statements make room for limits
//    WITHOUT asking anyone to stop respecting parents, elders or bosses.
//  • Speak to "malu" and face: asking for help or saying no is not shameful.
//  • Secular wording so it sits comfortably with every faith at the booth.
//  • A little Bahasa where Malaysians naturally use it, never as a gimmick.
//  • Short enough to remember and screenshot (≈ 12 words).
// ───────────────────────────────────────────────────────────────────────────

export const REFUNDS = {
  worrying: [
    { id: 'worrying_1', text: 'Worrying shows how much you care. You don’t have to carry tomorrow today.' },
    { id: 'worrying_2', text: 'Some things are in your hands, some aren’t. You can put the rest down.' },
    { id: 'worrying_3', text: 'You’ve made it through every hard day so far. One step is enough.' },
  ],
  apologies: [
    { id: 'apologies_1', text: 'You are never a burden for having needs or asking questions.' }, // from Yeehau
    { id: 'apologies_2', text: 'You can be polite without saying sorry for taking up space.' },
    { id: 'apologies_3', text: 'Saying ‘thank you for waiting’ works just as well as ‘sorry ah’.' },
  ],
  pleasing: [
    { id: 'pleasing_1', text: 'You can respect others and still respect yourself.' },
    { id: 'pleasing_2', text: 'Keeping the peace shouldn’t cost you your own peace.' },
    { id: 'pleasing_3', text: 'The people who care about you want the real you, not just the agreeable one.' },
  ],
  overthinking: [
    { id: 'overthinking_1', text: 'Once it’s sent, it’s done. You don’t need to replay it.' },
    { id: 'overthinking_2', text: 'Most people read your message once and move on. You can too.' },
    { id: 'overthinking_3', text: 'One awkward message doesn’t define who you are.' },
  ],
  yes: [
    { id: 'yes_1', text: 'You can be a good anak, friend and colleague, and still have limits.' },
    { id: 'yes_2', text: 'A kind ‘not this time’ is still kind.' },
    { id: 'yes_3', text: 'Saying no to one thing is saying yes to your own wellbeing.' },
  ],
  remembering: [
    { id: 'remembering_1', text: 'You don’t have to be the one who holds everything together.' },
    { id: 'remembering_2', text: 'Being the dependable one is a gift. You’re allowed to rest from it too.' },
    { id: 'remembering_3', text: 'It’s okay to let someone else remember this time.' },
  ],
  skipped_break: [
    { id: 'skipped_break_1', text: 'Rest is not lazy. Rest is part of the work.' },
    { id: 'skipped_break_2', text: 'Your worth isn’t measured by how busy you look.' },
    { id: 'skipped_break_3', text: 'Even five minutes of rehat counts.' },
  ],
  fine: [
    { id: 'fine_1', text: 'It’s okay not to be okay, and it’s not malu to say so.' },
    { id: 'fine_2', text: 'You can tell one safe person the real answer.' },
    { id: 'fine_3', text: 'How you really feel matters, even when you’re smiling through it.' },
  ],
};

// For items the player wrote themselves.
export const GENERIC_REFUNDS = [
  { id: 'any_1', text: 'That took real effort, even if nobody saw it.' },
  { id: 'any_2', text: 'You did your best with what you had today.' },
  { id: 'any_3', text: 'Tak apa. You’re allowed to do a little less tomorrow.' },
];

// Never a full refund: the cost was real, kindness gives some of it back.
export const REFUND_LEVELS = [
  { id: 'little', label: 'A little',    share: 0.25 },
  { id: 'some',   label: 'Quite a bit', share: 0.5 },
  { id: 'lot',    label: 'A lot',       share: 0.75 },
];

export const MAX_OWN_STATEMENT = 140;

const ALL = [...Object.values(REFUNDS).flat(), ...GENERIC_REFUNDS];

export function refundOptions(itemId, isCustom) {
  return isCustom ? GENERIC_REFUNDS : (REFUNDS[itemId] ?? GENERIC_REFUNDS);
}

export function statementText(id) {
  return ALL.find(s => s.id === id)?.text ?? null;
}

// Shared by the browser and the server. `line` is the chosen expense:
// { id, custom, amount }. Returns null if the refund isn't valid.
export function computeRefund(line, { statementId, ownText, levelId }) {
  if (!line) return null;
  const level = REFUND_LEVELS.find(l => l.id === levelId);
  if (!level) return null;

  let text = null, own = false;
  if (statementId === 'own') {
    text = typeof ownText === 'string' ? ownText.trim().replace(/\s+/g, ' ').slice(0, MAX_OWN_STATEMENT) : '';
    own = true;
    if (!text) return null;
  } else {
    if (!refundOptions(line.id, line.custom).some(s => s.id === statementId)) return null;
    text = statementText(statementId);
  }
  const amount = Math.round(line.amount * level.share * 100) / 100;
  return { statementId: own ? 'own' : statementId, text, own, levelId: level.id, amount };
}
