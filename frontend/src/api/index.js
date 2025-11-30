import axios from 'axios';

const API = axios.create({
    baseURL: `${import.meta.env.VITE_API_BASE_URL}/api`,  // Changed from 5000 to 8000 for Django
});

API.interceptors.request.use((req) => {
    if (localStorage.getItem('user')) {
        const user = JSON.parse(localStorage.getItem('user'));
        req.headers.Authorization = `Bearer ${user.token}`;
    }
    return req;
});

// Simple in-memory dedupe for identical GET requests while a request is in-flight.
// Keyed by URL (including query string). Returns the original promise if
// the same request is already pending.
const inFlightGets = new Map();

const dedupedGet = (url, config) => {
    const key = url + (config && config.params ? JSON.stringify(config.params) : '');
    if (inFlightGets.has(key)) {
        return inFlightGets.get(key);
    }
    const promise = API.get(url, config)
        .then((res) => res)
        .catch((err) => { throw err; })
        .finally(() => {
            inFlightGets.delete(key);
        });
    inFlightGets.set(key, promise);
    return promise;
};

export const createLead = (leadData) => API.post('/leads/', leadData);
export const fetchLeads = () => dedupedGet('/leads/');
export const fetchMyLeads = () => dedupedGet('/leads/my-leads/');
export const updateLead = (id, leadData) => API.patch(`/leads/${id}/`, leadData);
export const createProduct = (productData) => API.post('/products/', productData);

// Upload product images using fetch API (more reliable for FormData)
export const uploadProductImages = async (formData) => {
    const user = localStorage.getItem('user');
    const headers = {};
    if (user) {
        const userObj = JSON.parse(user);
        headers.Authorization = `Bearer ${userObj.token}`;
    }
    
    // Use fetch instead of axios for FormData - it handles multipart/form-data correctly
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/products/upload-image/`, {
        method: 'POST',
        headers: headers,
        body: formData, // Let browser set Content-Type with boundary
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw {
            response: { data, status: response.status }
        };
    }
    
    return { data };
};

export const fetchProducts = (params) => dedupedGet('/products/', { params });
export const fetchMyProducts = () => API.get('/products/my-products/');
export const updateProduct = (id, data) => API.patch(`/products/${id}/`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}/`);

// Admin user management
export const adminFetchUsers = (params) => dedupedGet('/users/manage/', { params });
export const adminUpdateUser = (id, payload) => API.patch(`/users/manage/${id}/`, payload);
export const adminDeleteUser = (id) => API.delete(`/users/manage/${id}/`);

export const fetchCurrentUser = () => API.get('/auth/me/');
export const updateUserProfile = (formData) => API.patch('/auth/me/', formData);
export const changePassword = (payload) => API.post('/auth/change-password/', payload);
export const requestPasswordReset = (payload) => API.post('/auth/password-reset/request/', payload);
export const verifyPasswordResetOtp = (payload) => API.post('/auth/password-reset/verify/', payload);
export const confirmPasswordReset = (payload) => API.post('/auth/password-reset/confirm/', payload);

export default API;
