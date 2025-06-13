import React, { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import AdminLoginPage from '@/pages/Admin/AdminLoginPage';
import AdminDashboardPage from '@/pages/Admin/AdminDashboardPage';

const AdminLayout = () => {
    const { isLoggedIn, login, logout } = useAdmin();
    const [error, setError] = useState('');

    const handleLogin = (password) => {
        if (login(password)) {
            setError('');
        } else {
            setError('Invalid password. Please note this is for UI demonstration only and not secure.');
        }
    };
    
    return isLoggedIn ? (
        <AdminDashboardPage onLogout={logout} />
    ) : (
        <AdminLoginPage onLogin={handleLogin} error={error} />
    );
};

export default AdminLayout;