const SEASON_BY_MONTH = [
  "winter", // Jan
  "winter", // Feb
  "spring", // Mar
  "spring", // Apr
  "spring", // May
  "summer", // Jun
  "summer", // Jul
  "summer", // Aug
  "autumn", // Sep
  "autumn", // Oct
  "autumn", // Nov
  "winter", // Dec
];

export function getCurrentSeason(date = new Date()) {
  return SEASON_BY_MONTH[date.getMonth()];
}
