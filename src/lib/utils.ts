import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const getAcademicMonthForDate = (date: Date = new Date(), academicYear?: string) => {
  const monthName = MONTH_NAMES[date.getMonth()];
  const currentCalendarYear = date.getFullYear();

  let yearToUse = currentCalendarYear.toString();
  if (academicYear) {
    const parts = academicYear.split('-');
    const startYear = parts[0] || currentCalendarYear.toString();
    const endYear = parts[1] || (parseInt(startYear) + 1).toString();
    const monthsInNextYear = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
    yearToUse = monthsInNextYear.includes(monthName) ? endYear : startYear;
  }

  return {
    monthName,
    year: yearToUse,
    fullMonth: `${monthName} ${yearToUse}`
  };
};

export const matchesMonth = (dataMonth: string | undefined, filterMonth: string | undefined) => {
  if (!filterMonth) return true;
  if (!dataMonth) return false;
  const normalizedData = dataMonth.trim().toLowerCase();
  const normalizedFilter = filterMonth.trim().toLowerCase();
  return normalizedData === normalizedFilter || normalizedData.includes(normalizedFilter) || normalizedFilter.includes(normalizedData);
};

export const getCanonicalMonth = (selectedMonth: string, currentAssessmentMonth: string) => {
  if (!selectedMonth) return currentAssessmentMonth;
  if ((currentAssessmentMonth || '').toLowerCase().includes((selectedMonth || '').toLowerCase())) {
    return currentAssessmentMonth;
  }
  return selectedMonth;
};

/**
 * Checks whether the specified month string (e.g. "August 2026", "August", etc.) has passed/is over
 * compared to current calendar date or a reference date.
 */
export const isMonthOver = (
  monthStr: string | undefined,
  academicYear?: string,
  referenceDate: Date = new Date()
): boolean => {
  if (!monthStr || !monthStr.trim()) return false;

  const parts = monthStr.trim().split(/\s+/);
  const monthName = parts[0];
  const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
  if (monthIdx === -1) return false;

  let year: number;
  if (parts.length > 1 && !isNaN(parseInt(parts[1]))) {
    year = parseInt(parts[1]);
  } else if (academicYear) {
    const yrParts = academicYear.split('-');
    const startYear = parseInt(yrParts[0]) || referenceDate.getFullYear();
    const endYear = parseInt(yrParts[1]) || startYear + 1;
    const monthsInNextYear = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
    year = monthsInNextYear.some(m => m.toLowerCase() === monthName.toLowerCase()) ? endYear : startYear;
  } else {
    year = referenceDate.getFullYear();
  }

  // The month is over if the reference date has reached or passed the 1st day of the next month
  // i.e., new Date(year, monthIdx + 1, 1, 0, 0, 0) <= referenceDate
  const endOfMonthLimit = new Date(year, monthIdx + 1, 1, 0, 0, 0, 0);
  return referenceDate.getTime() >= endOfMonthLimit.getTime();
};

