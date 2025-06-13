import React, { useState, useEffect, useCallback } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { 
  createOrUpdateUser , 
  getUserData, 
  updateUserData, 
  addTransaction,
  createWithdrawalRequest,
  createDepositRequest,
  subscribeToUserData
} from '@/lib/firebaseService';
import { 
  processReferralSignup, 
  processReferralTaskReward,
  extractReferrerIdFromStartParam 
} from '@/lib/referralService';

const CLAIM_FEE = 0.000007;
const MINER_UPGRADE_COSTS = [0, 0.05, 0.1, 0.2];
const STORAGE_UPGRADE_COSTS = [0, 0.005, 0.01, 0.02];
const MINER_RATES = [0, 0.000027, 0.000054, 0.000108];
const STORAGE_CAPACITIES = [0, 0.000027 * 2, 0.000054 * 2, 0.000108 * 2];
const MAX_LEVEL = 3;

export const useGameData = () => {
    const { user, startParam } = useTelegram();
    const [data, setData] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeUser  = async () => {
            if (user) {
                try {
                    setLoading(true);
                    
                    // Create or update user in Firebase
                    const telegramData = { user };
                    const userData = await createOrUpdateUser (telegramData);
                    setData(userData);
                    setIsInitialized(true);
                    
                    // Process referral if exists
                    const referrerId = extractReferrerIdFromStartParam(startParam);
                    if (referrerId) {
                        await processReferralSignup(user.id.toString(), referrerId);
                    }
                    
                    // Set up real-time listener
                    const unsubscribe = subscribeToUserData(user.id.toString(), (updatedData) => {
                        setData(updatedData);
                    });
                    
                    return () => unsubscribe();
                } catch (error) {
                    console.error('Error initializing user:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        initializeUser ();
    }, [user, startParam]);

    const saveData = useCallback(async (newData) => {
        if (user && newData) {
            try {
                await updateUserData(user.id.toString(), newData);
                setData(prev => ({ ...prev, ...newData }));
            } catch (error) {
                console.error('Error saving data:', error);
            }
        }
    }, [user]);

    const addTransactionRecord = useCallback(async (type, amount, details = {}) => {
        if (user) {
            try {
                await addTransaction(user.id.toString(), {
                    type,
                    amount,
                    date: new Date().toISOString(),
                    ...details
                });
            } catch (error) {
                console.error('Error adding transaction:', error);
            }
        }
    }, [user]);

    // Real-time mining calculation
    useEffect(() => {
        if (!data || !isInitialized) return;

        const interval = setInterval(() => {
            setData(currentData => {
                if (!currentData) return null;
                
                const now = Date.now();
                const elapsed = now - currentData.lastStorageSync;
                
                const storageRatePerMs = currentData.minerRate / (60 * 60 * 1000);
                const newStorageMined = Math.min(
                    currentData.storageCapacity, 
                    currentData.storageMined + elapsed * storageRatePerMs
                );
                const fillDurationMs = (currentData.storageCapacity / currentData.minerRate) * 60 * 60 * 1000;

                const updatedData = { 
                    ...currentData, 
                    storageMined: newStorageMined, 
                    lastStorageSync: now,
                    storageFillTime: newStorageMined >= currentData.storageCapacity ? 
                        currentData.storageFillTime : 
                        now + (fillDurationMs - (currentData.storageMined / currentData.minerRate * 60 * 60 * 1000))
                };
                
                // Save to Firebase periodically (every 30 seconds)
                if (elapsed > 30000) {
                    saveData({
                        storageMined: updatedData.storageMined,
                        lastStorageSync: updatedData.lastStorageSync,
                        storageFillTime: updatedData.storageFillTime
                    });
                }
                
                return updatedData;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [data, isInitialized, saveData]);

    const handleClaimStorage = async () => {
        if (!data || data.storageMined <= 0) return { success: false, reason: "Storage is empty." };
        if (data.totalMined < CLAIM_FEE) return { success: false, reason: "Not enough balance for claim fee." };

        try {
            const claimedAmount = data.storageMined;
            const fillDurationMs = (data.storageCapacity / data.minerRate) * 60 * 60 * 1000;
            
            const newData = {
                totalMined: data.totalMined + claimedAmount - CLAIM_FEE,
                storageMined: 0,
                storageFillTime: Date.now() + fillDurationMs,
                lastStorageSync: Date.now(),
            };
            
            await saveData(newData);
            await addTransactionRecord('claim', claimedAmount);
            await addTransactionRecord('fee', -CLAIM_FEE);
            
            return { success: true, amount: claimedAmount };
        } catch (error) {
            console.error('Error claiming storage:', error);
            return { success: false, reason: "Failed to claim storage." };
        }
    };

    const handleTaskAction = async (task) => {
        if (!data) return;
        
        try {
            let userTaskState = data.userTasks[task.id] || { status: 'new' };
            let newData = { ...data };
            
            switch(userTaskState.status) {
                case 'new': 
                    userTaskState.status = 'pending_claim'; 
                    break;
                case 'pending_claim':
                    if (task.type === 'auto') {
                        await addTransactionRecord('task_reward', task.reward);
                        userTaskState.status = 'completed';
                        newData.totalMined += task.reward;

                        // Process referral task reward
                        await processReferralTaskReward(user.id.toString(), task.reward);
                    } else { 
                        userTaskState.status = 'pending_approval'; 
                    }
                    break;
                default: 
                    break;
            }
            
            newData.userTasks = { ...data.userTasks, [task.id]: userTaskState };
            await saveData(newData);
        } catch (error) {
            console.error('Error handling task action:', error);
        }
    };

    const simulateAdminApproval = async (taskId) => {
        if(!data || !data.userTasks[taskId] || data.userTasks[taskId].status !== 'pending_approval') return;
        
        try {
            const taskReward = 0.00001; 
            const newData = {
                totalMined: data.totalMined + taskReward,
                userTasks: {
                    ...data.userTasks,
                    [taskId]: { ...data.userTasks[taskId], status: 'completed' }
                }
            };
            
            await saveData(newData);
            await addTransactionRecord('task_reward', taskReward);
            
            // Process referral task reward
            await processReferralTaskReward(user.id.toString(), taskReward);
        } catch (error) {
            console.error('Error simulating admin approval:', error);
        }
    };

    const upgradeMiner = async () => {
        if (!data || data.minerLevel >= MAX_LEVEL) return { success: false, reason: "Max level reached."};
        
        const cost = MINER_UPGRADE_COSTS[data.minerLevel + 1];
        if (data.totalMined < cost) return { success: false, reason: "Not enough balance."};

        try {
            const newLevel = data.minerLevel + 1;
            const newData = {
                totalMined: data.totalMined - cost,
                minerLevel: newLevel,
                minerRate: MINER_RATES[newLevel],
            };
            
            await saveData(newData);
            await addTransactionRecord('upgrade_miner', -cost, { level: newLevel });
            
            return { success: true, level: newLevel };
        } catch (error) {
            console.error('Error upgrading miner:', error);
            return { success: false, reason: "Failed to upgrade miner." };
        }
    };

    const upgradeStorage = async () => {
        if (!data || data.storageLevel >= MAX_LEVEL) return { success: false, reason: "Max level reached."};
        
        const cost = STORAGE_UPGRADE_COSTS[data.storageLevel + 1];
        if (data.totalMined < cost) return { success: false, reason: "Not enough balance."};
        
        try {
            const newLevel = data.storageLevel + 1;
            const newData = {
                totalMined: data.totalMined - cost,
                storageLevel: newLevel,
                storageCapacity: STORAGE_CAPACITIES[newLevel],
            };
            
            await saveData(newData);
            await addTransactionRecord('upgrade_storage', -cost, { level: newLevel });
            
            return { success: true, level: newLevel };
        } catch (error) {
            console.error('Error upgrading storage:', error);
            return { success: false, reason: "Failed to upgrade storage." };
        }
    };

    const requestWithdrawal = async (amount, address) => {
        if (!data || data.totalMined < amount) return { success: false, reason: "Insufficient balance." };
        if (amount <= 0) return { success: false, reason: "Invalid amount." };

        try {
            const withdrawalId = await createWithdrawalRequest(
                user.id.toString(), 
                amount, 
                address, 
                user.username
            );
            
            // Deduct from balance immediately
            await saveData({
                totalMined: data.totalMined - amount
            });
            
            return { success: true, withdrawalId };
        } catch (error) {
            console.error('Error requesting withdrawal:', error);
            return { success: false, reason: "Failed to request withdrawal." };
        }
    };

    const requestDeposit = async (amount, transactionHash) => {
        if (!data || amount <= 0) return { success: false, reason: "Invalid amount." };
        
        try {
            const depositId = await createDepositRequest(
                user.id.toString(), 
                amount, 
                transactionHash, 
                user.username
            );
            
            return { success: true, depositId };
        } catch (error) {
            console.error('Error requesting deposit:', error);
            return { success: false, reason: "Failed to request deposit." };
        }
    };

    return { 
        data, 
        loading,
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
