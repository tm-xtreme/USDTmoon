import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  orderBy,
  serverTimestamp,
  deleteDoc,
  onSnapshot,
  getCountFromServer,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

// User Management
export const createOrUpdateUser = async (telegramData) => {
  try {
    const userId = telegramData.user.id.toString();
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    const userData = {
      telegramId: telegramData.user.id,
      username: telegramData.user.username || '',
      firstName: telegramData.user.first_name || '',
      lastName: telegramData.user.last_name || '',
      languageCode: telegramData.user.language_code || 'en',
      isPremium: telegramData.user.is_premium || false,
      photoUrl: telegramData.user.photo_url || '',
      lastActive: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (!userSnap.exists()) {
      // New user - create with game data
      await setDoc(userRef, {
        ...userData,
        // Game data
        totalMined: 0,
        lastStorageSync: Date.now(),
        storageFillTime: Date.now() + 2 * 60 * 60 * 1000,
        minerLevel: 1,
        storageLevel: 1,
        minerRate: 0.000027,
        storageCapacity: 0.000054,
        storageMined: 0,
        userTasks: {},
        // Additional fields
        referralCode: generateReferralCode(),
        referredBy: null,
        referralCount: 0,
        createdAt: serverTimestamp()
      });
    } else {
      // Existing user - update basic info only
      await updateDoc(userRef, userData);
    }

    return await getUserData(userId);
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
};

export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

export const updateUserData = async (userId, updateData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating user data:', error);
    throw error;
  }
};

// Admin Statistics
export const getAdminStats = async () => {
  try {
    const [
      totalUsersSnapshot,
      totalTasksSnapshot,
      pendingWithdrawalsSnapshot,
      pendingDepositsSnapshot,
      pendingTasksSnapshot
    ] = await Promise.all([
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(collection(db, 'tasks')),
      getCountFromServer(query(collection(db, 'withdrawals'), where('status', '==', 'pending'))),
      getCountFromServer(query(collection(db, 'deposits'), where('status', '==', 'pending'))),
      getCountFromServer(query(collection(db, 'taskSubmissions'), where('status', '==', 'pending_approval')))
    ]);

    return {
      totalUsers: totalUsersSnapshot.data().count,
      totalTasks: totalTasksSnapshot.data().count,
      pendingWithdrawals: pendingWithdrawalsSnapshot.data().count,
      pendingDeposits: pendingDepositsSnapshot.data().count,
      pendingTasks: pendingTasksSnapshot.data().count
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return {
      totalUsers: 0,
      totalTasks: 0,
      pendingWithdrawals: 0,
      pendingDeposits: 0,
      pendingTasks: 0
    };
  }
};

export const getAllUsers = async (limitCount = 100) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

// Task Management
export const getAllTasks = async () => {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const tasks = [];
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting tasks:', error);
    throw error;
  }
};

export const addTask = async (taskData) => {
  try {
    const tasksRef = collection(db, 'tasks');
    const docRef = await addDoc(tasksRef, {
      ...taskData,
      reward: parseFloat(taskData.reward),
      createdAt: serverTimestamp(),
      isActive: true
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
};

export const updateTask = async (taskId, taskData) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...taskData,
      reward: parseFloat(taskData.reward),
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (taskId) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

// Task Submissions Management
export const createTaskSubmission = async (userId, taskId, taskData, userInfo) => {
  try {
    const submissionsRef = collection(db, 'taskSubmissions');
    const docRef = await addDoc(submissionsRef, {
      userId,
      taskId,
      taskName: taskData.name,
      taskDescription: taskData.description,
      taskReward: taskData.reward,
      taskTarget: taskData.target,
      taskType: taskData.type,
      username: userInfo.username || '',
      firstName: userInfo.firstName || '',
      lastName: userInfo.lastName || '',
      status: 'pending_approval',
      submittedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating task submission:', error);
    throw error;
  }
};

export const getPendingTaskSubmissions = async () => {
  try {
    const submissionsRef = collection(db, 'taskSubmissions');
    const q = query(
      submissionsRef, 
      where('status', '==', 'pending_approval'), 
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const submissions = [];
    querySnapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() });
    });
    
    return submissions;
  } catch (error) {
    console.error('Error getting pending task submissions:', error);
    throw error;
  }
};

export const getAllTaskSubmissions = async (limitCount = 1000) => {
  try {
    const submissionsRef = collection(db, 'taskSubmissions');
    const q = query(submissionsRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const submissions = [];
    querySnapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() });
    });
    
    return submissions;
  } catch (error) {
    console.error('Error getting all task submissions:', error);
    throw error;
  }
};

