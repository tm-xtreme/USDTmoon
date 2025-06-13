import React, { useState, useEffect } from 'react';

const ADMIN_PASSWORD = "admin"; // In a real app, this should be handled securely on a server.
const TASKS_STORAGE_KEY = 'admin-tasks-data';

const initialTasks = [
    { 
        id: 'channel', 
        name: 'Join Telegram Channel',
        description: 'Join our official channel to stay updated.',
        icon: 'Send', 
        type: 'auto', 
        target: 'https://t.me/yourchannel', 
        reward: 0.000005 
    },
    { 
        id: 'website', 
        name: 'Visit Our Website',
        description: 'Check out our official website for more info.',
        icon: 'Globe', 
        type: 'auto', 
        target: 'https://example.com', 
        reward: 0.000002 
    },
    { 
        id: 'friends', 
        name: 'Invite 3 Friends',
        description: 'Share your referral link with 3 friends.',
        icon: 'Users', 
        type: 'manual', 
        target: 'referrals_page', 
        reward: 0.00001 
    },
];

export const useAdmin = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [tasks, setTasks] = useState(() => {
        const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
        return savedTasks ? JSON.parse(savedTasks) : initialTasks;
    });

    useEffect(() => {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    }, [tasks]);

    const login = (password) => {
        if (password === ADMIN_PASSWORD) {
            setIsLoggedIn(true);
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsLoggedIn(false);
    };

    const addTask = (task) => {
        setTasks(prevTasks => [...prevTasks, { ...task, id: Date.now().toString(), reward: parseFloat(task.reward) }]);
    };

    const updateTask = (updatedTask) => {
        setTasks(prevTasks => prevTasks.map(task => task.id === updatedTask.id ? { ...updatedTask, reward: parseFloat(updatedTask.reward) } : task));
    };

    const removeTask = (taskId) => {
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    };
    
    // Mocking admin approval
    const getPendingTasks = () => {
        // In a real app, this would fetch from a database.
        return []; 
    };

    const approveTask = (userId, taskId) => {
        console.log(`Approving task ${taskId} for user ${userId}`);
        // This would update the user's data in the database.
    };
    
    const rejectTask = (userId, taskId) => {
        console.log(`Rejecting task ${taskId} for user ${userId}`);
        // This would update the user's data in the database.
    };


    return {
        isLoggedIn,
        login,
        logout,
        tasks,
        addTask,
        updateTask,
        removeTask,
        getPendingTasks,
        approveTask,
        rejectTask
    };
};