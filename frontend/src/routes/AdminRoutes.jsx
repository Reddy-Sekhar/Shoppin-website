import { Route, Routes } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import Dashboard from '../pages/Dashboard';
import Profile from '../pages/Profile';
import SellerProducts from '../pages/SellerProducts';
import UserManagement from '../pages/UserManagement';

const AdminRoutes = () => {
    return (
        <Routes>
            <Route element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="ledger" element={<div className="p-8">Financial Ledger (Coming Soon)</div>} />
                <Route path="analytics" element={<div className="p-8">Analytics (Coming Soon)</div>} />
                <Route path="settings" element={<div className="p-8">System Settings (Coming Soon)</div>} />
                <Route path="products" element={<SellerProducts title="Manage Products" />} />
                <Route path="profile" element={<Profile />} />
            </Route>
        </Routes>
    );
};

export default AdminRoutes;
