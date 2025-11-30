import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { login, reset } from '../../redux/slices/authSlice';
import { ShoppingBag, Loader2 } from 'lucide-react';

const Login = () => {
    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
    });
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

    useEffect(() => {
        if (!siteKey) return;
        // load reCAPTCHA script for v3
        const id = 'recaptcha-v3-script';
        if (document.getElementById(id)) return;
        const s = document.createElement('script');
        s.id = id;
        s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
        s.async = true;
        s.defer = true;
        document.head.appendChild(s);
        return () => {
            // keep script around for single page app; do not remove
        };
    }, [siteKey]);

    const { identifier, password } = formData;

    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const { user, isLoading, isError, isSuccess, message } = useSelector(
        (state) => state.auth
    );

    const getDefaultRoute = (roleKey) => {
        switch (roleKey) {
            case 'ADMIN':
                return '/admin';
            case 'SELLER':
                return '/seller';
            case 'DESIGNER':
                return '/designer';
            case 'BUYER':
                return '/buyer';
            default:
                return '/';
        }
    };

    const canAccessPath = (roleKey, target) => {
        if (!roleKey || !target) return false;
        const path = typeof target === 'string' ? target : target.pathname || '';
        const normalizedPath = path.toLowerCase();

        const roleAccessMap = {
            ADMIN: ['/admin', '/seller', '/designer', '/buyer'],
            SELLER: ['/seller'],
            DESIGNER: ['/designer'],
            BUYER: ['/buyer'],
        };

        return roleAccessMap[roleKey]?.some((prefix) => normalizedPath.startsWith(prefix)) ?? false;
    };

    useEffect(() => {
        if (isError) {
            // Toast error (placeholder)
            console.error(message);
        }

        if (isSuccess || user) {
            const roleKey = user?.role ? user.role.toString().trim().toUpperCase() : '';
            const redirectTarget = location.state?.from;

            if (redirectTarget && canAccessPath(roleKey, redirectTarget)) {
                navigate(typeof redirectTarget === 'string' ? redirectTarget : redirectTarget.pathname, { replace: true });
            } else {
                navigate(getDefaultRoute(roleKey), { replace: true });
            }
        }

        dispatch(reset());
    }, [user, isError, isSuccess, message, navigate, dispatch, location.state]);

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = (e) => {
        e.preventDefault();
        const cleanIdentifier = identifier.trim();
        const userData = {
            identifier: cleanIdentifier,
            password,
        };
        if (cleanIdentifier && cleanIdentifier.includes('@')) {
            userData.email = cleanIdentifier;
        }
        // If reCAPTCHA site key is configured, execute and include token
        if (siteKey && window.grecaptcha && typeof window.grecaptcha.execute === 'function') {
            window.grecaptcha.ready(() => {
                window.grecaptcha.execute(siteKey, { action: 'login' }).then((token) => {
                    userData.captcha = token;
                    dispatch(login(userData));
                }).catch(() => {
                    // fallback to normal submit without captcha token
                    dispatch(login(userData));
                });
            });
        } else {
            dispatch(login(userData));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-10">
                <div className="text-center">
                    <div className="flex justify-center">
                        <ShoppingBag className="h-12 w-12 text-accent" />
                    </div>
                    <h2 className="mt-8 text-3xl md:text-4xl font-extrabold text-gray-900">
                        Sign in to your account
                    </h2>
                    <p className="mt-4 text-sm text-gray-600">
                        Or{' '}
                        <Link to="/register" className="font-medium text-accent hover:text-accent-dark">
                            create a new buyer account
                        </Link>
                    </p>
                </div>
                <form className="mt-10 space-y-6" onSubmit={onSubmit}>
                    <div className="space-y-4">
                        <div>
                            <input
                                type="text"
                                name="identifier"
                                value={identifier}
                                onChange={onChange}
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm transition-all"
                                placeholder="Email address or username"
                                autoComplete="username"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                name="password"
                                value={password}
                                onChange={onChange}
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm transition-all"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    {isError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <strong className="font-bold">Error! </strong>
                            <span className="block sm:inline">{message}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm">
                            <Link
                                to="/forgot-password"
                                className="font-medium text-accent hover:text-accent-dark transition-colors"
                            >
                                Forgot your password?
                            </Link>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-bold rounded-lg text-primary bg-accent hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all shadow-lg"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
