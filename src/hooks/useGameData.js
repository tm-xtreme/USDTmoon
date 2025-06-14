import React, { useState, useEffect, useCallback } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { 
  createOrUpdateUser, 
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
                chat_id: '5063003944', // Admin user ID
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
        if (!data) return;
        
        try {
            let userTaskState = data.userTasks[task.id] || { status: 'new' };
            let newData = { ...data };
            
            switch(userTaskState.status) {
                case 'new': 
                    if (task.type === 'auto') {
                        // Check Telegram status for auto tasks
                        try {
                            const apiUrl = `https://api.telegram.org/bot8158970226:AAHcHhlZs5sL_eClx4UoGt9mx0edE2-N-Sw/getChatMember?chat_id=@${task.target.replace('@', '')}&user_id=${user.id}`;
                            const res = await fetch(apiUrl);
                            const responseData = await res.json();

                            if (responseData.ok) {
                                const status = responseData.result.status;
                                if (['member', 'administrator', 'creator'].includes(status)) {
                                    // User is verified, complete task automatically
                                    userTaskState.status = 'completed';
                                    newData.totalMined += task.reward;
                                    
                                    await addTransactionRecord('task_reward', task.reward);
                                    await processReferralTaskReward(user.id.toString(), task.reward);
                                    
                                    const userMention = user.username ? `@${user.username}` : `User ${user.id}`;
                                    await sendAdminNotification(`✅ <b>Auto-Verification Success</b>\n${userMention} successfully joined <b>${task.name}</b> (${task.target})\nReward: +${task.reward} USDT`);
                                    
                                    toast({ 
                                        title: 'Task Completed!', 
                                        description: `+${task.reward} USDT earned!`, 
                                    });
                                } else {
                                    toast({ 
                                        title: 'Not Verified', 
                                        description: 'Please join the channel first.', 
                                        variant: 'destructive'
                                    });
                                    return; // Don't update status if not verified
                                }
                            } else if (responseData.error_code === 400 || responseData.error_code === 403) {
                                await sendAdminNotification(`❗ <b>Bot Error</b>\nBot is not an admin or failed to access @${task.target}. Please ensure it's added correctly.`);
                                toast({ 
                                    title: 'Bot Error', 
                                    description: 'Something went wrong, please try again later...', 
                                    variant: 'destructive'
                                });
                                return;
                            }
                        } catch (error) {
                            console.error('Error checking Telegram status:', error);
                            toast({ 
                                title: 'Error', 
                                description: 'Failed to verify task. Please try again.', 
                                variant: 'destructive'
                            });
                            return;
                        }
                    } else {
                        // Manual task - send for admin approval
                        userTaskState.status = 'pending_approval';
                        userTaskState.submittedAt = new Date().toISOString();
                        
                        const userMention = user.username ? `@${user.username}` : `User ${user.id}`;
                        await sendAdminNotification(`📋 <b>Manual Task Submission</b>\n${userMention} submitted task: <b>${task.name}</b>\nDescription: ${task.description}\nReward: ${task.reward} USDT\nTarget: ${task.target}\n\nPlease review and approve/reject in admin panel.`);
                        
                        toast({
                            title: "Task Submitted!",
                            description: "Pending admin approval.",
                        });
                    }
                    break;
                    
                case 'pending_claim':
                    if (task.type === 'auto') {
                        await addTransactionRecord('task_reward', task.reward);
                        userTaskState.status = 'completed';
                        newData.totalMined += task.reward;

                        // Process referral task reward
                        await processReferralTaskReward(user.id.toString(), task.reward);
                        
                        toast({
                            title: "Reward Claimed!",
                            description: `+${task.reward} USDT`,
                        });
                    } else { 
                        userTaskState.status = 'pending_approval'; 
                        
                        toast({
                            title: "Task Submitted!",
                            description: "Pending admin approval.",
                        });
                    }
                    break;
                    
                default: 
                    break;
            }
            
            newData.userTasks = { ...data.userTasks, [task.id]: userTaskState };
            await saveData(newData);
        } catch (error) {
            console.error('Error handling task action:', error);
            toast({
                title: "Error",
                description: "Failed to process task. Please try again.",
                variant: "destructive"
            });
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

    // Admin functions for task approval/rejection
    const approveTask = async (userId, taskId, taskDetails) => {
        try {
            const userData = await getUserData(userId);
            if (!userData) return { success: false, reason: "User not found." };

            const updatedUserTasks = {
                ...userData.userTasks,
                [taskId]: { 
                    ...userData.userTasks[taskId], 
                    status: 'completed',
                    approvedAt: new Date().toISOString()
                }
            };

            const newData = {
                totalMined: userData.totalMined + taskDetails.reward,
                userTasks: updatedUserTasks
            };

            await updateUserData(userId, newData);
            await addTransaction(userId, {
                type: 'task_reward',
                amount: taskDetails.reward,
                date: new Date().toISOString(),
                taskId: taskId,
                taskName: taskDetails.name
            });

            // Process referral task reward
            await processReferralTaskReward(userId, taskDetails.reward);

            // Notify user about approval
            const userMention = userData.username ? `@${userData.username}` : `User ${userId}`;
            await sendUserNotification(userId, `✅ <b>Task Approved!</b>\n\nYour task "<b>${taskDetails.name}</b>" has been approved!\n\n💰 Reward: +${taskDetails.reward} USDT\n📝 Description: ${taskDetails.description}\n\nKeep up the great work! 🚀`);

            // Notify admin
            await sendAdminNotification(`✅ <b>Task Approved</b>\nAdmin approved task for ${userMention}\nTask: <b>${taskDetails.name}</b>\nReward: +${taskDetails.reward} USDT`);

            return { success: true };
        } catch (error) {
            console.error('Error approving task:', error);
            return { success: false, reason: "Failed to approve task." };
        }
    };

    const rejectTask = async (userId, taskId, taskDetails, reason = '') => {
        try {
            const userData = await getUserData(userId);
            if (!userData) return { success: false, reason: "User not found." };

            const updatedUserTasks = {
                ...userData.userTasks,
                [taskId]: { 
                    status: 'new', // Reset to new so user can try again
                    rejectedAt: new Date().toISOString(),
                    rejectionReason: reason
                }
            };

            await updateUserData(userId, { userTasks: updatedUserTasks });

            // Notify user about rejection
            const userMention = userData.username ? `@${userData.username}` : `User ${userId}`;
            const rejectionMessage = reason ? 
                `❌ <b>Task Rejected</b>\n\nYour task "<b>${taskDetails.name}</b>" has been rejected.\n\n📝 Reason: ${reason}\n\nYou can try submitting this task again. Please make sure to follow the requirements carefully.` :
                `❌ <b>Task Rejected</b>\n\nYour task "<b>${taskDetails.name}</b>" has been rejected.\n\nYou can try submitting this task again. Please make sure to follow the requirements carefully.`;
            
            await sendUserNotification(userId, rejectionMessage);

            // Notify admin
            await sendAdminNotification(`❌ <b>Task Rejected</b>\nAdmin rejected task for ${userMention}\nTask: <b>${taskDetails.name}</b>\nReason: ${reason || 'No reason provided'}`);

            return { success: true };
        } catch (error) {
            console.error('Error rejecting task:', error);
            return { success: false, reason: "Failed to reject task." };
        }
    };

    // At the end of your useGameData hook, update the return statement:
    return { 
        data, 
        setData,  // Add this line
        loading,
        handleClaimStorage, 
        handleTaskAction, 
        simulateAdminApproval, 
        isInitialized,
        upgradeMiner,
        upgradeStorage,
        requestWithdrawal,
        requestDeposit,
        approveTask,
        rejectTask,
        saveData,
        addTransactionRecord,
        MINER_UPGRADE_COSTS,
        STORAGE_UPGRADE_COSTS,
        MAX_LEVEL
    };
};
