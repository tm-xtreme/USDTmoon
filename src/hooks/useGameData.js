import React, { useState, useEffect, useCallback } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { 
  createOrUpdateUser , 
  getUser Data, 
  updateUser Data, 
  addTransaction,
  createWithdrawalRequest,
  createDepositRequest,
  subscribeToUser Data,
  completeTask,
  sendAdminNotification
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
                    const unsubscribe = subscribeToUser Data(user.id.toString(), (updatedData) => {
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
                await updateUser Data(user.id.toString(), newData);
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
                    if (task.type === 'auto') {
                        // Check Telegram status
                        const apiUrl = `https://api.telegram.org/botuser_bot_token/getChatMember?chat_id=@${task.target.replace('@', '')}&user_id=${user.id}`;
                        const res = await fetch(apiUrl);
                        const responseData = await res.json();

                        if (responseData.ok) {
                            const status = responseData.result.status;
                            if (['member', 'administrator', 'creator'].includes(status)) {
                                const verified = await completeTask(user.id, task.id);
                                if (verified) {
                                    const userMention = user.username ? `@${user.username}` : `User  ${user.id}`;
                                    await sendAdminNotification(`✅ <b>Auto-Verification Success</b>\n${userMention} successfully joined <b>${task.name}</b> (${task.target})\nReward: +${task.reward} STON`);
                                    toast({ 
                                        title: 'Joined Verified', 
                                        description: `+${task.reward} STON`, 
                                        variant: 'success', 
                                        className: "bg-[#1a1a1a] text-white" 
                                    });
                                    newData.userTasks[task.id].status = 'completed';
                                }
                            } else {
                                toast({ 
                                    title: 'Not Verified', 
                                    description: 'Please join the channel first.', 
                                    variant: 'destructive', 
                                    className: "bg-[#1a1a1a] text-white" 
                                });
                            }
                        } else if (responseData.error_code === 400 || responseData.error_code === 403) {
                            await sendAdminNotification(`❗ <b>Bot Error</b>\nBot is not an admin or failed to access @${task.target}. Please ensure it's added correctly.`);
                            toast({ 
                                title: 'Bot Error', 
                                description: 'Something Went Wrong, Please Wait and Try Again Later...', 
                                variant: 'destructive', 
                                className: "bg-[#1a1a1a] text-white" 
                            });
                        }
                    } else {
                        newData.userTasks[task.id].status = 'pending_approval';
                    }
                    break;
                case 'pending_claim':
                    // Handle claim logic
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

    return { 
        data, 
        loading,
        handleClaimStorage, 
        handleTaskAction, 
        isInitialized,
        saveData,
        addTransactionRecord,
        MINER_UPGRADE_COSTS,
        STORAGE_UPGRADE_COSTS,
        MAX_LEVEL
    };
};
                                      
