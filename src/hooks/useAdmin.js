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
  updateUser Data,
  getUser Data,
  addTransaction,
  getAdminStats,
  getAllUsers,
  getPendingTaskSubmissions,
  getAllWithdrawals,
  getAllDeposits,
  updateTaskSubmissionStatus,
  approveTaskSubmission,
  rejectTaskSubmission
} from '@/lib/firebaseService';

const ADMIN_EMAIL = "admin@moonusdt.com";
const ADMIN_STORAGE_KEY = "moonusdt_admin_session";

export const useAdmin = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminStats, setAdminStats] = useState({});
    const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
    const [pendingDeposits, setPendingDeposits] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [withdrawalHistory, setWithdrawalHistory] = useState([]);
    const [depositHistory, setDepositHistory] = useState([]);
    const [pendingTaskSubmissions, setPendingTaskSubmissions] = useState([]);

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
                        setIsLoggedIn(true);
                        setLoading(false);
                        return true;
                    } else {
                        // Session expired, remove it
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
            const unsubscribe = onAuthStateChanged(auth, (user) => {
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
                        signOut(auth);
                    }
                }
                setLoading(false);
            });

            return () => unsubscribe();
        }
    }, []);

    // Save admin session to localStorage
    const saveAdminSession = (email) => {
        try {
            const sessionData = {
                email: email,
                timestamp: Date.now(),
                isAdmin: true
            };
            localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(sessionData));
        } catch (error) {
            console.error('Error saving admin session:', error);
        }
    };

    // Remove admin session from localStorage
    const removeAdminSession = () => {
        try {
            localStorage.removeItem(ADMIN_STORAGE_KEY);
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

    useEffect(() => {
        if (isLoggedIn) {
            loadTasks();
            loadAdminStats();
            loadPendingTransactions();
            loadAllUsers();
            loadPendingTaskSubmissions(); // Load pending task submissions
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
                    logout();
                }
            }, 30 * 60 * 1000); // 30 minutes

            return () => clearInterval(refreshInterval);
        }
    }, [isLoggedIn]);

    const loadTasks = async () => {
        try {
            const tasksData = await getAllTasks();
            setTasks(tasksData);
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    };

    const loadAdminStats = async () => {
        try {
            const stats = await getAdminStats();
            setAdminStats(stats);
        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    };

    const loadPendingTransactions = async () => {
        try {
            const [withdrawals, deposits] = await Promise.all([
                getPendingWithdrawals(),
                getPendingDeposits()
            ]);
            setPendingWithdrawals(withdrawals);
            setPendingDeposits(deposits);
        } catch (error) {
            console.error('Error loading pending transactions:', error);
        }
    };

    const loadAllUsers = async () => {
        try {
            const users = await getAllUsers();
            setAllUsers(users);
        } catch (error) {
            console.error('Error loading all users:', error);
        }
    };

    const loadPendingTaskSubmissions = async () => {
        try {
            const submissions = await getPendingTaskSubmissions();
            setPendingTaskSubmissions(submissions);
        } catch (error) {
            console.error('Error loading pending task submissions:', error);
        }
    };

    const loadWithdrawalHistory = async () => {
        try {
            const history = await getAllWithdrawals();
            setWithdrawalHistory(history);
        } catch (error) {
            console.error('Error loading withdrawal history:', error);
        }
    };

    const loadDepositHistory = async () => {
        try {
            const history = await getAllDeposits();
            setDepositHistory(history);
        } catch (error) {
            console.error('Error loading deposit history:', error);
        }
    };

    const login = async (email, password) => {
        try {
            // Validate that the email is the admin email
            if (email !== ADMIN_EMAIL) {
                return { 
                    success: false, 
                    error: 'Unauthorized access. Admin access only.' 
                };
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Double-check the email after successful login
            if (user.email === ADMIN_EMAIL) {
                setIsLoggedIn(true);
                // Save to localStorage
                saveAdminSession(user.email);
                return { success: true };
            } else {
                // Sign out if somehow wrong user got in
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
            await signOut(auth);
            setIsLoggedIn(false);
            setTasks([]);
            setAdminStats({});
            setPendingWithdrawals([]);
            setPendingDeposits([]);
            setAllUsers([]);
            setWithdrawalHistory([]);
            setDepositHistory([]);
            setPendingTaskSubmissions([]); // Clear pending task submissions
            // Remove from localStorage
            removeAdminSession();
        } catch (error) {
            console.error('Logout error:', error);
            // Even if Firebase logout fails, clear local state and storage
            setIsLoggedIn(false);
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
            const taskId = await addTaskToFirebase(task);
            await loadTasks(); // Reload tasks
            await loadAdminStats(); // Reload stats
            return taskId;
        } catch (error) {
            console.error('Error adding task:', error);
            throw error;
        }
    };

    const updateTask = async (updatedTask) => {
        try {
            await updateTaskInFirebase(updatedTask.id, updatedTask);
            await loadTasks(); // Reload tasks
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    };

    const removeTask = async (taskId) => {
        try {
            await deleteTaskFromFirebase(taskId);
            await loadTasks(); // Reload tasks
            await loadAdminStats(); // Reload stats
        } catch (error) {
            console.error('Error removing task:', error);
            throw error;
        }
    };

    const approveWithdrawal = async (withdrawalId) => {
        try {
            await updateWithdrawalStatus(withdrawalId, 'approved');
            await loadPendingTransactions();
            await loadAdminStats(); // Reload stats
            return true;
        } catch (error) {
            console.error('Error approving withdrawal:', error);
            return false;
        }
    };

    const rejectWithdrawal = async (withdrawalId, userId, amount) => {
        try {
            await updateWithdrawalStatus(withdrawalId, 'rejected');
            // Refund the amount to user
            const userData = await getUser Data(userId);
            if (userData) {
                await updateUser Data(userId, {
                    totalMined: userData.totalMined + amount
                });
                
                // Add refund transaction
                await addTransaction(userId, {
                    type: 'withdrawal_refund',
                    amount: amount,
                    status: 'completed',
                    reason: 'Withdrawal rejected by admin'
                });
            }
            await loadPendingTransactions();
            await loadAdminStats(); // Reload stats
            return true;
        } catch (error) {
            console.error('Error rejecting withdrawal:', error);
            return false;
        }
    };

    const approveDeposit = async (depositId, userId, amount) => {
        try {
            await updateDepositStatus(depositId, 'approved');
            // Add amount to user balance
            const userData = await getUser Data(userId);
            if (userData) {
                await updateUser Data(userId, {
                    totalMined: userData.totalMined + amount
                });
                
                // Add deposit transaction
                await addTransaction(userId, {
                    type: 'deposit',
                    amount: amount,
                    status: 'completed',
                    reason: 'Deposit approved by admin'
                });
            }
            await loadPendingTransactions();
            await loadAdminStats(); // Reload stats
            return true;
        } catch (error) {
            console.error('Error approving deposit:', error);
            return false;
        }
    };

    const rejectDeposit = async (depositId) => {
        try {
            await updateDepositStatus(depositId, 'rejected');
            await loadPendingTransactions();
            await loadAdminStats(); // Reload stats
            return true;
        } catch (error) {
            console.error('Error rejecting deposit:', error);
            return false;
        }
    };

    const approveTaskSubmission = async (submissionId, userId, taskReward) => {
        try {
            await approveTaskSubmission(submissionId, userId, taskReward);
            await loadPendingTaskSubmissions(); // Reload pending submissions
            return true;
        } catch (error) {
            console.error('Error approving task submission:', error);
            return false;
        }
    };

    const rejectTaskSubmission = async (submissionId) => {
        try {
            await rejectTaskSubmission(submissionId);
            await loadPendingTaskSubmissions(); // Reload pending submissions
            return true;
        } catch (error) {
            console.error('Error rejecting task submission:', error);
            return false;
        }
    };

    const refreshData = async () => {
        try {
            await Promise.all([
                loadTasks(),
                loadAdminStats(),
                loadPendingTransactions(),
                loadAllUsers(),
                loadPendingTaskSubmissions() // Refresh pending task submissions
            ]);
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    };

    return {
        isLoggedIn,
        loading,
        tasks,
        adminStats,
        pendingWithdrawals,
        pendingDeposits,
        allUsers,
        withdrawalHistory,
        depositHistory,
        pendingTaskSubmissions,
        login,
        logout,
        resetPassword,
        addTask,
        updateTask,
        removeTask,
        approveWithdrawal,
        rejectWithdrawal,
        approveDeposit,
        rejectDeposit,
        approveTaskSubmission,
        rejectTaskSubmission,
        loadWithdrawalHistory,
        loadDepositHistory,
        refreshData,
        adminEmail: ADMIN_EMAIL,
        isSessionValid
    };
};
