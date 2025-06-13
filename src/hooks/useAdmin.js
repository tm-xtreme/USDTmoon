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
  addTransaction
} from '@/lib/firebaseService';

const ADMIN_EMAIL = "admin@moonusdt.com";
const ADMIN_PASSWORD = "admin123"; // In production, use proper authentication

export const useAdmin = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

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

    const getPendingTransactions = async () => {
        try {
            const [withdrawals, deposits] = await Promise.all([
                getPendingWithdrawals(),
                getPendingDeposits()
            ]);
            return { withdrawals, deposits };
        } catch (error) {
            console.error('Error getting pending transactions:', error);
            return { withdrawals: [], deposits: [] };
        }
    };

    const approveWithdrawal = async (withdrawalId) => {
        try {
            await updateWithdrawalStatus(withdrawalId, 'approved');
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
            const userData = await getUserData(userId);
            if (userData) {
                await updateUserData(userId, {
                    totalMined: userData.totalMined + amount
                });
                
                // Add refund transaction
                await addTransaction(userId, {
                    type: 'withdrawal_refund',
                    amount: amount,
                    status: 'completed'
                });
            }
            
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
            const userData = await getUserData(userId);
            if (userData) {
                await updateUserData(userId, {
                    totalMined: userData.totalMined + amount
                });
                
                // Add deposit transaction
                await addTransaction(userId, {
                    type: 'deposit',
                    amount: amount,
                    status: 'completed'
                });
            }
            
            return true;
        } catch (error) {
            console.error('Error approving deposit:', error);
            return false;
        }
    };

    const rejectDeposit = async (depositId) => {
        try {
            await updateDepositStatus(depositId, 'rejected');
            return true;
        } catch (error) {
            console.error('Error rejecting deposit:', error);
            return false;
        }
    };

    const approveTask = async (userId, taskId, reward) => {
        try {
            const userData = await getUserData(userId);
            if (userData) {
                // Update user's task status and add reward
                const updatedUserTasks = {
                    ...userData.userTasks,
                    [taskId]: { status: 'completed' }
                };
                
                await updateUserData(userId, {
                    totalMined: userData.totalMined + reward,
                    userTasks: updatedUserTasks
                });
                
                // Add task reward transaction
                await addTransaction(userId, {
                    type: 'task_reward',
                    amount: reward,
                    taskId: taskId,
                    status: 'completed'
                });
            }
            
            return true;
        } catch (error) {
            console.error('Error approving task:', error);
            return false;
        }
    };

    const rejectTask = async (userId, taskId) => {
        try {
            const userData = await getUserData(userId);
            if (userData) {
                // Update user's task status to rejected
                const updatedUserTasks = {
                    ...userData.userTasks,
                    [taskId]: { status: 'rejected' }
                };
                
                await updateUserData(userId, {
                    userTasks: updatedUserTasks
                });
            }
            
            return true;
        } catch (error) {
            console.error('Error rejecting task:', error);
            return false;
        }
    };

    const getPendingTasks = async () => {
        // This would need to be implemented to get all users with pending tasks
        // For now, returning empty array as it requires more complex querying
        return [];
    };

    return {
        isLoggedIn,
        loading,
        login,
        logout,
        tasks,
        addTask,
        updateTask,
        removeTask,
        getPendingTasks,
        getPendingTransactions,
        approveTask,
        rejectTask,
        approveWithdrawal,
        rejectWithdrawal,
        approveDeposit,
        rejectDeposit
    };
};
