// The "menu" of invisible work. Costs are deliberately silly "energy units",
// not scientific measurements. Edit freely.
export const ITEMS = [
  { id: 'worrying',      label: 'Hours of worrying',              unit: 'hr',  cost: 4.5 },
  { id: 'apologies',     label: 'Unnecessary apologies',          unit: 'x',   cost: 0.75 },
  { id: 'pleasing',      label: 'Minutes of people-pleasing',     unit: 'min', cost: 0.2 },
  { id: 'overthinking',  label: 'Re-reading a sent message',      unit: 'x',   cost: 1.25 },
  { id: 'yes',           label: '"Yes" when I meant "no"',        unit: 'x',   cost: 3.0 },
  { id: 'remembering',   label: 'Remembering everyone\'s stuff',  unit: 'task',cost: 2.0 },
  { id: 'skipped_break', label: 'Skipped breaks',                 unit: 'x',   cost: 2.5 },
  { id: 'fine',          label: '"I\'m fine" (not fine)',         unit: 'x',   cost: 5.0 },
];

// Players can add their own items. They pick how draining it felt; that
// becomes the (still silly) energy cost per unit.
export const DRAIN_LEVELS = [
  { id: 'light',  label: 'A little',     cost: 1.0 },
  { id: 'medium', label: 'Quite a bit',  cost: 2.5 },
  { id: 'heavy',  label: 'A lot',        cost: 4.0 },
];
export const MAX_CUSTOM = 5;
export const MAX_CUSTOM_LABEL = 40;

export const MOODS = [
  { value: 1, emoji: '😩', label: 'Drained' },
  { value: 2, emoji: '😕', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];