export const updateTaskSubmissionStatus = async (submissionId, status, reason = '') => {
  try {
    const submissionRef = doc(db, 'taskSubmissions', submissionId);
    const updateData = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'approved') {
      updateData.approvedAt = serverTimestamp();
    } else if (status === 'rejected') {
      updateData.rejectedAt = serverTimestamp();
      if (reason) {
        updateData.rejectionReason = reason;
      }
    }
    
    await updateDoc(submissionRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating task submission status:', error);
    throw error;
  }
};

export const getTaskSubmission = async (submissionId) => {
  try {
    const submissionRef = doc(db, 'taskSubmissions', submissionId);
    const submissionSnap = await getDoc(submissionRef);
    
    if (submissionSnap.exists()) {
      return { id: submissionSnap.id, ...submissionSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting task submission:', error);
    throw error;
  }
};

// Complete Task Function (for auto tasks)
export const completeTask = async (userId, taskId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return false;
    }
    
    const userData = userSnap.data();
    const userTasks = userData.userTasks || {};
    
    // Update user task status to completed
    userTasks[taskId] = {
      status: 'completed',
      completedAt: new Date().toISOString()
    };
    
    await updateDoc(userRef, {
      userTasks,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error completing task:', error);
    return false;
  }
};

// Send Admin Notification Function
export const sendAdminNotification = async (message) => {
  try {
    const notificationsRef = collection(db, 'adminNotifications');
    await addDoc(notificationsRef, {
      message,
      type: 'task_notification',
      read: false,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return false;
  }
};

// Transaction Management - UPDATED FOR NESTED STRUCTURE
export const addTransaction = async (userId, transactionData) => {
  try {
    // Add to the nested transactions collection: transactions > transactions
    const transactionsRef = collection(db, 'transactions', 'transactions');
    const docRef = await addDoc(transactionsRef, {
      userId: userId.toString(),
      ...transactionData,
      amount: parseFloat(transactionData.amount),
      createdAt: serverTimestamp(),
      date: new Date().toISOString() // Keep both for compatibility
    });
    console.log('Transaction added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
};

export const getUserTransactions = async (userId, limitCount = 50) => {
  try {
    // Query the nested transactions collection: transactions > transactions > documents
    const transactionsRef = collection(db, 'transactions', 'transactions');
    const q = query(
      transactionsRef, 
      where('userId', '==', userId.toString()), // Ensure userId is string
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const transactions = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({ 
        id: doc.id, 
        ...data,
        // Ensure amount is a number
        amount: parseFloat(data.amount) || 0
      });
    });
    
    console.log(`Found ${transactions.length} transactions for user ${userId}`);
    return transactions;
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
};

// Withdrawal Management
export const createWithdrawalRequest = async (userId, amount, address, username) => {
  try {
    const withdrawalsRef = collection(db, 'withdrawals');
    const docRef = await addDoc(withdrawalsRef, {
      userId,
      username,
      amount,
      address,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    // Add transaction record using the updated function
    await addTransaction(userId, {
      type: 'withdrawal_request',
      amount: -amount,
      address,
      status: 'pending'
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    throw error;
  }
};

export const getPendingWithdrawals = async () => {
  try {
    const withdrawalsRef = collection(db, 'withdrawals');
    const q = query(withdrawalsRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const withdrawals = [];
    querySnapshot.forEach((doc) => {
      withdrawals.push({ id: doc.id, ...doc.data() });
    });
    
    return withdrawals;
  } catch (error) {
    console.error('Error getting pending withdrawals:', error);
    throw error;
  }
};

export const getAllWithdrawals = async (limitCount = 1000) => {
  try {
    const withdrawalsRef = collection(db, 'withdrawals');
    const q = query(withdrawalsRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const withdrawals = [];
    querySnapshot.forEach((doc) => {
      withdrawals.push({ id: doc.id, ...doc.data() });
    });
    
    return withdrawals;
  } catch (error) {
    console.error('Error getting all withdrawals:', error);
    throw error;
  }
};

export const updateWithdrawalStatus = async (withdrawalId, status) => {
  try {
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    await updateDoc(withdrawalRef, {
      status,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    throw error;
  }
};

// Deposit Management
export const createDepositRequest = async (userId, amount, transactionHash, username) => {
  try {
    const depositsRef = collection(db, 'deposits');
    const docRef = await addDoc(depositsRef, {
      userId,
      username,
      amount,
      transactionHash,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating deposit request:', error);
    throw error;
  }
};

export const getPendingDeposits = async () => {
  try {
    const depositsRef = collection(db, 'deposits');
    const q = query(depositsRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const deposits = [];
    querySnapshot.forEach((doc) => {
      deposits.push({ id: doc.id, ...doc.data() });
    });
    
    return deposits;
  } catch (error) {
    console.error('Error getting pending deposits:', error);
    throw error;
  }
};

export const getAllDeposits = async (limitCount = 1000) => {
  try {
    const depositsRef = collection(db, 'deposits');
    const q = query(depositsRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const deposits = [];
    querySnapshot.forEach((doc) => {
      deposits.push({ id: doc.id, ...doc.data() });
    });
    
    return deposits;
  } catch (error) {
    console.error('Error getting all deposits:', error);
    throw error;
  }
};

export const updateDepositStatus = async (depositId, status) => {
  try {
    const depositRef = doc(db, 'deposits', depositId);
    await updateDoc(depositRef, {
      status,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating deposit status:', error);
    throw error;
  }
};

// Task Approval/Rejection Functions - UPDATED TO USE NESTED TRANSACTIONS
export const approveTaskSubmission = async (submissionId, userId, taskReward) => {
  try {
    // Update submission status
    await updateTaskSubmissionStatus(submissionId, 'approved');
    
    // Get user data and update balance
    const userData = await getUserData(userId);
    if (userData) {
      await updateUserData(userId, {
        totalMined: userData.totalMined + taskReward
      });
      
      // Add transaction record using the updated function
      await addTransaction(userId, {
        type: 'task_reward',
        amount: taskReward,
        submissionId: submissionId,
        status: 'completed'
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error approving task submission:', error);
    throw error;
  }
};

export const rejectTaskSubmission = async (submissionId, reason = '') => {
  try {
    await updateTaskSubmissionStatus(submissionId, 'rejected', reason);
    return true;
  } catch (error) {
    console.error('Error rejecting task submission:', error);
    throw error;
  }
};

// Additional Transaction Functions for Claims and Fees
export const addClaimTransaction = async (userId, claimAmount, feeAmount) => {
  try {
    // Add claim transaction
    await addTransaction(userId, {
      type: 'claim',
      amount: claimAmount,
      status: 'completed'
    });
    
    // Add fee transaction if there's a fee
    if (feeAmount > 0) {
      await addTransaction(userId, {
        type: 'fee',
        amount: -feeAmount,
        status: 'completed'
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error adding claim transactions:', error);
    throw error;
  }
};

export const addUpgradeTransaction = async (userId, upgradeType, cost) => {
  try {
    await addTransaction(userId, {
      type: upgradeType, // 'upgrade_miner' or 'upgrade_storage'
      amount: -cost,
      status: 'completed'
    });
    
    return true;
  } catch (error) {
    console.error('Error adding upgrade transaction:', error);
    throw error;
  }
};

export const addDepositTransaction = async (userId, amount) => {
  try {
    await addTransaction(userId, {
      type: 'deposit_approved',
      amount: amount,
      status: 'completed'
    });
    
    return true;
  } catch (error) {
    console.error('Error adding deposit transaction:', error);
    throw error;
  }
};

export const addWithdrawalRefundTransaction = async (userId, amount, reason) => {
  try {
    await addTransaction(userId, {
      type: 'withdrawal_refund',
      amount: amount,
      status: 'completed',
      reason: reason || 'Withdrawal rejected by admin'
    });
    
    return true;
  } catch (error) {
    console.error('Error adding withdrawal refund transaction:', error);
    throw error;
  }
};

// Admin Notifications Management
export const getAdminNotifications = async (limitCount = 50) => {
  try {
    const notificationsRef = collection(db, 'adminNotifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const notifications = [];
    querySnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    
    return notifications;
  } catch (error) {
    console.error('Error getting admin notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'adminNotifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Utility Functions
const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Real-time listeners
export const subscribeToUserData = (userId, callback) => {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    }
  });
};

export const subscribeToTaskSubmissions = (callback) => {
  const submissionsRef = collection(db, 'taskSubmissions');
  const q = query(submissionsRef, where('status', '==', 'pending_approval'), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const submissions = [];
    querySnapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() });
    });
    callback(submissions);
  });
};

export const subscribeToAdminNotifications = (callback) => {
  const notificationsRef = collection(db, 'adminNotifications');
  const q = query(notificationsRef, where('read', '==', false), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const notifications = [];
    querySnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    callback(notifications);
  });
};

// Real-time listener for user transactions
export const subscribeToUserTransactions = (userId, callback) => {
  const transactionsRef = collection(db, 'transactions', 'transactions');
  const q = query(
    transactionsRef, 
    where('userId', '==', userId.toString()),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const transactions = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({ 
        id: doc.id, 
        ...data,
        amount: parseFloat(data.amount) || 0
      });
    });
    callback(transactions);
  });
};
                     
