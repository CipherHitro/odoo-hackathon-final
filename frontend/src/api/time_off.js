// API Client for Time Off / Leave Management

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

export const getTimeOffTypes = async (isActive = null) => {
  const query = isActive !== null ? `?is_active=${isActive}` : '';
  const res = await fetch(`/time-off/types${query}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to fetch leave types'));
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
    throw new Error(extractErrorMessage(errorData, 'Failed to create leave type'));
  }
  return await res.json();
};

export const updateTimeOffType = async (typeId, typeData) => {
  const res = await fetch(`/time-off/types/${typeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(typeData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to update leave type'));
  }
  return await res.json();
};

export const getAllocations = async (params = {}) => {
  const query = new URLSearchParams();
  if (typeof params === 'number' || typeof params === 'string') {
    query.append('employee_id', params);
  } else if (params && typeof params === 'object') {
    if (params.employee_id) query.append('employee_id', params.employee_id);
    if (params.type_id) query.append('type_id', params.type_id);
    if (params.status) query.append('status', params.status);
    if (params.skip !== undefined) query.append('skip', params.skip);
    if (params.limit !== undefined) query.append('limit', params.limit);
  }

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`/time-off/allocations${queryString}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to fetch allocations'));
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
    throw new Error(extractErrorMessage(errorData, 'Failed to create allocation'));
  }
  return await res.json();
};

export const approveAllocation = async (allocationId) => {
  const res = await fetch(`/time-off/allocations/${allocationId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to approve allocation'));
  }
  return await res.json();
};

export const refuseAllocation = async (allocationId) => {
  const res = await fetch(`/time-off/allocations/${allocationId}/refuse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to refuse allocation'));
  }
  return await res.json();
};

export const getTimeOffRequests = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.employee_id) query.append('employee_id', params.employee_id);
  if (params.status) query.append('status', params.status);
  if (params.my_team) query.append('my_team', 'true');
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`/time-off/requests${queryString}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to fetch leave requests'));
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
    throw new Error(extractErrorMessage(errorData, 'Failed to submit leave request'));
  }
  return await res.json();
};

export const approveTimeOffRequest = async (requestId) => {
  const res = await fetch(`/time-off/requests/${requestId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to approve leave request'));
  }
  return await res.json();
};

export const refuseTimeOffRequest = async (requestId) => {
  const res = await fetch(`/time-off/requests/${requestId}/refuse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to refuse leave request'));
  }
  return await res.json();
};

