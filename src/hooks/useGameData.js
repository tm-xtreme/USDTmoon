
import React, { useState, useEffect, useCallback } from 'react';
import { useTelegram } from '@/hooks/useTelegram';

const CLAIM_FEE = 0.000007;
const MINER_UPGRADE_COSTS = [0, 0.05, 0.1, 0.2]; // Index 0 is for level 1 (no cost to be level 1)
const STORAGE_UPGRADE_COSTS = [0, 0.005, 0.01, 0.02];
const MINER_RATES = [0, 0.000027, 0.000054, 0.000108]; // USDT per hour
const STORAGE_CAPACITIES = [0, 0.000027 * 2, 0.000054 * 2, 0.000108 * 2]; // Capacity for 2 hours of mining
const MAX_LEVEL = 3;

const getInitialState = (user) => {
    if (!user) return null;
    const savedData = localStorage.getItem(`usdt-mining-data-v3-${user.id}`);
    if (savedData) {
        const parsed = JSON.parse(savedData);
        // Ensure new fields exist if loading old data
        return {
            minerLevel: 1,
            storageLevel: 1,
            ...parsed,
            minerRate: MINER_RATES[parsed.minerLevel || 1],
            storageCapacity: STORAGE_CAPACITIES[parsed.storageLevel || 1],
        };
    }
    return {
        id: user.id,
        fullName: `${user.first_name} ${user.last_name || ''}`.trim(),
        username: user.username,
        photoUrl: user.photo_url,
        totalMined: 0,
        lastStorageSync: Date.now(),
        storageFillTime: Date.now() + 2 * 60 * 60 * 1000, // Based on level 1 rate
        minerLevel: 1,
        storageLevel: 1,
        minerRate: MINER_RATES[1],
        storageCapacity: STORAGE_CAPACITIES[1],
        storageMined: 0,
        transactions: [],
        userTasks: {},
        pendingWithdrawals: [],
        pendingDeposits: [],
    };
};

