export const SCHEDULES = {
  MWF: {
    id: 'MWF',
    label: 'MWF Schedule',
    shortLabel: 'MWF',
    timeLabel: '3:00-4:00 PM',
    optionLabel: 'MWF 3:00-4:00 PM',
    printLabel: 'MWF',
    // JS weekday numbers (0 = Sunday)
    weekdays: [1, 3, 5],
  },
  EVERYDAY: {
    id: 'EVERYDAY',
    label: 'Everyday Schedule',
    shortLabel: 'Everyday',
    timeLabel: '7:00 PM onward',
    optionLabel: 'Everyday 7:00 PM+',
    printLabel: 'Everyday',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
  },
  MONTHLY: {
    id: 'MONTHLY',
    label: 'Monthly Cleaners',
    shortLabel: 'Monthly Cleaner',
    timeLabel: 'Mon-Fri',
    optionLabel: 'Monthly Cleaner',
    printLabel: 'Cleaners',
    weekdays: [1, 2, 3, 4, 5],
  },
};

export const SCHEDULE_ORDER = ['MWF', 'EVERYDAY', 'MONTHLY'];

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const STATUS = { P: 'P', L: 'L', A: 'A' };
export const STATUS_LABELS = { P: 'Present', L: 'Late', A: 'Absent' };

export const DEFAULT_SETTINGS = {
  timezone: 'Asia/Manila',
  weekStartsOn: 0, // 0 = Sunday, 1 = Monday
  schoolLogoUrl: '',
  orgLogoUrl: '',
};

export const DEFAULT_AREAS = [
  ['MWF', 'Faculty Lounge - 1st Floor'],
  ['MWF', 'Faculty Lounge - 2nd Floor'],
  ['MWF', 'Bleachers'],
  ['MWF', 'CISO'],
  ['MWF', 'Covered Court'],
  ['MWF', 'Faculty Room'],
  ['MWF', 'Library'],
  ['MWF', 'Scholarship'],
  ['EVERYDAY', 'Main Bldg - 1st Floor'],
  ['EVERYDAY', 'Main Bldg - 2nd Floor'],
  ['EVERYDAY', 'Main Bldg - 3rd Floor'],
  ['EVERYDAY', 'Annex Bldg - 1st Floor'],
  ['EVERYDAY', 'Annex Bldg - 2nd Floor'],
  ['EVERYDAY', 'Senior High Bldg'],
  ['EVERYDAY', 'TA Bldg - 1st Floor'],
  ['EVERYDAY', 'TA Bldg - 2nd Floor'],
  ['MONTHLY', 'Monday'],
  ['MONTHLY', 'Tuesday'],
  ['MONTHLY', 'Wednesday'],
  ['MONTHLY', 'Thursday'],
  ['MONTHLY', 'Friday'],
].map(([scheduleType, name], i) => ({ scheduleType, name, order: i, active: true }));

export const SEARCH_DEBOUNCE_MS = 250;
export const MAX_NAME_LENGTH = 60;
export const HISTORY_PAGE_WEEKS = 4;
