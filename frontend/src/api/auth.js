export const loginUser = async (credentials) => {
  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Registration failed');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const forgotPassword = async (email) => {
  try {
    const response = await fetch('/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to request password reset');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const verifyOtp = async (email, otp) => {
  try {
    const response = await fetch('/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to verify OTP');
    }

    return data; // contains reset_token
  } catch (error) {
    throw error;
  }
};

export const resetPassword = async (reset_token, new_password) => {
  try {
    const response = await fetch('/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reset_token, new_password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to reset password');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    const response = await fetch('/auth/logout', {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Logout failed');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await fetch('/auth/me', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      }
    });

    if (response.status === 401) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }

    if (!response.ok) {
      let detail = 'Failed to fetch user';
      try {
        const data = await response.json();
        detail = data.detail || detail;
      } catch {
        detail = `Server error (${response.status})`;
      }
      const err = new Error(detail);
      err.status = response.status;
      throw err;
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const listUsers = async () => {
  try {
    const response = await fetch('/auth/users');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to list users');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const updateUser = async (userId, updateData) => {
  try {
    const response = await fetch(`/auth/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to update user');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

