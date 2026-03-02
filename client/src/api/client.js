const API_BASE = '/api';

function getToken() {
    return localStorage.getItem('md_viewer_token');
}

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    if (res.status === 401) {
        localStorage.removeItem('md_viewer_token');
        localStorage.removeItem('md_viewer_user');
        window.location.href = '/';
        throw new Error('Unauthorized');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

export const api = {
    // Auth
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    signup: (email, name, password) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, name, password }) }),
    me: () => request('/auth/me'),
    changePassword: (currentPassword, newPassword) => request('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),

    // Collections
    getCollections: () => request('/collections'),
    createCollection: (name, description) => request('/collections', { method: 'POST', body: JSON.stringify({ name, description }) }),
    updateCollection: (id, data) => request(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCollection: (id) => request(`/collections/${id}`, { method: 'DELETE' }),

    // Folders
    getTree: (collectionId) => request(`/folders/collection/${collectionId}`),
    createFolder: (name, collection_id, parent_folder_id) => request('/folders', { method: 'POST', body: JSON.stringify({ name, collection_id, parent_folder_id }) }),
    renameFolder: (id, name) => request(`/folders/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
    deleteFolder: (id) => request(`/folders/${id}`, { method: 'DELETE' }),

    // Files
    getFile: (id) => request(`/files/${id}`),
    createFile: (name, folder_id) => request('/files', { method: 'POST', body: JSON.stringify({ name, folder_id }) }),
    updateFile: (id, data) => request(`/files/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteFile: (id) => request(`/files/${id}`, { method: 'DELETE' }),
    searchFiles: (collectionId, query) => request(`/files/search/${collectionId}?q=${encodeURIComponent(query)}`),

    // Bookmarks
    getBookmarks: () => request('/bookmarks'),
    toggleBookmark: (file_id, folder_id) => request('/bookmarks/toggle', { method: 'POST', body: JSON.stringify({ file_id, folder_id }) }),

    // Upload
    uploadImage: async (file) => {
        const token = getToken();
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
    },

    // Admin
    getUsers: () => request('/admin/users'),
    updateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
    createUser: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
};
