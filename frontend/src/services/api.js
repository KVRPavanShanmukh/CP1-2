export const API_BASE = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080/api';

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('c55_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    // Ensure both id and userId are populated for maximum compatibility
    const normalized = {
      ...user,
      id: user.id || user.userId,
      userId: user.userId || user.id
    };
    localStorage.setItem('c55_user', JSON.stringify(normalized));
  } else {
    localStorage.removeItem('c55_user');
  }
}

export async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers,
    credentials: 'include'  // Session cookie is the only auth mechanism
  };

  const res = await fetch(`${API_BASE}${path}`, config);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || (data.message ? data.message : `Request failed with status ${res.status}`);
    throw new Error(errorMsg);
  }
  return data;
}

// User API
export const userApi = {
  getUsers: async (search = '') => {
    const data = await request(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    return Array.isArray(data) ? data : (data.users || []);
  },
  getUserById: async (idOrUid) => {
    const data = await request(`/users/${idOrUid}`);
    return data.user || data;
  }
};

// Auth API
export const authApi = {
  getMe: () => request('/auth/me'),
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      setStoredUser(null);
    }
  }
};

// Team API
export const teamApi = {
  getMyTeam: () => request('/teams/my-team'),
  getPublicTeams: () => request('/teams/public'),
  getTeamById: (teamId) => request(`/teams/${teamId}`),
  createTeam: (name, description = '') => request('/teams', {
    method: 'POST',
    body: JSON.stringify({ name, description })
  }),
  validateUser: (query) => request(`/teams/validate-user?query=${encodeURIComponent(query)}`),
  addMember: (teamId, target) => request(`/teams/${teamId}/members`, {
    method: 'POST',
    body: JSON.stringify({ target })
  }),
  updateMemberRole: (teamId, targetUserId, role) => request(`/teams/${teamId}/members/${targetUserId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role })
  }),
  removeMember: (teamId, targetUserId) => request(`/teams/${teamId}/members/${targetUserId}`, {
    method: 'DELETE'
  }),
  inviteMember: (teamId, target) => request(`/teams/${teamId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ target })
  }),
  getMyInvitations: () => request('/teams/invitations'),
  respondInvitation: (invitationId, accept) => request(`/teams/invitations/${invitationId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ accept })
  })
};

// Friends API
export const friendApi = {
  getFriends: () => request('/friends'),
  getRequests: () => request('/friends/requests'),
  searchUsers: (query) => request(`/friends/search?query=${encodeURIComponent(query)}`),
  sendRequest: (target) => request('/friends/request', {
    method: 'POST',
    body: JSON.stringify({ target })
  }),
  respondRequest: (requestId, accept) => request(`/friends/requests/${requestId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ accept })
  }),
  cancelRequest: (requestId) => request(`/friends/requests/${requestId}`, {
    method: 'DELETE'
  })
};
