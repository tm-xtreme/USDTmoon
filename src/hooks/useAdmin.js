import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
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
  getAllDeposits
} from '@/lib/firebaseService';

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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsLoggedIn(!!user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            loadTasks();
            loadAdminStats();
            loadPendingTransactions();
            loadAllUsers();
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

    const login = async (password) => {
        try {
            await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setTasks([]);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const addTask = async (task) => {
        try {
            const taskId = await addTaskToFirebase(task);
            await loadTasks(); // Reload tasks
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
        } catch (error) {
            console.error('Error removing task:', error);
            throw error;
        }
    };

    const approveWithdrawal = async (withdrawalId) => {
        try {
            await updateWithdrawalStatus(withdrawalId, 'approved');
            await loadPendingTransactions();
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
            }
            await loadPendingTransactions();
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
            }
            await loadPendingTransactions();
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
            return true;
        } catch (error) {
            console.error('Error rejecting deposit:', error);
            return false;
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
        login,
        logout,
        addTask,
        updateTask,
        removeTask,
        approveWithdrawal,
        rejectWithdrawal,
        approveDeposit,
        rejectDeposit,
        loadWithdrawalHistory,
        loadDepositHistory
    };
};
              
