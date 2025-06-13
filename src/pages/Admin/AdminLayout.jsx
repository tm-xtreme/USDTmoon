import React, { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import AdminLoginPage from '@/pages/Admin/AdminLoginPage';
import AdminDashboardPage from '@/pages/Admin/AdminDashboardPage';

const AdminLayout = () => {
    const { isLoggedIn, login, logout, loading } = useAdmin();
    const [error, setError] = useState('');

    const handleLogin = async (password) => {
        try {
            const success = await login(password);
            if (success) {
                setError('');
            } else {
                setError('Invalid password. Please try again.');
            }
        } catch (error) {
            setError('Login failed. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }
    
    return isLoggedIn ? (
        <AdminDashboardPage onLogout={logout} />
    ) : (
        <AdminLoginPage onLogin={handleLogin} error={error} />
    );
};

export default AdminLayout;
