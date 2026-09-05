// API Client for Payroll — Structures, Rules, Payruns, Payslips, Dashboard

const extractErrorMessage = (errorData, fallbackMsg) => {
  if (!errorData) return fallbackMsg;
  if (typeof errorData.detail === "string") return errorData.detail;
  if (Array.isArray(errorData.detail)) {
    return errorData.detail
      .map((err) => {
        const field = err.loc && err.loc.length > 1 ? err.loc.slice(1).join(".") : "";
        return field ? `${field}: ${err.msg}` : err.msg;
      })
      .join("; ");
  }
  return errorData.message || fallbackMsg;
};

// Salary Structures
export const getStructures = async () => {
  const res = await fetch("/payroll/structures", { credentials: "include" });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to fetch structures"));
  return res.json();
};

export const getStructureById = async (id) => {
  const res = await fetch(`/payroll/structures/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to fetch structure"));
  return res.json();
};

export const createStructure = async (data) => {
  const res = await fetch("/payroll/structures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to create structure"));
  return res.json();
};

export const updateStructure = async (id, data) => {
  const res = await fetch(`/payroll/structures/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to update structure"));
  return res.json();
};

export const deleteStructure = async (id) => {
  const res = await fetch(`/payroll/structures/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to delete structure"));
  return true;
};

// Salary Rules
export const createRule = async (structureId, data) => {
  const res = await fetch(`/payroll/structures/${structureId}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to create rule"));
  return res.json();
};

export const updateRule = async (id, data) => {
  const res = await fetch(`/payroll/rules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to update rule"));
  return res.json();
};

export const deleteRule = async (id) => {
  const res = await fetch(`/payroll/rules/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to delete rule"));
  return true;
};

// Payruns
export const getPayruns = async () => {
  const res = await fetch("/payruns/", { credentials: "include" });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to fetch payruns"));
  return res.json();
};

export const getPayrunById = async (id) => {
  const res = await fetch(`/payruns/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to fetch payrun"));
  return res.json();
};

export const createPayrun = async (data) => {
  const res = await fetch("/payruns/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to create payrun"));
  return res.json();
};

export const updatePayrun = async (id, data) => {
  const res = await fetch(`/payruns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to update payrun"));
  return res.json();
};

export const deletePayrun = async (id) => {
  const res = await fetch(`/payruns/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to delete payrun"));
  return true;
};

export const computePayrun = async (id, employeeIds) => {
  const res = await fetch(`/payruns/${id}/compute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ employee_ids: employeeIds || null }),
  });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to compute payrun"));
  return res.json();
};

export const validatePayrun = async (id) => {
  const res = await fetch(`/payruns/${id}/validate`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to validate payrun"));
  return res.json();
};

export const markPayrunPaid = async (id) => {
  const res = await fetch(`/payruns/${id}/mark-paid`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to mark payrun as paid"));
  return res.json();
};

// Dashboard
export const getPayrollDashboard = async () => {
  const res = await fetch("/payroll/dashboard", { credentials: "include" });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to fetch dashboard"));
  return res.json();
};

export const deletePayslipFromPayrun = async (payrunId, payslipId) => {
  const res = await fetch(`/payruns/${payrunId}/payslips/${payslipId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to remove employee from payrun"));
  return res.json();
};

export const assignContractToPayslip = async (payrunId, payslipId, contractId) => {
  const res = await fetch(`/payruns/${payrunId}/payslips/${payslipId}/assign-contract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ contract_id: contractId }),
  });
  if (!res.ok) throw new Error(extractErrorMessage(await res.json().catch(() => ({})), "Failed to assign contract"));
  return res.json();
};

