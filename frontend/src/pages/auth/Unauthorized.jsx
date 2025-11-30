import { Link } from 'react-router-dom';
import { ShieldAlert, Home, RefreshCcw } from 'lucide-react';

const Unauthorized = () => {
    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-6 py-16">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
                <div className="absolute bottom-10 right-10 w-64 h-64 bg-primary/5 rounded-full blur-2xl" />
            </div>

            <div className="relative w-full max-w-3xl bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl shadow-xl overflow-hidden">
                <div className="grid md:grid-cols-[1fr,1.2fr] gap-0">
                    <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white p-10">
                        <div className="rounded-2xl bg-white/10 border border-white/20 p-6">
                            <ShieldAlert className="h-16 w-16 text-amber-300" />
                        </div>
                        <h2 className="mt-6 text-2xl font-heading font-semibold">Restricted Area</h2>
                        <p className="mt-3 text-sm text-white/80 text-center leading-relaxed">
                            Your account does not have the required permissions to access this section of the platform.
                        </p>
                    </div>

                    <div className="p-10 md:p-12">
                        <div className="flex items-center gap-3 text-amber-500 font-semibold uppercase tracking-[0.3em] text-xs">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Access Denied
                        </div>
                        <h1 className="mt-6 text-4xl md:text-5xl font-heading font-bold text-slate-900 leading-tight">
                            You don&apos;t have permission
                        </h1>
                        <p className="mt-5 text-base text-slate-600 leading-relaxed">
                            This page is reserved for specific user roles. If you believe this is a mistake, please contact your administrator or switch to an authorized account.
                        </p>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-accent/50" />
                                Quick actions
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Link
                                    to="/"
                                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-primary shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
                                >
                                    <Home className="h-4 w-4" />
                                    Return to Home
                                </Link>
                                <Link
                                    to="/login"
                                    className="flex items-center justify-center gap-2 rounded-xl bg-primary text-white px-5 py-3 text-sm font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    Login with another account
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
