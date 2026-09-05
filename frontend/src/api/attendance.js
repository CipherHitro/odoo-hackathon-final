// API Client for Attendance Tracking

const extractErrorMessage = (errorData, fallbackMsg) => {
  if (!errorData) return fallbackMsg;
  if (typeof errorData.detail === 'string') return errorData.detail;
  if (Array.isArray(errorData.detail)) {
    return errorData.detail
      .map((err) => {
        const field = err.loc && err.loc.length > 1 ? err.loc.slice(1).join('.') : '';
        return field ? `${field}: ${err.msg}` : err.msg;
      })
      .join('; ');
  }
  return errorData.message || fallbackMsg;
};

export const checkIn = async () => {
  const res = await fetch('/attendance/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Check-in failed'));
  }
  return await res.json();
};

export const checkOut = async () => {
  const res = await fetch('/attendance/check-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Check-out failed'));
  }
  return await res.json();
};

export const getWidgetState = async () => {
  const res = await fetch('/attendance/widget');
  if (!res.ok) {
    return { is_checked_in: false, today_worked_hours: 0.0 };
  }
  return await res.json();
};

export const listAttendance = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip) query.append('skip', params.skip);
  if (params.limit) query.append('limit', params.limit);
  if (params.employee_id) query.append('employee_id', params.employee_id);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`/attendance${queryString}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to fetch attendance logs'));
  }
  const data = await res.json();
  return data.items || data;
};

export const createAttendance = async (attendanceData) => {
  const res = await fetch('/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attendanceData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to create attendance record'));
  }
  return await res.json();
};

