import { apiFetch } from './api';

// TODO: sostituire i mock con chiamate reali al BE C#
export async function getBookings() {
  // return apiFetch('/api/bookings');
  return [];
}

export async function createBooking(data: any) {
  // return apiFetch('/api/bookings', { method: 'POST', body: JSON.stringify(data) });
  return data;
}
