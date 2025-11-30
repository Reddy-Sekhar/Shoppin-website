import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register, reset } from '../../redux/slices/authSlice';
import { ShoppingBag, Loader2, CheckCircle2 } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        company: '',
        role: 'BUYER',
    });
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('Your registration is successful!');
    const [submittedRole, setSubmittedRole] = useState('BUYER');

    const { name, email, password, phone, company, role } = formData;

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { isLoading, isError, isSuccess, message } = useSelector(
        (state) => state.auth
    );

    // Handle success and navigation
    useEffect(() => {
        if (isSuccess) {
            const messageCopy = submittedRole === 'BUYER'
                ? 'Registration successful! Redirecting to login...'
                : 'Application submitted! We will email you after review.';
            setSuccessMessage(messageCopy);
            setShowSuccessModal(true);
            const timer = setTimeout(() => {
                setShowSuccessModal(false);
                dispatch(reset());
                navigate('/login');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isSuccess, navigate, dispatch, submittedRole]);

    // Handle errors and cleanup
    useEffect(() => {
        if (isError) {
            console.error(message);
        }

        // Cleanup on unmount
        return () => {
            dispatch(reset());
        };
    }, [isError, message, dispatch]);

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = (e) => {
        e.preventDefault();

        const nameParts = name.trim().split(' ');
        const first_name = nameParts[0] || '';
        const last_name = nameParts.slice(1).join(' ') || '';

        const userData = {
            username: email.split('@')[0],
            email,
            password,
            first_name,
            last_name,
            phone,
            company,
            role,
        };
        setSubmittedRole(role);
        dispatch(register(userData));
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-10">
                <div className="text-center">
                    <div className="flex justify-center">
                        <ShoppingBag className="h-12 w-12 text-accent" />
                    </div>
                    <h2 className="mt-8 text-3xl md:text-4xl font-extrabold text-gray-900">
                        Create your Prime Apparel account
                    </h2>
                    <p className="mt-4 text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-accent hover:text-accent-dark">
                            Sign in
                        </Link>
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                        Seller & Designer accounts require admin approval before they can log in.
                    </p>
                </div>
                <form className="mt-10 space-y-6" onSubmit={onSubmit}>
                    <div className="space-y-4">
                        <div>
                            <input
                                type="text"
                                name="name"
                                value={name}
                                onChange={onChange}
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm transition-all"
                                placeholder="Full Name"
                            />
                        </div>
                        <div>
                            <input
                                type="email"
                                name="email"
                                value={email}
                                onChange={onChange}
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm transition-all"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                name="company"
                                value={company}
                                onChange={onChange}
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm transition-all"
                                placeholder="Company Name (Optional)"
                            />
                        </div>
                        <div>
                            <input
                                type="tel"
                                name="phone"
                                value={phone}
                                onChange={onChange}
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm transition-all"
                                placeholder="Phone Number (Optional)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Account Type</label>
                            <select
                                name="role"
                                value={role}
                                onChange={onChange}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                            >
                                <option value="BUYER">Buyer</option>
                                <option value="SELLER">Seller (requires approval)</option>
                                <option value="DESIGNER">Designer (requires approval)</option>
                            </select>
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

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-bold rounded-lg text-primary bg-accent hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all shadow-lg"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Register'}
                        </button>
                    </div>
                </form>

                {showSuccessModal && (
                    <div className="fixed top-4 right-4 z-50">
                        <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 animate-bounce">
                            <CheckCircle2 className="h-6 w-6" />
                            <div>
                                <p className="font-semibold">{successMessage}</p>
                                <p className="text-sm text-green-100">
                                    {submittedRole === 'BUYER'
                                        ? 'Redirecting to login...'
                                        : 'We will notify you once an admin reviews your account.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Register;
