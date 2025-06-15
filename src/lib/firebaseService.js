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
      await setDoc(userRef, {
        ...userData,
        totalMined: 0,
        lastStorageSync: Date.now(),
        storageFillTime: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
        minerLevel: 1,
        storageLevel: 1,
        minerRate: 0.000027,
        storageCapacity: 0.000054,
        storageMined: 0,
        referredBy: null,
        referralCount: 0,
        createdAt: serverTimestamp()
      });
    } else {
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
      userId: userId.toString(),
      taskId,
      taskName: taskData.name,
      taskDescription: taskData.description,
      taskReward: parseFloat(taskData.reward),
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

export const getUserTaskSubmissions = async (userId) => {
  try {
    const submissionsRef = collection(db, 'taskSubmissions');
    const q = query(
      submissionsRef, 
      where('userId', '==', userId.toString()),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const submissions = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      submissions[data.taskId] = {
        id: doc.id,
        status: data.status,
        submittedAt: data.submittedAt,
        rejectionReason: data.rejectionReason || null,
        ...data
      };
    });
    
    return submissions;
  } catch (error) {
    console.error('Error getting user task submissions:', error);
    return {};
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

export const approveTaskSubmission = async (submissionId, userId, taskReward) => {
  try {
    console.log('Approving task submission:', { submissionId, userId, taskReward });
    
    await updateTaskSubmissionStatus(submissionId, 'approved');
    
    const userData = await getUserData(userId);
    if (userData) {
      await updateUserData(userId, {
        totalMined: userData.totalMined + taskReward
      });
      
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

// Transaction Management
export const addTransaction = async (userId, transactionData) => {
  try {
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
    
    return transactions;
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
};

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
    const withdrawalsRef = collection(db, 'withdrawals');
    const docRef = await addDoc(withdrawalsRef, {
      userId: userId.toString(),
      username,
      amount: parseFloat(amount),
      address,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
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

export const approveWithdrawal = async (withdrawalId) => {
  try {
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    await updateDoc(withdrawalRef, {
      status: 'approved',
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    throw error;
  }
};

export const rejectWithdrawal = async (withdrawalId, userId, amount, reason = '') => {
  try {
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    await updateDoc(withdrawalRef, {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: serverTimestamp()
    });
    
    const userData = await getUserData(userId);
    if (userData) {
      await updateUserData(userId, {
        totalMined: userData.totalMined + amount
      });
      
      await addTransaction(userId, {
        type: 'withdrawal_refund',
        amount: amount,
        status: 'completed',
        reason: reason || 'Withdrawal rejected by admin'
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    throw error;
  }
};

// Deposit Management
export const createDepositRequest = async (userId, amount, transactionHash, username) => {
  try {
    const depositsRef = collection(db, 'deposits');
    const docRef = await addDoc(depositsRef, {
      userId: userId.toString(),
      username,
      amount: parseFloat(amount),
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

export const approveDeposit = async (depositId, userId, amount) => {
  try {
    const depositRef = doc(db, 'deposits', depositId);
    await updateDoc(depositRef, {
      status: 'approved',
      updatedAt: serverTimestamp()
    });
    
    const userData = await getUserData(userId);
    if (userData) {
      await updateUserData(userId, {
        totalMined: userData.totalMined + amount
      });
      
      await addTransaction(userId, {
        type: 'deposit_approved',
        amount: amount,
        status: 'completed',
        reason: 'Deposit approved by admin'
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error approving deposit:', error);
    throw error;
  }
};

export const rejectDeposit = async (depositId, reason = '') => {
  try {
    const depositRef = doc(db, 'deposits', depositId);
    await updateDoc(depositRef, {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error rejecting deposit:', error);
    throw error;
  }
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

export const subscribeToUserTaskSubmissions = (userId, callback) => {
  try {
    const submissionsRef = collection(db, 'taskSubmissions');
    const q = query(
      submissionsRef, 
      where('userId', '==', userId.toString()),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const submissions = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        submissions[data.taskId] = {
          id: doc.id,
          status: data.status,
          submittedAt: data.submittedAt,
          rejectionReason: data.rejectionReason || null,
          ...data
        };
      });
      callback(submissions);
    });
  } catch (error) {
    console.error('Error setting up user task submissions listener:', error);
    return () => {};
  }
};

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

// Admin Management
export const subscribeToAdminData = (callback) => {
  try {
    console.log('Setting up admin data subscriptions...');
    
    const unsubscribers = [];
    
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
    });
    unsubscribers.push(unsubscribeTaskSubmissions);

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
    });
    unsubscribers.push(unsubscribeWithdrawals);

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
    });
    unsubscribers.push(unsubscribeDeposits);

    return () => {
      console.log('Cleaning up admin data subscriptions...');
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  } catch (error) {
    console.error('Error setting up admin data subscriptions:', error);
    return () => {};
  }
};

// Additional helper functions
export const addClaimTransaction = async (userId, claimAmount, feeAmount) => {
  try {
    await addTransaction(userId, {
      type: 'claim',
      amount: claimAmount,
      status: 'completed'
    });
    
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
      type: upgradeType,
      amount: -cost,
      status: 'completed'
    });
    
    return true;
  } catch (error) {
    console.error('Error adding upgrade transaction:', error);
    throw error;
  }
};

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

// Analytics
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
    
    const analytics = {
      totals: {
        users: totalUsers.data().count,
        tasks: totalTasks.data().count,
        transactions: totalTransactions.data().count,
        withdrawals: totalWithdrawals.data().count,
        deposits: totalDeposits.data().count,
        taskSubmissions: totalTaskSubmissions.data().count
      }
    };
    
    console.log('Analytics data fetched:', analytics);
    return analytics;
  } catch (error) {
    console.error('Error getting analytics:', error);
    return {
      totals: { users: 0, tasks: 0, transactions: 0, withdrawals: 0, deposits: 0, taskSubmissions: 0 }
    };
  }
};
