import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import {
    fetchCurrentUser as fetchCurrentUserRequest,
    updateUserProfile as updateUserProfileRequest,
    changePassword as changePasswordRequest,
} from '../../api';

const normalizeUser = (rawUser) => {
    if (!rawUser) return null;

    const roleSource = rawUser.role ?? rawUser.role_label ?? rawUser.roleLabel ?? '';
    const normalizedRole = roleSource ? roleSource.toString().trim().toUpperCase() : '';
    const formattedLabel = rawUser.role_label
        || rawUser.roleLabel
        || (normalizedRole
            ? `${normalizedRole.charAt(0)}${normalizedRole.slice(1).toLowerCase()}`
            : '');

    return {
        ...rawUser,
        role: normalizedRole,
        roleLabel: formattedLabel,
    };
};

const extractErrorMessage = (error) => {
    if (error?.response) {
        const data = error.response.data;
        if (typeof data === 'string') {
            return data;
        }
        if (data?.message) {
            return data.message;
        }
        if (data?.detail) {
            return data.detail;
        }
        if (data && typeof data === 'object') {
            const firstKey = Object.keys(data)[0];
            if (firstKey) {
                const value = data[firstKey];
                if (Array.isArray(value)) {
                    return value[0];
                }
                if (typeof value === 'string') {
                    return value;
                }
            }
        }
    }
    return error?.message || error?.toString() || 'Something went wrong';
};

// Get user from localStorage
const user = normalizeUser(JSON.parse(localStorage.getItem('user')));

const initialState = {
    user: user ? user : null,
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
    profileStatus: 'idle',
    profileMessage: '',
    profileError: '',
    passwordStatus: 'idle',
    passwordMessage: '',
    passwordError: '',
};

// Register user
export const register = createAsyncThunk(
    'auth/register',
    async (user, thunkAPI) => {
        try {
            // Django registration endpoint
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register/`, user);

            // Don't auto-login after registration
            // User will login manually
            return { success: true, message: 'Registration successful' };
        } catch (error) {
            const message = extractErrorMessage(error);
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Login user
export const login = createAsyncThunk('auth/login', async (user, thunkAPI) => {
    try {
        // Django login endpoint
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login/`, user);

        if (response.data) {
            // Django returns {access, refresh, user}
            // Store user data with tokens
            const userPayload = {
                ...response.data.user,
                token: response.data.access,  // JWT access token
                refreshToken: response.data.refresh  // JWT refresh token
            };
            const userData = normalizeUser(userPayload);
            localStorage.setItem('user', JSON.stringify(userData));
            return userData;
        }

        return response.data;
    } catch (error) {
        const message = extractErrorMessage(error);
        return thunkAPI.rejectWithValue(message);
    }
});

// Logout user
export const logout = createAsyncThunk('auth/logout', async () => {
    localStorage.removeItem('user');
});

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async (_, thunkAPI) => {
    try {
        const response = await fetchCurrentUserRequest();
        return response.data;
    } catch (error) {
        const message = extractErrorMessage(error);
        if (error.response?.status === 401) {
            localStorage.removeItem('user');
        }
        return thunkAPI.rejectWithValue(message);
    }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (formData, thunkAPI) => {
    try {
        const response = await updateUserProfileRequest(formData);
        return response.data;
    } catch (error) {
        const message = extractErrorMessage(error);
        return thunkAPI.rejectWithValue(message);
    }
});

export const changePassword = createAsyncThunk('auth/changePassword', async (payload, thunkAPI) => {
    try {
        const response = await changePasswordRequest(payload);
        return response.data;
    } catch (error) {
        const message = extractErrorMessage(error);
        return thunkAPI.rejectWithValue(message);
    }
});

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        reset: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
            state.profileStatus = 'idle';
            state.profileMessage = '';
            state.profileError = '';
            state.passwordStatus = 'idle';
            state.passwordMessage = '';
            state.passwordError = '';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(register.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(register.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Don't set user - they need to login manually
                state.user = null;
            })
            .addCase(register.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.user = null;
            })
            .addCase(login.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload;
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.user = null;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
            })
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                const tokens = state.user
                    ? { token: state.user.token, refreshToken: state.user.refreshToken }
                    : {};
                const updatedUser = normalizeUser({ ...action.payload, ...tokens });
                state.user = updatedUser;
                localStorage.setItem('user', JSON.stringify(updatedUser));
                state.profileError = '';
                if (state.profileStatus === 'failed') {
                    state.profileStatus = 'idle';
                }
            })
            .addCase(fetchCurrentUser.rejected, (state, action) => {
                state.profileStatus = 'failed';
                state.profileError = action.payload;
                if (!localStorage.getItem('user')) {
                    state.user = null;
                }
            })
            .addCase(updateProfile.pending, (state) => {
                state.profileStatus = 'loading';
                state.profileMessage = '';
                state.profileError = '';
            })
            .addCase(updateProfile.fulfilled, (state, action) => {
                state.profileStatus = 'succeeded';
                state.profileMessage = 'Profile updated successfully';
                const tokens = state.user
                    ? { token: state.user.token, refreshToken: state.user.refreshToken }
                    : {};
                const updatedUser = normalizeUser({ ...action.payload, ...tokens });
                state.user = updatedUser;
                localStorage.setItem('user', JSON.stringify(updatedUser));
            })
            .addCase(updateProfile.rejected, (state, action) => {
                state.profileStatus = 'failed';
                state.profileError = action.payload;
            })
            .addCase(changePassword.pending, (state) => {
                state.passwordStatus = 'loading';
                state.passwordMessage = '';
                state.passwordError = '';
            })
            .addCase(changePassword.fulfilled, (state, action) => {
                state.passwordStatus = 'succeeded';
                state.passwordMessage = action.payload?.message || 'Password updated successfully';
            })
            .addCase(changePassword.rejected, (state, action) => {
                state.passwordStatus = 'failed';
                state.passwordError = action.payload;
            });
    },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;
