import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import {
    fetchCurrentUser,
    updateProfile,
    changePassword,
    reset as resetAuthState,
} from '../redux/slices/authSlice';

const emptyProfileState = {
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
};

const emptyPasswordState = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
};

const Profile = () => {
    const dispatch = useDispatch();
    const {
        user,
        profileStatus,
        profileMessage,
        profileError,
        passwordStatus,
        passwordMessage,
        passwordError,
    } = useSelector((state) => state.auth);

    const [profileForm, setProfileForm] = useState(emptyProfileState);
    const [passwordForm, setPasswordForm] = useState(emptyPasswordState);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [removeAvatar, setRemoveAvatar] = useState(false);
    const [localPasswordError, setLocalPasswordError] = useState('');

    useEffect(() => {
        if (avatarFile && avatarPreview && avatarPreview.startsWith('blob:')) {
            return () => {
                URL.revokeObjectURL(avatarPreview);
            };
        }
        return undefined;
    }, [avatarFile, avatarPreview]);

    useEffect(() => {
        dispatch(fetchCurrentUser());

        return () => {
            dispatch(resetAuthState());
        };
    }, [dispatch]);

    useEffect(() => {
        if (!user) return;
        setProfileForm({
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            phone: user.phone || '',
            company: user.company || '',
        });
        setAvatarPreview(user.avatar || null);
        setAvatarFile(null);
        setRemoveAvatar(false);
    }, [user]);

    useEffect(() => {
        if (passwordStatus === 'succeeded') {
            setPasswordForm(emptyPasswordState);
        }
    }, [passwordStatus]);

    const fullName = useMemo(() => {
        if (!user) return '';
        const composed = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        return composed.length ? composed : user.username || user.email || 'User';
    }, [user]);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        setRemoveAvatar(false);
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
    };

    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(null);
        setRemoveAvatar(true);
    };

    const handleProfileSubmit = (event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append('first_name', profileForm.firstName.trim());
        formData.append('last_name', profileForm.lastName.trim());
        formData.append('phone', profileForm.phone.trim());
        formData.append('company', profileForm.company.trim());
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }
        if (removeAvatar) {
            formData.append('remove_avatar', 'true');
        }
        dispatch(updateProfile(formData));
    };

    const handlePasswordSubmit = (event) => {
        event.preventDefault();
        setLocalPasswordError('');

        if (!passwordForm.currentPassword || !passwordForm.newPassword) {
            setLocalPasswordError('Please fill in both current and new password fields.');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setLocalPasswordError('New password and confirm password must match.');
            return;
        }

        dispatch(
            changePassword({
                old_password: passwordForm.currentPassword,
                new_password: passwordForm.newPassword,
            })
        );
    };

    const isProfileLoading = profileStatus === 'loading';
    const isPasswordLoading = passwordStatus === 'loading';

    return (
        <div className="space-y-10">
            <div className="rounded-3xl bg-white shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 px-8 py-10 text-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="h-28 w-28 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Profile avatar"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-3xl font-heading font-semibold uppercase">
                                            {fullName.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                <label className="absolute -bottom-3 -right-3 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-primary shadow-lg shadow-accent/40 cursor-pointer hover:-translate-y-0.5 transition-transform">
                                    <Camera className="h-4 w-4" />
                                    Change
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                </label>
                            </div>
                            <div>
                                <p className="uppercase tracking-[0.5em] text-xs text-white/70 font-semibold">
                                    Profile Center
                                </p>
                                <h1 className="mt-2 text-3xl font-heading font-bold">{fullName}</h1>
                                <p className="mt-2 text-sm text-white/70">
                                    {user?.email}
                                </p>
                                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                                    <ShieldCheck className="h-4 w-4 text-amber-300" />
                                    {user?.roleLabel || user?.role}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {avatarPreview && (
                                <button
                                    type="button"
                                    onClick={handleRemoveAvatar}
                                    className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
                                >
                                    Remove Photo
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleProfileSubmit} className="px-8 py-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                            <input
                                type="text"
                                name="firstName"
                                value={profileForm.firstName}
                                onChange={handleProfileChange}
                                autoComplete="given-name"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 focus:border-accent focus:ring-2 focus:ring-accent/40 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                            <input
                                type="text"
                                name="lastName"
                                value={profileForm.lastName}
                                onChange={handleProfileChange}
                                autoComplete="family-name"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 focus:border-accent focus:ring-2 focus:ring-accent/40 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={profileForm.phone}
                                onChange={handleProfileChange}
                                autoComplete="tel"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 focus:border-accent focus:ring-2 focus:ring-accent/40 transition"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                            <input
                                type="text"
                                name="company"
                                value={profileForm.company}
                                onChange={handleProfileChange}
                                autoComplete="organization"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 focus:border-accent focus:ring-2 focus:ring-accent/40 transition"
                            />
                        </div>
                    </div>

                    {profileError && (
                        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>{profileError}</span>
                        </div>
                    )}

                    {profileMessage && profileStatus === 'succeeded' && (
                        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{profileMessage}</span>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isProfileLoading}
                            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-primary shadow-lg shadow-accent/30 hover:-translate-y-0.5 transition disabled:opacity-50"
                        >
                            {isProfileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {isProfileLoading ? 'Updating...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="rounded-3xl bg-white shadow-xl border border-slate-100 overflow-hidden">
                <div className="border-b border-slate-100 px-8 py-6">
                    <h2 className="text-xl font-heading font-semibold text-primary">Update Password</h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Create a strong password to keep your account secure.
                    </p>
                </div>
                <form onSubmit={handlePasswordSubmit} className="px-8 py-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Current Password</label>
                            <input
                                type="password"
                                name="currentPassword"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                                autoComplete="current-password"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/40 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                                autoComplete="new-password"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/40 transition"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                autoComplete="new-password"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/40 transition"
                            />
                        </div>
                    </div>

                    {(localPasswordError || passwordError) && (
                        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>{localPasswordError || passwordError}</span>
                        </div>
                    )}

                    {passwordMessage && passwordStatus === 'succeeded' && (
                        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{passwordMessage}</span>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isPasswordLoading}
                            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition disabled:opacity-50"
                        >
                            {isPasswordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {isPasswordLoading ? 'Updating...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
