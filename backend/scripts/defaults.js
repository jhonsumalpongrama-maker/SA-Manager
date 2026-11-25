// Keep in sync with frontend/src/config/constants.js (DEFAULT_SETTINGS / DEFAULT_AREAS).
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
