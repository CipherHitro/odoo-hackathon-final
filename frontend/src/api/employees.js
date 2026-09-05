// API Client for Employee & HR Management

export const getEmployees = async () => {
  const res = await fetch('/employees/', {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch employees');
  }
  return await res.json();
};

export const getEmployeeById = async (id) => {
  const res = await fetch(`/employees/${id}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch employee details');
  }
  return await res.json();
};

export const createEmployee = async (data) => {
  const res = await fetch('/employees/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create employee');
  }
  return await res.json();
};

export const updateEmployee = async (id, data) => {
  const res = await fetch(`/employees/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update employee');
  }
  return await res.json();
};

export const getDepartments = async () => {
  const res = await fetch('/departments/', {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
};

export const getWorkingSchedules = async () => {
  const res = await fetch('/working-schedules/', {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    return [];
  }
  return await res.json();
};
