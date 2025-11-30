import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user } = useSelector((state) => state.auth);
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles) {
        const normalizedRole = user?.role ? user.role.toString().trim().toUpperCase() : '';
        const normalizedAllowed = allowedRoles.map((role) => role.toString().trim().toUpperCase());

        if (!normalizedRole || !normalizedAllowed.includes(normalizedRole)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
