// API Client for Contracts & Salary Structures

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

export const getContracts = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.employee_id) query.append('employee_id', params.employee_id);
  if (params.status) query.append('status', params.status);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`/contracts${queryString}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to fetch contracts'));
  }
  return await res.json();
};

export const getContractById = async (id) => {
  const res = await fetch(`/contracts/${id}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to fetch contract details'));
  }
  return await res.json();
};

export const createContract = async (data) => {
  const res = await fetch('/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to create contract'));
  }
  return await res.json();
};

export const updateContract = async (id, data) => {
  const res = await fetch(`/contracts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to update contract'));
  }
  return await res.json();
};

export const deleteContract = async (id) => {
  const res = await fetch(`/contracts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to delete contract'));
  }
  return true;
};

export const getSalaryStructures = async () => {
  const res = await fetch('/payroll/structures', {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to fetch salary structures'));
  }
  return await res.json();
};

export const getSalaryStructureById = async (id) => {
  const res = await fetch(`/payroll/structures/${id}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to fetch salary structure details'));
  }
  return await res.json();
};
