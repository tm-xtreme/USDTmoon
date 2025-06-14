import React, { useState, useEffect, useCallback } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { 
  createOrUpdateUser, 
  getUserData, 
  updateUserData, 
  addTransaction,
  createWithdrawalRequest,
  createDepositRequest,
  subscribeToUserData,
  subscribeToUserTaskSubmissions,
  getUserTaskSubmissions,
  createTaskSubmission,
  completeAutoTask,
  submitManualTask
} from '@/lib/firebaseService';
import { 
  processReferralSignup, 
  processReferralTaskReward,
  extractReferrerIdFromStartParam 
} from '@/lib/referralService';
import { useToast } from '@/components/ui/use-toast';

const CLAIM_FEE = 0.000007;
const MINER_UPGRADE_COSTS = [0, 0.05, 0.1, 0.2];
const STORAGE_UPGRADE_COSTS = [0, 0.005, 0.01, 0.02];
const MINER_RATES = [0, 0.000027, 0.000054, 0.000108];
const STORAGE_CAPACITIES = [0, 0.000027 * 2, 0.000054 * 2, 0.000108 * 2];
const MAX_LEVEL = 3;

// Admin notification function
const sendAdminNotification = async (message) => {
    try {
        await fetch(`https://api.telegram.org/bot8158970226:AAHcHhlZs5sL_eClx4UoGt9mx0edE2-N-Sw/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: '5063003944',
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (err) {
        console.error("Failed to send admin notification:", err);
    }
};

// User notification function
const sendUserNotification = async (userId, message) => {
    try {
        await fetch(`https://api.telegram.org/bot8158970226:AAHcHhlZs5sL_eClx4UoGt9mx0edE2-N-Sw/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: userId,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (err) {
        console.error("Failed to send user notification:", err);
    }
};

export const useGameData = () => {
    const { user, startParam } = useTelegram();
    const [data, setData] = useState(null);
    const [userTasks, setUserTasks] = useState({});
    const [isInitialized, setIsInitialized] = useState(false);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const initializeUser = async () => {
            if (user) {
                try {
                    setLoading(true);
                    
                    // Create or update user in Firebase
                    const telegramData = { user };
                    const userData = await createOrUpdateUser(telegramData);
                    setData(userData);
                    setIsInitialized(true);
                    
                    // Load user task submissions
                    const taskSubmissions = await getUserTaskSubmissions(user.id.toString());
                    setUserTasks(taskSubmissions);
                    
                    // Process referral if exists
                    const referrerId = extractReferrerIdFromStartParam(startParam);
                    if (referrerId) {
                        await processReferralSignup(user.id.toString(), referrerId);
                    }
                    
                    // Set up real-time listeners
                    const unsubscribeUser = subscribeToUserData(user.id.toString(), (updatedData) => {
                        setData(updatedData);
                    });

                    const unsubscribeTasks = subscribeToUserTaskSubmissions(user.id.toString(), (taskSubmissions) => {
                        setUserTasks(taskSubmissions);
                    });
                    
                    return () => {
                        unsubscribeUser();
                        unsubscribeTasks();
                    };
                } catch (error) {
                    console.error('Error initializing user:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        initializeUser();
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
        if (!data) return false;
        
        try {
            const userInfo = {
                username: data.username,
                firstName: data.firstName,
                lastName: data.lastName
            };

            if (task.type === 'auto') {
                // For auto tasks, use the completeAutoTask function
                const result = await completeAutoTask(user.id.toString(), task.id, task, userInfo);
                
                if (result.success) {
                    // Process referral task reward
                    await processReferralTaskReward(user.id.toString(), task.reward);
                    
                    const userMention = data.username ? `@${data.username}` : `User ${user.id}`;
                    await sendAdminNotification(`✅ <b>Auto-Task Completed</b>\n${userMention} completed <b>${task.name}</b>\nReward: +${task.reward} USDT`);
                    
                    return true;
                }
                return false;
            } else {
                // For manual tasks, use the submitManualTask function
                const result = await submitManualTask(user.id.toString(), task.id, task, userInfo);
                
                if (result.success) {
                    const userMention = data.username ? `@${data.username}` : `User ${user.id}`;
                    await sendAdminNotification(`📋 <b>Manual Task Submission</b>\n${userMention} submitted task: <b>${task.name}</b>\nDescription: ${task.description}\nReward: ${task.reward} USDT\nTarget: ${task.target}\n\nPlease review and approve/reject in admin panel.`);
                    
                    return true;
                }
                return false;
            }
        } catch (error) {
            console.error('Error handling task action:', error);
            return false;
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
        data: {
            ...data,
            userTasks // Include userTasks in the returned data
        }, 
        loading,
        handleClaimStorage, 
        handleTaskAction, 
        isInitialized,
        upgradeMiner,
        upgradeStorage,
        requestWithdrawal,
        requestDeposit,
        saveData,
        addTransactionRecord,
        MINER_UPGRADE_COSTS,
        STORAGE_UPGRADE_COSTS,
        MAX_LEVEL
    };
};
