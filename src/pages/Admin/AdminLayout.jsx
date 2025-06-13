import React, { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import AdminLoginPage from '@/pages/Admin/AdminLoginPage';
import AdminDashboardPage from '@/pages/Admin/AdminDashboardPage';

const AdminLayout = () => {
    const { isLoggedIn, login, logout, loading, resetPassword, adminEmail } = useAdmin();
    const [error, setError] = useState('');

    const handleLogin = async (email, password) => {
        try {
            const result = await login(email, password);
            if (result.success) {
                setError('');
            } else {
                setError(result.error || 'Invalid credentials. Please try again.');
            }
        } catch (error) {
            setError('Login failed. Please try again.');
        }
    };

    const handleResetPassword = async (email) => {
        try {
            const result = await resetPassword(email);
            if (!result.success) {
                setError(result.error);
            } else {
                setError('');
            }
        } catch (error) {
            setError('Failed to send password reset email. Please try again.');
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
        <AdminLoginPage 
            onLogin={handleLogin} 
            error={error} 
            onResetPassword={handleResetPassword} 
            adminEmail={adminEmail} // Pass the admin email for pre-filling
        />
    );
};

export default AdminLayout;
