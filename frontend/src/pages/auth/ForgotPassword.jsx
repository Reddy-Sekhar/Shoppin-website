import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Loader2, CheckCircle2, RefreshCcw } from 'lucide-react';

import {
    requestPasswordReset,
    verifyPasswordResetOtp,
    confirmPasswordReset,
} from '../../api';

const STEPS = {
    REQUEST: 'request',
    VERIFY: 'verify',
    RESET: 'reset',
    SUCCESS: 'success',
};

const STEP_META = {
    [STEPS.REQUEST]: {
        progress: 'Step 1 of 3',
        title: 'Reset your password',
        subtitle: 'Enter the email linked to your account to get started.',
    },
    [STEPS.VERIFY]: {
        progress: 'Step 2 of 3',
        title: 'Check your inbox',
        subtitle: 'Enter the 6-digit code we just emailed you.',
    },
    [STEPS.RESET]: {
        progress: 'Step 3 of 3',
        title: 'Choose a new password',
        subtitle: 'Create a secure password to finish resetting your account.',
    },
};

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(STEPS.REQUEST);
    const [formData, setFormData] = useState({
        email: '',
        otp: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [resetToken, setResetToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown <= 0) {
            return undefined;
        }

        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [resendCooldown]);

    useEffect(() => {
        if (step !== STEPS.SUCCESS) {
            return undefined;
        }

        const timeout = setTimeout(() => navigate('/login'), 2000);
        return () => clearTimeout(timeout);
    }, [step, navigate]);

    const extractError = (err) => (
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        'Something went wrong. Please try again.'
    );

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleOtpInput = (value) => {
        if (/^\d{0,6}$/.test(value)) {
            setFormData((prev) => ({ ...prev, otp: value }));
            setError('');
        }
    };

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        const email = formData.email.trim();

        if (!email) {
            setError('Please enter the email associated with your account.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await requestPasswordReset({ email });
            setInfo(`We sent a 6-digit code to ${email}. Check your inbox and spam folder.`);
            setStep(STEPS.VERIFY);
            setFormData((prev) => ({ ...prev, otp: '', newPassword: '', confirmPassword: '' }));
            setResetToken('');
            setResendCooldown(60);
        } catch (err) {
            setError(extractError(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const email = formData.email.trim();
        const otp = formData.otp.trim();

        if (otp.length !== 6) {
            setError('Enter the 6-digit code sent to your email.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { data } = await verifyPasswordResetOtp({ email, otp });
            setResetToken(data.reset_token);
            setInfo('OTP verified. You can now set a new password.');
            setStep(STEPS.RESET);
            setFormData((prev) => ({ ...prev, otp: '', newPassword: '', confirmPassword: '' }));
        } catch (err) {
            setError(extractError(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const email = formData.email.trim();
        const { newPassword, confirmPassword } = formData;

        if (!resetToken) {
            setError('Please verify the OTP before setting a new password.');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await confirmPasswordReset({
                email,
                token: resetToken,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            setInfo('');
            setStep(STEPS.SUCCESS);
        } catch (err) {
            setError(extractError(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0 || isResending) {
            return;
        }

        const email = formData.email.trim();
        if (!email) {
            setError('Please enter your email address first.');
            setStep(STEPS.REQUEST);
            return;
        }

        setError('');
        setIsResending(true);

        try {
            await requestPasswordReset({ email });
            setInfo(`A fresh OTP was sent to ${email}.`);
            setResendCooldown(60);
        } catch (err) {
            setError(extractError(err));
        } finally {
            setIsResending(false);
        }
    };

    const handleBackToEmail = () => {
        setStep(STEPS.REQUEST);
        setInfo('');
        setError('');
        setResetToken('');
        setFormData((prev) => ({ ...prev, otp: '', newPassword: '', confirmPassword: '' }));
        setResendCooldown(0);
    };

    if (step === STEPS.SUCCESS) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full text-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Password reset successful</h2>
                    <p className="text-gray-600 mb-4">
                        Your password has been updated. Redirecting you to the login screen...
                    </p>
                    <p className="text-sm text-gray-500">If you are not redirected automatically, you can close this tab.</p>
                </div>
            </div>
        );
    }

    const { progress, title, subtitle } = STEP_META[step] ?? {};

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <ShoppingBag className="h-12 w-12 text-accent" />
                    </div>
                    {progress && (
                        <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">{progress}</p>
                    )}
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">{title}</h2>
                    <p className="text-sm text-gray-600">{subtitle}</p>
                    {step !== STEPS.REQUEST && (
                        <p className="text-xs text-gray-500">Using email <span className="font-semibold">{formData.email}</span></p>
                    )}
                </div>

                {info && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                        {info}
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                        <strong className="font-semibold mr-1">Error:</strong>
                        {error}
                    </div>
                )}

                {step === STEPS.REQUEST && (
                    <form className="space-y-6" onSubmit={handleRequestOtp}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email address
                            </label>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                autoComplete="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm transition-all"
                                placeholder="you@example.com"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-bold rounded-lg text-primary bg-accent hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all shadow-lg"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === STEPS.VERIFY && (
                    <form className="space-y-6" onSubmit={handleVerifyOtp}>
                        <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                                6-digit verification code
                            </label>
                            <input
                                type="text"
                                name="otp"
                                id="otp"
                                inputMode="numeric"
                                maxLength={6}
                                value={formData.otp}
                                onChange={(e) => handleOtpInput(e.target.value)}
                                required
                                className="tracking-widest text-center uppercase appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-lg transition-all"
                                placeholder="••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-bold rounded-lg text-primary bg-accent hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all shadow-lg"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verify OTP'}
                        </button>

                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={isResending || resendCooldown > 0}
                                className="inline-flex items-center gap-2 font-medium text-accent hover:text-accent-dark disabled:opacity-60"
                            >
                                <RefreshCcw className="h-4 w-4" />
                                {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                            </button>
                            <button
                                type="button"
                                onClick={handleBackToEmail}
                                className="font-medium text-gray-500 hover:text-gray-700"
                            >
                                Change email
                            </button>
                        </div>
                    </form>
                )}

                {step === STEPS.RESET && (
                    <form className="space-y-6" onSubmit={handleResetPassword}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    New password
                                </label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    id="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    minLength={6}
                                    required
                                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm transition-all"
                                    placeholder="At least 6 characters"
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm password
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    id="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    minLength={6}
                                    required
                                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm transition-all"
                                    placeholder="Re-enter your new password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-bold rounded-lg text-primary bg-accent hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all shadow-lg"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Update password'}
                        </button>
                    </form>
                )}

                <div className="text-center">
                    <Link to="/login" className="text-sm font-medium text-accent hover:text-accent-dark transition-colors">
                        Back to sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