export const useGameData = () => {
    const { user } = useTelegram();
    const [data, setData] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (user && !isInitialized) {
            const initialState = getInitialState(user);
            setData(initialState);
            setIsInitialized(true);
        }
    }, [user, isInitialized]);

    const saveData = useCallback((newData) => {
        if(user && newData) {
            localStorage.setItem(`usdt-mining-data-v3-${user.id}`, JSON.stringify(newData));
        }
    }, [user]);
    
    const addTransaction = useCallback((currentData, type, amount, details = {}) => {
        const newTransaction = {
            id: Date.now(),
            type,
            amount,
            date: new Date().toISOString(),
            ...details
        };
        const updatedTransactions = [newTransaction, ...currentData.transactions].slice(0, 50);
        return { ...currentData, transactions: updatedTransactions };
    }, []);

    useEffect(() => {
        if (!data || !isInitialized) return;

        const interval = setInterval(() => {
            setData(currentData => {
                if (!currentData) return null;
                const now = Date.now();
                const elapsed = now - currentData.lastStorageSync;
                
                const storageRatePerMs = currentData.minerRate / (60 * 60 * 1000);
                const newStorageMined = Math.min(currentData.storageCapacity, currentData.storageMined + elapsed * storageRatePerMs);
                const fillDurationMs = (currentData.storageCapacity / currentData.minerRate) * 60 * 60 * 1000;

                const updatedData = { 
                    ...currentData, 
                    storageMined: newStorageMined, 
                    lastStorageSync: now,
                    storageFillTime: newStorageMined >= currentData.storageCapacity ? currentData.storageFillTime : now + (fillDurationMs - (currentData.storageMined / currentData.minerRate * 60 * 60 * 1000))
                };
                return updatedData;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [data, isInitialized]);


    const handleClaimStorage = () => {
         if (!data || data.storageMined <= 0) return { success: false, reason: "Storage is empty." };
         if (data.totalMined < CLAIM_FEE) return { success: false, reason: "Not enough balance for claim fee." };

         const claimedAmount = data.storageMined;
         const fillDurationMs = (data.storageCapacity / data.minerRate) * 60 * 60 * 1000;
         let newData = {
            ...data,
            totalMined: data.totalMined + claimedAmount - CLAIM_FEE,
            storageMined: 0,
            storageFillTime: Date.now() + fillDurationMs,
            lastStorageSync: Date.now(),
         };
         
         newData = addTransaction(newData, 'claim', claimedAmount);
         newData = addTransaction(newData, 'fee', -CLAIM_FEE);
         
         setData(newData);
         saveData(newData);
         return { success: true, amount: claimedAmount };
    };

    const handleTaskAction = (task) => {
        if (!data) return;
        let userTaskState = data.userTasks[task.id] || { status: 'new' };
        let newData = { ...data };
        switch(userTaskState.status) {
            case 'new': userTaskState.status = 'pending_claim'; break;
            case 'pending_claim':
                if (task.type === 'auto') {
                    newData = addTransaction(newData, 'task_reward', task.reward);
                    userTaskState.status = 'completed';
                    newData.totalMined += task.reward;
                } else { userTaskState.status = 'pending_approval'; }
                break;
            default: break;
        }
        newData.userTasks = { ...data.userTasks, [task.id]: userTaskState };
        setData(newData);
        saveData(newData);
    };

    const simulateAdminApproval = (taskId) => {
        if(!data || !data.userTasks[taskId] || data.userTasks[taskId].status !== 'pending_approval') return;
        const taskReward = 0.00001; 
        let newData = { ...data };
        newData.totalMined += taskReward;
        newData = addTransaction(newData, 'task_reward', taskReward);
        newData.userTasks[taskId].status = 'completed';
        setData(newData);
        saveData(newData);
    };

    const upgradeMiner = () => {
        if (!data || data.minerLevel >= MAX_LEVEL) return { success: false, reason: "Max level reached."};
        const cost = MINER_UPGRADE_COSTS[data.minerLevel + 1];
        if (data.totalMined < cost) return { success: false, reason: "Not enough balance."};

        const newLevel = data.minerLevel + 1;
        let newData = {
            ...data,
            totalMined: data.totalMined - cost,
            minerLevel: newLevel,
            minerRate: MINER_RATES[newLevel],
        };
        newData = addTransaction(newData, 'upgrade_miner', -cost, { level: newLevel });
        setData(newData);
        saveData(newData);
        return { success: true, level: newLevel };
    };

    const upgradeStorage = () => {
        if (!data || data.storageLevel >= MAX_LEVEL) return { success: false, reason: "Max level reached."};
        const cost = STORAGE_UPGRADE_COSTS[data.storageLevel + 1];
        if (data.totalMined < cost) return { success: false, reason: "Not enough balance."};
        
        const newLevel = data.storageLevel + 1;
        let newData = {
            ...data,
            totalMined: data.totalMined - cost,
            storageLevel: newLevel,
            storageCapacity: STORAGE_CAPACITIES[newLevel],
        };
        newData = addTransaction(newData, 'upgrade_storage', -cost, { level: newLevel });
        setData(newData);
        saveData(newData);
        return { success: true, level: newLevel };
    };

    const requestWithdrawal = (amount, address) => {
        if (!data || data.totalMined < amount) return { success: false, reason: "Insufficient balance." };
        if (amount <= 0) return { success: false, reason: "Invalid amount." };

        const withdrawalId = `wd-${Date.now()}`;
        const newPendingWithdrawal = { id: withdrawalId, amount, address, status: 'pending', date: new Date().toISOString(), userId: user.id, username: user.username };
        
        let newData = {
            ...data,
            totalMined: data.totalMined - amount, // Deduct immediately, will be refunded if rejected
            pendingWithdrawals: [...data.pendingWithdrawals, newPendingWithdrawal]
        };
        newData = addTransaction(newData, 'withdrawal_request', -amount, { address });
        setData(newData);
        saveData(newData);
        // In a real app, this would also send data to backend for admin approval
        localStorage.setItem(`admin-pending-withdrawals`, JSON.stringify(newData.pendingWithdrawals));
        return { success: true, withdrawalId };
    };

    const requestDeposit = (amount, transactionHash) => {
        if (!data || amount <= 0) return { success: false, reason: "Invalid amount." };
        
        const depositId = `dp-${Date.now()}`;
        const newPendingDeposit = { id: depositId, amount, transactionHash, status: 'pending', date: new Date().toISOString(), userId: user.id, username: user.username };

        let newData = {
            ...data,
            pendingDeposits: [...data.pendingDeposits, newPendingDeposit]
        };
        // No transaction added yet, will be added upon admin approval
        setData(newData);
        saveData(newData);
        localStorage.setItem(`admin-pending-deposits`, JSON.stringify(newData.pendingDeposits));
        return { success: true, depositId };
    };


    return { 
        data, 
        handleClaimStorage, 
        handleTaskAction, 
        simulateAdminApproval, 
        isInitialized,
        upgradeMiner,
        upgradeStorage,
        requestWithdrawal,
        requestDeposit,
        MINER_UPGRADE_COSTS,
        STORAGE_UPGRADE_COSTS,
        MAX_LEVEL
    };
};
