// API Client for Time Off / Leave Management

export const getTimeOffTypes = async () => {
  const res = await fetch('/time-off/types');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch leave types');
  }
  const data = await res.json();
  return data.items || data;
};

export const createTimeOffType = async (typeData) => {
  const res = await fetch('/time-off/types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(typeData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create leave type');
  }
  return await res.json();
};

export const getAllocations = async (employeeId = null) => {
  const url = employeeId 
    ? `/time-off/allocations?employee_id=${employeeId}` 
    : '/time-off/allocations';
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch allocations');
  }
  const data = await res.json();
  return data.items || data;
};

export const createAllocation = async (data) => {
  const res = await fetch('/time-off/allocations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create allocation');
  }
  return await res.json();
};

export const approveAllocation = async (allocationId) => {
  const res = await fetch(`/time-off/allocations/${allocationId}/approve`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to approve allocation');
  }
  return await res.json();
};

export const refuseAllocation = async (allocationId) => {
  const res = await fetch(`/time-off/allocations/${allocationId}/refuse`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to refuse allocation');
  }
  return await res.json();
};

export const getTimeOffRequests = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.employee_id) query.append('employee_id', params.employee_id);
  if (params.status) query.append('status', params.status);
  if (params.my_team) query.append('my_team', 'true');

  const res = await fetch(`/time-off/requests?${query.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch leave requests');
  }
  const data = await res.json();
  return data.items || data;
};

export const createTimeOffRequest = async (requestData) => {
  const res = await fetch('/time-off/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit leave request');
  }
  return await res.json();
};

export const approveTimeOffRequest = async (requestId) => {
  const res = await fetch(`/time-off/requests/${requestId}/approve`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to approve leave request');
  }
  return await res.json();
};

export const refuseTimeOffRequest = async (requestId) => {
  const res = await fetch(`/time-off/requests/${requestId}/refuse`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to refuse leave request');
  }
  return await res.json();
};
