const DEFAULT_API_BASE = 'http://localhost:8080/api';

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

export const API_BASE = trimTrailingSlash(import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE);

// SockJS endpoint lives beside the REST API. It can be overridden independently for
// deployments where the WebSocket is proxied under a different host/path.
export const WS_BASE = trimTrailingSlash(
  import.meta.env?.VITE_WS_URL || API_BASE.replace(/\/api$/, '/ws-simulation')
);

/** Default configuration shared by the simulation form and the history view. */
export const DEFAULT_SIMULATION_CONFIG = Object.freeze({
  nodeCount: 10,
  consensusType: 'PoW',
  networkTopology: 'Erdos-Renyi',
  blockGossipLatency: 0.5,
  slotDuration: 1.0,
  simulationTicks: 10,
  randomSeed: 7,
  byzantineRatio: 0.0,
  byzantineBehaviorEnabled: false,
  byzantineAttackMode: 'EQUIVOCATION',
  authorityIds: [],
  inactiveAgentRatio: 0.0,
  packetLossRate: 0.0,
  networkLatencyJitter: 2,
  partitionRatio: 0.0,
  partitionStartTick: -1,
  partitionEndTick: -1,
  transactionsPerAgentPerTick: 0,
  mempoolCapacity: 100,
  maxTransactionsPerBlock: 100,
  transactionAmount: 1.0
});

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

// Blog API
export const blogApi = {
  getPosts: (category, search) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    const qs = params.toString();
    return request(`/blog/posts${qs ? `?${qs}` : ''}`);
  },
  getPost: (id) => request(`/blog/posts/${id}`),
  createPost: (title, content, category, tags) => request('/blog/posts', {
    method: 'POST',
    body: JSON.stringify({ title, content, category, tags })
  }),
  getCategories: () => request('/blog/categories')
};

// Simulation API
export const simulationApi = {
  // Starts a real engine run (persisted in MongoDB and queued through RabbitMQ).
  start: (configuration) => request('/simulations/start', {
    method: 'POST',
    body: JSON.stringify(configuration)
  }),
  // Newest-first list of persisted simulation configurations.
  history: () => request('/simulations/history'),
  // Stored final result for one run (throws a 404 error when it does not exist yet).
  result: (simulationId) => request(`/simulations/${simulationId}/result`),
  // Configuration + status + optional result in one payload.
  get: (simulationId) => request(`/simulations/${simulationId}`),
  // Archived exp1-exp6 datasets produced by Phase13ResearchExperiments.
  researchList: () => request('/simulations/research'),
  researchDocument: (file) => request(`/simulations/research/${encodeURIComponent(file)}`),
  // Repeats one configuration with an ordered seed list (existing endpoint).
  runExperiment: (configuration, seeds) => request('/simulations/experiment', {
    method: 'POST',
    body: JSON.stringify({ configuration, seeds })
  }),
  // Runs a named baseline and treatments with one shared ordered seed list.
  compareExperiment: ({ baseline, treatments, seeds }) => request('/simulations/experiment/compare', {
    method: 'POST',
    body: JSON.stringify({ baseline, treatments, seeds })
  })
};
