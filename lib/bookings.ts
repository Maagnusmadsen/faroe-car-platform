/**
 * Mock bookings/reservations for availability checks.
 * In production this would come from an API/database.
 */

export interface Booking {
  id: string;
  carId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

export const bookings: Booking[] = [
  // Car 1 (Toyota Yaris) booked for a sample range
  { id: "b1", carId: "1", startDate: "2025-03-15", endDate: "2025-03-20" },
  // Car 3 (Hyundai Tucson) booked
  { id: "b2", carId: "3", startDate: "2025-03-10", endDate: "2025-03-14" },
  // Car 4 (Peugeot 208) booked
  { id: "b3", carId: "4", startDate: "2025-04-01", endDate: "2025-04-05" },
];
