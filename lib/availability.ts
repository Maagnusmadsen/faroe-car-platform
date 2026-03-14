/**
 * Car availability logic: exclude cars that are booked or blocked within the selected date range.
 */

import { dateRangesOverlap } from "./date-utils";
import { bookings } from "./bookings";
import type { Car } from "./cars";

function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

/**
 * Returns true if the car has no booking overlapping the given date range.
 */
export function isCarAvailableForRange(
  carId: string,
  startDate: string,
  endDate: string
): boolean {
  if (!startDate || !endDate) return true;
  const overlapping = bookings.some(
    (b) =>
      b.carId === carId &&
      dateRangesOverlap(startDate, endDate, b.startDate, b.endDate)
  );
  return !overlapping;
}

/**
 * Returns only cars that are available for the entire selected date range
 * (no overlapping bookings and no blocked dates in range).
 */
export function getAvailableCars(
  cars: Car[],
  startDate: string,
  endDate: string
): Car[] {
  if (!startDate || !endDate) return cars;
  return cars.filter((car) => {
    if (!isCarAvailableForRange(car.id, startDate, endDate)) return false;
    const blocked = car.blockedDates ?? [];
    if (blocked.some((d) => isDateInRange(d, startDate, endDate))) return false;
    return true;
  });
}
