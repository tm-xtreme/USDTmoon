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
    console.log('Fetching admin stats...');
    
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

    const stats = {
      totalUsers: totalUsersSnapshot.data().count,
      totalTasks: totalTasksSnapshot.data().count,
      pendingWithdrawals: pendingWithdrawalsSnapshot.data().count,
      pendingDeposits: pendingDepositsSnapshot.data().count,
      pendingTasks: pendingTasksSnapshot.data().count
    };

    console.log('Admin stats fetched:', stats);
    return stats;
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
    console.log('Creating task submission:', { userId, taskId, taskData, userInfo });
    
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
    
    console.log('Task submission created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating task submission:', error);
    throw error;
  }
};

export const getPendingTaskSubmissions = async () => {
  try {
    console.log('Fetching pending task submissions...');
    
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
    
    console.log('Pending task submissions fetched:', submissions.length);
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
    console.log('Updating task submission status:', { submissionId, status, reason });
    
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
    console.log('Task submission status updated successfully');
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

// Transaction Management - CORRECTED FOR ACTUAL FIRESTORE STRUCTURE
export const addTransaction = async (userId, transactionData) => {
  try {
    // Add directly to transactions collection: transactions/{auto-generated-id}
    const transactionsRef = collection(db, 'transactions');
    const docRef = await addDoc(transactionsRef, {
      userId: userId.toString(),
      ...transactionData,
      amount: parseFloat(transactionData.amount),
      createdAt: serverTimestamp(),
      date: new Date().toISOString()
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
    console.log('Getting transactions for user:', userId);
    
    // Query directly from transactions collection
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef, 
      where('userId', '==', userId.toString()),
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

// Get all transactions (for admin)
export const getAllTransactions = async (limitCount = 1000) => {
  try {
    const transactionsRef = collection(db, 'transactions');
    const q = query(transactionsRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const transactions = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({ 
        id: doc.id, 
        ...data,
        amount: parseFloat(data.amount) || 0
      });
    });
    
    return transactions;
  } catch (error) {
    console.error('Error getting all transactions:', error);
    throw error;
  }
};

// Update transaction status
export const updateTransactionStatus = async (transactionId, status, additionalData = {}) => {
  try {
    const transactionRef = doc(db, 'transactions', transactionId);
    await updateDoc(transactionRef, {
      status,
      ...additionalData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating transaction status:', error);
    throw error;
  }
};

// Get specific transaction
export const getTransaction = async (transactionId) => {
  try {
    const transactionRef = doc(db, 'transactions', transactionId);
    const transactionSnap = await getDoc(transactionRef);
    
    if (transactionSnap.exists()) {
      return { id: transactionSnap.id, ...transactionSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting transaction:', error);
    throw error;
  }
};

// Delete transaction
export const deleteTransaction = async (transactionId) => {
  try {
    const transactionRef = doc(db, 'transactions', transactionId);
    await deleteDoc(transactionRef);
    return true;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

// Withdrawal Management
export const createWithdrawalRequest = async (userId, amount, address, username) => {
  try {
    console.log('Creating withdrawal request:', { userId, amount, address, username });
    
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
    
    console.log('Withdrawal request created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    throw error;
  }
};

export const getPendingWithdrawals = async () => {
  try {
    console.log('Fetching pending withdrawals...');
    
    const withdrawalsRef = collection(db, 'withdrawals');
    const q = query(withdrawalsRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const withdrawals = [];
    querySnapshot.forEach((doc) => {
      withdrawals.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('Pending withdrawals fetched:', withdrawals.length);
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
    console.log('Updating withdrawal status:', { withdrawalId, status });
    
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    await updateDoc(withdrawalRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    console.log('Withdrawal status updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    throw error;
  }
};

// Deposit Management
export const createDepositRequest = async (userId, amount, transactionHash, username) => {
  try {
    console.log('Creating deposit request:', { userId, amount, transactionHash, username });
    
    const depositsRef = collection(db, 'deposits');
    const docRef = await addDoc(depositsRef, {
      userId,
      username,
      amount,
      transactionHash,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    console.log('Deposit request created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating deposit request:', error);
    throw error;
  }
};

export const getPendingDeposits = async () => {
  try {
    console.log('Fetching pending deposits...');
    
    const depositsRef = collection(db, 'deposits');
    const q = query(depositsRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const deposits = [];
    querySnapshot.forEach((doc) => {
      deposits.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('Pending deposits fetched:', deposits.length);
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
    console.log('Updating deposit status:', { depositId, status });
    
    const depositRef = doc(db, 'deposits', depositId);
    await updateDoc(depositRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    console.log('Deposit status updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating deposit status:', error);
    throw error;
  }
};

// Task Approval/Rejection Functions - UPDATED TO USE CORRECT TRANSACTIONS
export const approveTaskSubmission = async (submissionId, userId, taskReward) => {
  try {
    console.log('Approving task submission:', { submissionId, userId, taskReward });
    
    // Update submission status
    await updateTaskSubmissionStatus(submissionId, 'approved');
    
    // Get user data and update balance
    const userData = await getUserData(userId);
    if (userData) {
      await updateUserData(userId, {
        totalMined: userData.totalMined + taskReward
      });
      
      // Add transaction record using the corrected function
      await addTransaction(userId, {
        type: 'task_reward',
        amount: taskReward,
        submissionId: submissionId,
        status: 'completed'
      });
    }
    
    console.log('Task submission approved successfully');
    return true;
  } catch (error) {
    console.error('Error approving task submission:', error);
    throw error;
  }
};

export const rejectTaskSubmission = async (submissionId, reason = '') => {
  try {
    console.log('Rejecting task submission:', { submissionId, reason });
    
    await updateTaskSubmissionStatus(submissionId, 'rejected', reason);
    
    console.log('Task submission rejected successfully');
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
  const transactionsRef = collection(db, 'transactions');
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

// NEW: Real-time listeners for admin dashboard
export const subscribeToAdminData = (callback) => {
  try {
    console.log('Setting up admin data subscriptions...');
    
    // Subscribe to pending task submissions
    const taskSubmissionsRef = collection(db, 'taskSubmissions');
    const taskSubmissionsQuery = query(
      taskSubmissionsRef, 
      where('status', '==', 'pending_approval'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeTaskSubmissions = onSnapshot(taskSubmissionsQuery, (snapshot) => {
      const submissions = [];
      snapshot.forEach((doc) => {
        submissions.push({ id: doc.id, ...doc.data() });
      });
      console.log('Real-time task submissions update:', submissions.length);
      callback('taskSubmissions', submissions);
    }, (error) => {
      console.error('Error in task submissions listener:', error);
      callback('taskSubmissions', []);
    });

    // Subscribe to pending withdrawals
    const withdrawalsRef = collection(db, 'withdrawals');
    const withdrawalsQuery = query(
      withdrawalsRef, 
      where('status', '==', 'pending'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
      const withdrawals = [];
      snapshot.forEach((doc) => {
        withdrawals.push({ id: doc.id, ...doc.data() });
      });
      console.log('Real-time withdrawals update:', withdrawals.length);
      callback('withdrawals', withdrawals);
    }, (error) => {
      console.error('Error in withdrawals listener:', error);
      callback('withdrawals', []);
    });

    // Subscribe to pending deposits
    const depositsRef = collection(db, 'deposits');
    const depositsQuery = query(
      depositsRef, 
      where('status', '==', 'pending'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeDeposits = onSnapshot(depositsQuery, (snapshot) => {
      const deposits = [];
      snapshot.forEach((doc) => {
        deposits.push({ id: doc.id, ...doc.data() });
      });
      console.log('Real-time deposits update:', deposits.length);
      callback('deposits', deposits);
    }, (error) => {
      console.error('Error in deposits listener:', error);
      callback('deposits', []);
    });

    // Return cleanup function
    return () => {
      console.log('Cleaning up admin data subscriptions...');
      unsubscribeTaskSubmissions();
      unsubscribeWithdrawals();
      unsubscribeDeposits();
    };
  } catch (error) {
    console.error('Error setting up admin data subscriptions:', error);
    return () => {}; // Return empty cleanup function
  }
};

// Enhanced withdrawal functions with better error handling
export const approveWithdrawal = async (withdrawalId) => {
  try {
    console.log('Approving withdrawal:', withdrawalId);
    
    await updateWithdrawalStatus(withdrawalId, 'approved');
    
    console.log('Withdrawal approved successfully');
    return true;
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    throw error;
  }
};

export const rejectWithdrawal = async (withdrawalId, userId, amount, reason = '') => {
  try {
    console.log('Rejecting withdrawal:', { withdrawalId, userId, amount, reason });
    
    // Update withdrawal status
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
        status: 'completed',
        reason: reason || 'Withdrawal rejected by admin'
      });
    }
    
    console.log('Withdrawal rejected and refunded successfully');
    return true;
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    throw error;
  }
};

// Enhanced deposit functions with better error handling
export const approveDeposit = async (depositId, userId, amount) => {
  try {
    console.log('Approving deposit:', { depositId, userId, amount });
    
    // Update deposit status
    await updateDepositStatus(depositId, 'approved');
    
    // Add amount to user balance
    const userData = await getUserData(userId);
    if (userData) {
      await updateUserData(userId, {
        totalMined: userData.totalMined + amount
      });
      
      // Add deposit transaction
      await addTransaction(userId, {
        type: 'deposit_approved',
        amount: amount,
        status: 'completed',
        reason: 'Deposit approved by admin'
      });
    }
    
    console.log('Deposit approved successfully');
    return true;
  } catch (error) {
    console.error('Error approving deposit:', error);
    throw error;
  }
};

export const rejectDeposit = async (depositId, reason = '') => {
  try {
    console.log('Rejecting deposit:', { depositId, reason });
    
    // Update deposit status with reason
    const depositRef = doc(db, 'deposits', depositId);
    await updateDoc(depositRef, {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: serverTimestamp()
    });
    
    console.log('Deposit rejected successfully');
    return true;
  } catch (error) {
    console.error('Error rejecting deposit:', error);
    throw error;
  }
};

// Enhanced admin stats with real-time updates
export const subscribeToAdminStats = (callback) => {
  try {
    console.log('Setting up admin stats subscription...');
    
    // We'll use a combination of listeners to update stats in real-time
    const unsubscribers = [];
    
    // Listen to users collection
    const usersRef = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersRef, () => {
      // Trigger stats refresh when users change
      getAdminStats().then(callback);
    });
    unsubscribers.push(unsubscribeUsers);
    
    // Listen to tasks collection
    const tasksRef = collection(db, 'tasks');
    const unsubscribeTasks = onSnapshot(tasksRef, () => {
      // Trigger stats refresh when tasks change
      getAdminStats().then(callback);
    });
    unsubscribers.push(unsubscribeTasks);
    
    // Listen to pending withdrawals
    const withdrawalsQuery = query(collection(db, 'withdrawals'), where('status', '==', 'pending'));
    const unsubscribeWithdrawals = onSnapshot(withdrawalsQuery, () => {
      getAdminStats().then(callback);
    });
    unsubscribers.push(unsubscribeWithdrawals);
    
    // Listen to pending deposits
    const depositsQuery = query(collection(db, 'deposits'), where('status', '==', 'pending'));
    const unsubscribeDeposits = onSnapshot(depositsQuery, () => {
      getAdminStats().then(callback);
    });
    unsubscribers.push(unsubscribeDeposits);
    
    // Listen to pending task submissions
    const taskSubmissionsQuery = query(collection(db, 'taskSubmissions'), where('status', '==', 'pending_approval'));
    const unsubscribeTaskSubmissions = onSnapshot(taskSubmissionsQuery, () => {
      getAdminStats().then(callback);
    });
    unsubscribers.push(unsubscribeTaskSubmissions);
    
    // Initial load
    getAdminStats().then(callback);
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up admin stats subscription...');
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  } catch (error) {
    console.error('Error setting up admin stats subscription:', error);
    return () => {};
  }
};

// Batch operations for better performance
export const batchApproveTaskSubmissions = async (submissionIds) => {
  try {
    console.log('Batch approving task submissions:', submissionIds);
    
    const results = await Promise.allSettled(
      submissionIds.map(async (submissionId) => {
        const submission = await getTaskSubmission(submissionId);
        if (submission) {
          return approveTaskSubmission(submissionId, submission.userId, submission.taskReward);
        }
        return false;
      })
    );
    
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
    console.log(`Batch approval completed: ${successful}/${submissionIds.length} successful`);
    
    return { successful, total: submissionIds.length };
  } catch (error) {
    console.error('Error in batch approve task submissions:', error);
    throw error;
  }
};

export const batchRejectTaskSubmissions = async (submissionIds, reason = '') => {
  try {
    console.log('Batch rejecting task submissions:', submissionIds);
    
    const results = await Promise.allSettled(
      submissionIds.map(submissionId => rejectTaskSubmission(submissionId, reason))
    );
    
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
    console.log(`Batch rejection completed: ${successful}/${submissionIds.length} successful`);
    
    return { successful, total: submissionIds.length };
  } catch (error) {
    console.error('Error in batch reject task submissions:', error);
    throw error;
  }
};

// Search and filter functions for admin
export const searchUsers = async (searchTerm, limitCount = 50) => {
  try {
    console.log('Searching users:', searchTerm);
    
    const usersRef = collection(db, 'users');
    
    // Search by username or firstName
    const queries = [
      query(usersRef, where('username', '>=', searchTerm), where('username', '<=', searchTerm + '\uf8ff'), limit(limitCount)),
      query(usersRef, where('firstName', '>=', searchTerm), where('firstName', '<=', searchTerm + '\uf8ff'), limit(limitCount))
    ];
    
    const results = await Promise.all(queries.map(q => getDocs(q)));
    const users = new Map(); // Use Map to avoid duplicates
    
    results.forEach(querySnapshot => {
      querySnapshot.forEach(doc => {
        users.set(doc.id, { id: doc.id, ...doc.data() });
      });
    });
    
    return Array.from(users.values());
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

export const getTransactionsByType = async (type, limitCount = 100) => {
  try {
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef, 
      where('type', '==', type), 
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
        amount: parseFloat(data.amount) || 0
      });
    });
    
    return transactions;
  } catch (error) {
    console.error('Error getting transactions by type:', error);
    throw error;
  }
};

export const getTransactionsByDateRange = async (startDate, endDate, limitCount = 1000) => {
  try {
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate),
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
        amount: parseFloat(data.amount) || 0
      });
    });
    
    return transactions;
  } catch (error) {
    console.error('Error getting transactions by date range:', error);
    throw error;
  }
};

// Analytics functions
export const getAnalytics = async () => {
  try {
    console.log('Fetching analytics data...');
    
    const [
      totalUsers,
      totalTasks,
      totalTransactions,
      totalWithdrawals,
      totalDeposits,
      totalTaskSubmissions
    ] = await Promise.all([
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(collection(db, 'tasks')),
      getCountFromServer(collection(db, 'transactions')),
      getCountFromServer(collection(db, 'withdrawals')),
      getCountFromServer(collection(db, 'deposits')),
      getCountFromServer(collection(db, 'taskSubmissions'))
    ]);
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [
      recentUsers,
      recentTransactions,
      recentWithdrawals,
      recentDeposits
    ] = await Promise.all([
      getCountFromServer(query(collection(db, 'users'), where('createdAt', '>=', sevenDaysAgo))),
      getCountFromServer(query(collection(db, 'transactions'), where('createdAt', '>=', sevenDaysAgo))),
      getCountFromServer(query(collection(db, 'withdrawals'), where('createdAt', '>=', sevenDaysAgo))),
      getCountFromServer(query(collection(db, 'deposits'), where('createdAt', '>=', sevenDaysAgo)))
    ]);
    
    const analytics = {
      totals: {
        users: totalUsers.data().count,
        tasks: totalTasks.data().count,
        transactions: totalTransactions.data().count,
        withdrawals: totalWithdrawals.data().count,
        deposits: totalDeposits.data().count,
        taskSubmissions: totalTaskSubmissions.data().count
      },
      recent: {
        users: recentUsers.data().count,
        transactions: recentTransactions.data().count,
        withdrawals: recentWithdrawals.data().count,
        deposits: recentDeposits.data().count
      }
    };
    
    console.log('Analytics data fetched:', analytics);
    return analytics;
  } catch (error) {
    console.error('Error getting analytics:', error);
    return {
      totals: { users: 0, tasks: 0, transactions: 0, withdrawals: 0, deposits: 0, taskSubmissions: 0 },
      recent: { users: 0, transactions: 0, withdrawals: 0, deposits: 0 }
    };
  }
};

// Export all functions
export default {
  // User functions
  createOrUpdateUser,
  getUserData,
  updateUserData,
  getAllUsers,
  searchUsers,
  
  // Task functions
  getAllTasks,
  addTask,
  updateTask,
  deleteTask,
  completeTask,
  
  // Task submission functions
  createTaskSubmission,
  getPendingTaskSubmissions,
  getAllTaskSubmissions,
  updateTaskSubmissionStatus,
  getTaskSubmission,
  approveTaskSubmission,
  rejectTaskSubmission,
  batchApproveTaskSubmissions,
  batchRejectTaskSubmissions,
  
  // Transaction functions
  addTransaction,
  getUserTransactions,
  getAllTransactions,
  updateTransactionStatus,
  getTransaction,
  deleteTransaction,
  getTransactionsByType,
  getTransactionsByDateRange,
  addClaimTransaction,
  addUpgradeTransaction,
  addDepositTransaction,
  addWithdrawalRefundTransaction,
  
  // Withdrawal functions
  createWithdrawalRequest,
  getPendingWithdrawals,
  getAllWithdrawals,
  updateWithdrawalStatus,
  approveWithdrawal,
  rejectWithdrawal,
  
  // Deposit functions
  createDepositRequest,
  getPendingDeposits,
  getAllDeposits,
  updateDepositStatus,
  approveDeposit,
  rejectDeposit,
  
  // Admin functions
  getAdminStats,
  getAnalytics,
  
  // Notification functions
  sendAdminNotification,
  getAdminNotifications,
  markNotificationAsRead,
  
  // Real-time listeners
  subscribeToUserData,
  subscribeToTaskSubmissions,
  subscribeToAdminNotifications,
  subscribeToUserTransactions,
  subscribeToAdminData,
  subscribeToAdminStats
};
