import React, { useState, useEffect } from 'react';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  getAllTasks, 
  addTask as addTaskToFirebase, 
  updateTask as updateTaskInFirebase, 
  deleteTask as deleteTaskFromFirebase,
  getPendingWithdrawals,
  getPendingDeposits,
  updateWithdrawalStatus,
  updateDepositStatus,
  updateUserData,
  getUserData,
  addTransaction,
  getAdminStats,
  getAllUsers,
  getPendingTaskSubmissions,
  getAllWithdrawals,
  getAllDeposits,
  approveTaskSubmission as approveTaskSubmissionFirebase,
  rejectTaskSubmission as rejectTaskSubmissionFirebase,
  subscribeToAdminData,
  subscribeToAdminStats,
  approveWithdrawal as approveWithdrawalFirebase,
  rejectWithdrawal as rejectWithdrawalFirebase,
  approveDeposit as approveDepositFirebase,
  rejectDeposit as rejectDepositFirebase,
  getAnalytics
} from '@/lib/firebaseService';

const ADMIN_EMAIL = "admin@moonusdt.com";
const ADMIN_STORAGE_KEY = "moonusdt_admin_session";

export const useAdmin = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminStats, setAdminStats] = useState({
        totalUsers: 0,
        totalTasks: 0,
        pendingWithdrawals: 0,
        pendingDeposits: 0,
        pendingTasks: 0
    });
    const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
    const [pendingDeposits, setPendingDeposits] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [withdrawalHistory, setWithdrawalHistory] = useState([]);
    const [depositHistory, setDepositHistory] = useState([]);
    const [pendingTaskSubmissions, setPendingTaskSubmissions] = useState([]);
    const [analytics, setAnalytics] = useState(null);

    // Debug logging
    useEffect(() => {
        console.log('Admin Hook State Update:', {
            isLoggedIn,
            pendingTaskSubmissions: pendingTaskSubmissions?.length || 0,
            pendingWithdrawals: pendingWithdrawals?.length || 0,
            pendingDeposits: pendingDeposits?.length || 0,
            adminStats
        });
    }, [isLoggedIn, pendingTaskSubmissions, pendingWithdrawals, pendingDeposits, adminStats]);

    // Check localStorage for admin session on component mount
    useEffect(() => {
        const checkAdminSession = () => {
            try {
                const adminSession = localStorage.getItem(ADMIN_STORAGE_KEY);
                if (adminSession) {
                    const sessionData = JSON.parse(adminSession);
                    const now = Date.now();
                    
                    // Check if session is still valid (24 hours)
                    if (sessionData.email === ADMIN_EMAIL && 
                        sessionData.timestamp && 
                        (now - sessionData.timestamp) < 24 * 60 * 60 * 1000) {
                        console.log('Valid admin session found in localStorage');
                        setIsLoggedIn(true);
                        setLoading(false);
                        return true;
                    } else {
                        // Session expired, remove it
                        console.log('Admin session expired, removing from localStorage');
                        localStorage.removeItem(ADMIN_STORAGE_KEY);
                    }
                }
            } catch (error) {
                console.error('Error checking admin session:', error);
                localStorage.removeItem(ADMIN_STORAGE_KEY);
            }
            return false;
        };

        // Check localStorage first
        const hasValidSession = checkAdminSession();
        
        // If no valid session, wait for Firebase auth state
        if (!hasValidSession) {
            console.log('No valid session, setting up Firebase auth listener');
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                console.log('Firebase auth state changed:', user?.email);
                if (user && user.email === ADMIN_EMAIL) {
                    setIsLoggedIn(true);
                    // Save to localStorage
                    saveAdminSession(user.email);
                } else {
                    setIsLoggedIn(false);
                    // Remove from localStorage
                    removeAdminSession();
                    // If someone else is logged in, sign them out
                    if (user && user.email !== ADMIN_EMAIL) {
                        console.log('Non-admin user detected, signing out');
                        signOut(auth);
                    }
                }
                setLoading(false);
            });

            return () => unsubscribe();
        }
    }, []);

    // Set up real-time listeners when logged in
    useEffect(() => {
        if (isLoggedIn) {
            console.log('Admin logged in, setting up data listeners...');
            
            // Load initial data
            loadInitialData();

            // Set up real-time listeners for pending items
            const unsubscribeAdminData = subscribeToAdminData((type, data) => {
                console.log(`Real-time update received for ${type}:`, data?.length || 0, 'items');
                
                switch (type) {
                    case 'taskSubmissions':
                        setPendingTaskSubmissions(data || []);
                        break;
                    case 'withdrawals':
                        setPendingWithdrawals(data || []);
                        break;
                    case 'deposits':
                        setPendingDeposits(data || []);
                        break;
                    default:
                        console.warn('Unknown data type received:', type);
                }
            });

            // Set up real-time listener for admin stats
            const unsubscribeAdminStats = subscribeToAdminStats((stats) => {
                console.log('Real-time admin stats update:', stats);
                setAdminStats(stats || {
                    totalUsers: 0,
                    totalTasks: 0,
                    pendingWithdrawals: 0,
                    pendingDeposits: 0,
                    pendingTasks: 0
                });
            });

            return () => {
                console.log('Cleaning up admin data listeners...');
                unsubscribeAdminData();
                unsubscribeAdminStats();
            };
        } else {
            // Clear data when not logged in
            console.log('Admin not logged in, clearing data...');
            clearAllData();
        }
    }, [isLoggedIn]);

    // Auto-refresh session timestamp every 30 minutes if admin is active
    useEffect(() => {
        if (isLoggedIn) {
            const refreshInterval = setInterval(() => {
                if (isSessionValid()) {
                    saveAdminSession(ADMIN_EMAIL);
                } else {
                    // Session expired, logout
                    console.log('Session expired, logging out...');
                    logout();
                }
            }, 30 * 60 * 1000); // 30 minutes

            return () => clearInterval(refreshInterval);
        }
    }, [isLoggedIn]);

    // Save admin session to localStorage
    const saveAdminSession = (email) => {
        try {
            const sessionData = {
                email: email,
                timestamp: Date.now(),
                isAdmin: true
            };
            localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(sessionData));
            console.log('Admin session saved to localStorage');
        } catch (error) {
            console.error('Error saving admin session:', error);
        }
    };

    // Remove admin session from localStorage
    const removeAdminSession = () => {
        try {
            localStorage.removeItem(ADMIN_STORAGE_KEY);
            console.log('Admin session removed from localStorage');
        } catch (error) {
            console.error('Error removing admin session:', error);
        }
    };

    // Check if admin session is still valid
    const isSessionValid = () => {
        try {
            const adminSession = localStorage.getItem(ADMIN_STORAGE_KEY);
            if (adminSession) {
                const sessionData = JSON.parse(adminSession);
                const now = Date.now();
                
                return sessionData.email === ADMIN_EMAIL && 
                       sessionData.timestamp && 
                       (now - sessionData.timestamp) < 24 * 60 * 60 * 1000;
            }
        } catch (error) {
            console.error('Error checking session validity:', error);
        }
        return false;
    };

    // Load initial data
    const loadInitialData = async () => {
        try {
            console.log('Loading initial admin data...');
            await Promise.all([
                loadTasks(),
                loadAllUsers(),
                loadAnalytics()
            ]);
            console.log('Initial admin data loaded successfully');
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    };

    // Clear all data
    const clearAllData = () => {
        setTasks([]);
        setAdminStats({
            totalUsers: 0,
            totalTasks: 0,
            pendingWithdrawals: 0,
            pendingDeposits: 0,
            pendingTasks: 0
        });
        setPendingWithdrawals([]);
        setPendingDeposits([]);
        setAllUsers([]);
        setWithdrawalHistory([]);
        setDepositHistory([]);
        setPendingTaskSubmissions([]);
        setAnalytics(null);
    };

    const loadTasks = async () => {
        try {
            console.log('Loading tasks...');
            const tasksData = await getAllTasks();
            setTasks(tasksData || []);
            console.log('Tasks loaded:', tasksData?.length || 0);
        } catch (error) {
            console.error('Error loading tasks:', error);
            setTasks([]);
        }
    };

    const loadAllUsers = async () => {
        try {
            console.log('Loading all users...');
            const users = await getAllUsers();
            setAllUsers(users || []);
            console.log('Users loaded:', users?.length || 0);
        } catch (error) {
            console.error('Error loading all users:', error);
            setAllUsers([]);
        }
    };

    const loadAnalytics = async () => {
        try {
            console.log('Loading analytics...');
            const analyticsData = await getAnalytics();
            setAnalytics(analyticsData);
            console.log('Analytics loaded:', analyticsData);
        } catch (error) {
            console.error('Error loading analytics:', error);
            setAnalytics(null);
        }
    };

    const loadWithdrawalHistory = async () => {
        try {
            console.log('Loading withdrawal history...');
            const history = await getAllWithdrawals();
            setWithdrawalHistory(history || []);
            console.log('Withdrawal history loaded:', history?.length || 0);
        } catch (error) {
            console.error('Error loading withdrawal history:', error);
            setWithdrawalHistory([]);
        }
    };

    const loadDepositHistory = async () => {
        try {
            console.log('Loading deposit history...');
            const history = await getAllDeposits();
            setDepositHistory(history || []);
            console.log('Deposit history loaded:', history?.length || 0);
        } catch (error) {
            console.error('Error loading deposit history:', error);
            setDepositHistory([]);
        }
    };

    const login = async (email, password) => {
        try {
            console.log('Attempting admin login...');
            
            // Validate that the email is the admin email
            if (email !== ADMIN_EMAIL) {
                console.log('Login attempt with non-admin email:', email);
                return { 
                    success: false, 
                    error: 'Unauthorized access. Admin access only.' 
                };
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Double-check the email after successful login
            if (user.email === ADMIN_EMAIL) {
                console.log('Admin login successful');
                setIsLoggedIn(true);
                // Save to localStorage
                saveAdminSession(user.email);
                return { success: true };
            } else {
                // Sign out if somehow wrong user got in
                console.log('Wrong user logged in, signing out');
                await signOut(auth);
                removeAdminSession();
                return { 
                    success: false, 
                    error: 'Unauthorized access. Admin access only.' 
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. Please try again.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Admin account not found.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Invalid password.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Admin account has been disabled.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later.';
                    break;
                default:
                    errorMessage = 'Login failed. Please check your credentials.';
            }
            
            return { 
                success: false, 
                error: errorMessage 
            };
        }
    };

    const logout = async () => {
        try {
            console.log('Logging out admin...');
            await signOut(auth);
            setIsLoggedIn(false);
            clearAllData();
            removeAdminSession();
            console.log('Admin logout successful');
        } catch (error) {
            console.error('Logout error:', error);
            // Even if Firebase logout fails, clear local state and storage
            setIsLoggedIn(false);
            clearAllData();
            removeAdminSession();
        }
    };

    const resetPassword = async (email = ADMIN_EMAIL) => {
        try {
            // Validate that the email is the admin email
            if (email !== ADMIN_EMAIL) {
                return { 
                    success: false, 
                    error: 'Password reset is only available for admin account.' 
                };
            }

            await sendPasswordResetEmail(auth, email);
            return { 
                success: true, 
                message: 'Password reset email sent successfully. Please check your inbox.' 
            };
        } catch (error) {
            console.error('Password reset error:', error);
            
            let errorMessage = 'Failed to send password reset email.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Admin account not found.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many requests. Please try again later.';
                    break;
                default:
                    errorMessage = 'Failed to send password reset email. Please try again.';
            }
            
            return { 
                success: false, 
                error: errorMessage 
            };
        }
    };

    const addTask = async (task) => {
        try {
            console.log('Adding new task:', task);
            const taskId = await addTaskToFirebase(task);
            await loadTasks(); // Reload tasks
            console.log('Task added successfully with ID:', taskId);
            return taskId;
        } catch (error) {
            console.error('Error adding task:', error);
            throw error;
        }
    };

    const updateTask = async (updatedTask) => {
        try {
            console.log('Updating task:', updatedTask);
            await updateTaskInFirebase(updatedTask.id, updatedTask);
            await loadTasks(); // Reload tasks
            console.log('Task updated successfully');
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    };

    const removeTask = async (taskId) => {
        try {
            console.log('Removing task:', taskId);
            await deleteTaskFromFirebase(taskId);
            await loadTasks(); // Reload tasks
            console.log('Task removed successfully');
        } catch (error) {
            console.error('Error removing task:', error);
            throw error;
        }
    };

    const approveWithdrawal = async (withdrawalId) => {
        try {
            console.log('Approving withdrawal:', withdrawalId);
            await approveWithdrawalFirebase(withdrawalId);
            console.log('Withdrawal approved successfully');
            return true;
        } catch (error) {
            console.error('Error approving withdrawal:', error);
            throw error;
        }
    };

    const rejectWithdrawal = async (withdrawalId, userId, amount, reason = '') => {
        try {
            console.log('Rejecting withdrawal:', { withdrawalId, userId, amount, reason });
            await rejectWithdrawalFirebase(withdrawalId, userId, amount, reason);
            console.log('Withdrawal rejected successfully');
            return true;
        } catch (error) {
            console.error('Error rejecting withdrawal:', error);
            throw error;
        }
    };

    const approveDeposit = async (depositId, userId, amount) => {
        try {
            console.log('Approving deposit:', { depositId, userId, amount });
            await approveDepositFirebase(depositId, userId, amount);
            console.log('Deposit approved successfully');
            return true;
        } catch (error) {
            console.error('Error approving deposit:', error);
            throw error;
        }
    };

    const rejectDeposit = async (depositId, reason = '') => {
        try {
            console.log('Rejecting deposit:', { depositId, reason });
            await rejectDepositFirebase(depositId, reason);
            console.log('Deposit rejected successfully');
            return true;
        } catch (error) {
            console.error('Error rejecting deposit:', error);
            throw error;
        }
    };

    const approveTaskSubmission = async (submissionId, userId, taskReward) => {
        try {
            console.log('Approving task submission:', { submissionId, userId, taskReward });
            await approveTaskSubmissionFirebase(submissionId, userId, taskReward);
            console.log('Task submission approved successfully');
            return true;
        } catch (error) {
            console.error('Error approving task submission:', error);
            throw error;
        }
    };

    const rejectTaskSubmission = async (submissionId, reason = '') => {
        try {
            console.log('Rejecting task submission:', { submissionId, reason });
            await rejectTaskSubmissionFirebase(submissionId, reason);
            console.log('Task submission rejected successfully');
            return true;
        } catch (error) {
            console.error('Error rejecting task submission:', error);
            throw error;
        }
    };

    const refreshData = async () => {
        try {
            console.log('Refreshing all admin data...');
            await Promise.all([
                loadTasks(),
                loadAllUsers(),
                loadWithdrawalHistory(),
                loadDepositHistory(),
                loadAnalytics()
            ]);
            console.log('All admin data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing data:', error);
            throw error;
        }
    };

    // Manual data loading functions (for fallback)
    const loadPendingData = async () => {
        try {
            console.log('Manually loading pending data...');
            const [submissions, withdrawals, deposits] = await Promise.all([
                getPendingTaskSubmissions(),
                getPendingWithdrawals(),
                getPendingDeposits()
            ]);
            
            setPendingTaskSubmissions(submissions || []);
            setPendingWithdrawals(withdrawals || []);
            setPendingDeposits(deposits || []);
            
            console.log('Pending data loaded manually:', {
                submissions: submissions?.length || 0,
                withdrawals: withdrawals?.length || 0,
                deposits: deposits?.length || 0
            });
        } catch (error) {
            console.error('Error loading pending data manually:', error);
        }
    };

    const loadAdminStatsManually = async () => {
        try {
            console.log('Manually loading admin stats...');
            const stats = await getAdminStats();
            setAdminStats(stats || {
                totalUsers: 0,
                totalTasks: 0,
                pendingWithdrawals: 0,
                pendingDeposits: 0,
                pendingTasks: 0
            });
            console.log('Admin stats loaded manually:', stats);
        } catch (error) {
            console.error('Error loading admin stats manually:', error);
        }
    };

    // Utility functions
    const getTotalPendingCount = () => {
        return (pendingTaskSubmissions?.length || 0) + 
               (pendingWithdrawals?.length || 0) + 
               (pendingDeposits?.length || 0);
    };

    const hasAnyPendingItems = () => {
        return getTotalPendingCount() > 0;
    };

    // Debug function to check data state
    const debugDataState = () => {
        const state = {
            isLoggedIn,
            loading,
            tasksCount: tasks?.length || 0,
            pendingTaskSubmissionsCount: pendingTaskSubmissions?.length || 0,
            pendingWithdrawalsCount: pendingWithdrawals?.length || 0,
            pendingDepositsCount: pendingDeposits?.length || 0,
            adminStats,
            totalPendingCount: getTotalPendingCount()
        };
        console.log('Admin Hook Debug State:', state);
        return state;
    };

    return {
        // Authentication state
        isLoggedIn,
        loading,
        
        // Data
        tasks,
        adminStats,
        pendingWithdrawals,
        pendingDeposits,
        allUsers,
        withdrawalHistory,
        depositHistory,
        pendingTaskSubmissions,
        analytics,
        
        // Authentication functions
        login,
        logout,
        resetPassword,
        
        // Task management functions
        addTask,
        updateTask,
        removeTask,
        
        // Withdrawal management functions
        approveWithdrawal,
        rejectWithdrawal,
        
        // Deposit management functions
        approveDeposit,
        rejectDeposit,
        
        // Task submission management functions
        approveTaskSubmission,
        rejectTaskSubmission,
        
        // Data loading functions
        loadWithdrawalHistory,
        loadDepositHistory,
        refreshData,
        loadPendingData,
        loadAdminStatsManually,
        
        // Utility functions
        getTotalPendingCount,
        hasAnyPendingItems,
        debugDataState,
        
        // Session management
        adminEmail: ADMIN_EMAIL,
        isSessionValid,
        
        // Manual refresh functions (for debugging)
        manualRefresh: {
            tasks: loadTasks,
            users: loadAllUsers,
            analytics: loadAnalytics,
            pendingData: loadPendingData,
            stats: loadAdminStatsManually
        }
    };
};
