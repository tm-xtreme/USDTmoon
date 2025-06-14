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
        balance: 0,
        lastStorageSync: Date.now(),
        storageFillTime: Date.now() + 2 * 60 * 60 * 1000,
        minerLevel: 1,
        storageLevel: 1,
        minerRate: 0.000027,
        storageCapacity: 0.000054,
        storageMined: 0,
        userTasks: {},
        completedTasks: [],
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

// Transaction Management
export const addTransaction = async (userId, transactionData) => {
  try {
    const transactionsRef = collection(db, 'transactions');
    const docRef = await addDoc(transactionsRef, {
      userId,
      ...transactionData,
      createdAt: serverTimestamp()
    });
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
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const transactions = [];
    
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });
    
    return transactions;
  } catch (error) {
    console.error('Error getting transactions:', error);
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
      getCountFromServer(query(collection(db, 'pendingApprovals'), where('type', '==', 'withdrawal'), where('status', '==', 'pending'))),
      getCountFromServer(query(collection(db, 'pendingApprovals'), where('type', '==', 'deposit'), where('status', '==', 'pending'))),
      getCountFromServer(query(collection(db, 'pendingApprovals'), where('type', '==', 'task'), where('status', '==', 'pending')))
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

// Task submission and approval functions
export const submitTaskForApproval = async (userId, taskId, taskData) => {
  try {
    // Get user data
    const userData = await getUserData(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    const taskSubmission = {
      userId,
      taskId,
      taskTitle: taskData.title || taskData.name,
      taskReward: taskData.reward,
      taskDescription: taskData.description,
      taskType: taskData.type,
      userName: userData.firstName || userData.username || 'Unknown User',
      userTelegramId: userData.telegramId || 'N/A',
      submittedAt: serverTimestamp(),
      status: 'pending',
      type: 'task'
    };
    
    const docRef = await addDoc(collection(db, 'pendingApprovals'), taskSubmission);
    
    // Send admin notification
    await sendAdminNotification(`New task submission from ${taskSubmission.userName} for task: ${taskSubmission.taskTitle}`);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error submitting task for approval:', error);
    return { success: false, error: error.message };
  }
};

// Deposit request functions
export const submitDepositRequest = async (userId, amount, method, transactionId) => {
  try {
    // Get user data
    const userData = await getUserData(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    const depositRequest = {
      userId,
      amount: parseFloat(amount),
      method,
      transactionId,
      userName: userData.firstName || userData.username || 'Unknown User',
      userTelegramId: userData.telegramId || 'N/A',
      submittedAt: serverTimestamp(),
      status: 'pending',
      type: 'deposit'
    };
    
    const docRef = await addDoc(collection(db, 'pendingApprovals'), depositRequest);
    
    // Send admin notification
    await sendAdminNotification(`New deposit request from ${depositRequest.userName} for $${amount}`);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error submitting deposit request:', error);
    return { success: false, error: error.message };
  }
};

// Withdrawal request functions
export const submitWithdrawalRequest = async (userId, amount, method, walletAddress) => {
  try {
    // Get user data
    const userData = await getUserData(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    // Check if user has sufficient balance
    if ((userData.balance || 0) < amount) {
      throw new Error('Insufficient balance');
    }

    // Deduct balance temporarily (will be refunded if rejected)
    await updateUserData(userId, {
      balance: (userData.balance || 0) - amount
    });

    const withdrawalRequest = {
      userId,
      amount: parseFloat(amount),
      method,
      walletAddress,
      userName: userData.firstName || userData.username || 'Unknown User',
      userTelegramId: userData.telegramId || 'N/A',
      submittedAt: serverTimestamp(),
      status: 'pending',
      type: 'withdrawal'
    };
    
    const docRef = await addDoc(collection(db, 'pendingApprovals'), withdrawalRequest);
    
    // Send admin notification
    await sendAdminNotification(`New withdrawal request from ${withdrawalRequest.userName} for $${amount}`);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error submitting withdrawal request:', error);
    return { success: false, error: error.message };
  }
};

// Admin functions to get pending requests
export const getPendingTasks = async () => {
  try {
    const q = query(
      collection(db, 'pendingApprovals'),
      where('type', '==', 'task'),
      where('status', '==', 'pending'),
      orderBy('submittedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const pendingTasks = [];
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      pendingTasks.push({
        id: docSnapshot.id,
        ...data
      });
    });
    
    return pendingTasks;
  } catch (error) {
    console.error('Error getting pending tasks:', error);
    return [];
  }
};

export const getPendingDeposits = async () => {
  try {
    const q = query(
      collection(db, 'pendingApprovals'),
      where('type', '==', 'deposit'),
      where('status', '==', 'pending'),
      orderBy('submittedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const pendingDeposits = [];
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      pendingDeposits.push({
        id: docSnapshot.id,
        ...data
      });
    });
    
    return pendingDeposits;
  } catch (error) {
    console.error('Error getting pending deposits:', error);
    return [];
  }
};

export const getPendingWithdrawals = async () => {
  try {
    const q = query(
      collection(db, 'pendingApprovals'),
      where('type', '==', 'withdrawal'),
      where('status', '==', 'pending'),
      orderBy('submittedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const pendingWithdrawals = [];
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      pendingWithdrawals.push({
        id: docSnapshot.id,
        ...data
      });
    });
    
    return pendingWithdrawals;
  } catch (error) {
    console.error('Error getting pending withdrawals:', error);
    return [];
  }
};

// Admin approval/rejection functions
export const approveRequest = async (requestId, requestType) => {
  try {
    const requestRef = doc(db, 'pendingApprovals', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestDoc.data();
    
    // Update request status
    await updateDoc(requestRef, {
      status: 'approved',
      approvedAt: serverTimestamp()
    });
    
    // Handle different request types
    if (requestType === 'task') {
      // Update user's completed tasks and balance
      const userRef = doc(db, 'users', requestData.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newBalance = (userData.balance || 0) + requestData.taskReward;
        const completedTasks = userData.completedTasks || [];
        
        await updateDoc(userRef, {
          balance: newBalance,
          totalMined: (userData.totalMined || 0) + requestData.taskReward,
          completedTasks: [...completedTasks, requestData.taskId]
        });

        // Add transaction record for task reward
        await addTransaction(requestData.userId, {
          type: 'task_reward',
          amount: requestData.taskReward,
          description: `Task completed: ${requestData.taskTitle}`,
          status: 'completed'
        });
      }
    } else if (requestType === 'deposit') {
      // Update user's balance
      const userRef = doc(db, 'users', requestData.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newBalance = (userData.balance || 0) + requestData.amount;
        
        await updateDoc(userRef, {
          balance: newBalance
        });

        // Add transaction record for deposit
        await addTransaction(requestData.userId, {
          type: 'deposit',
          amount: requestData.amount,
          description: `Deposit via ${requestData.method}`,
          transactionId: requestData.transactionId,
          status: 'completed'
        });
      }
    } else if (requestType === 'withdrawal') {
      // Withdrawal approval - balance was already deducted when request was made
      // Just update the request status (already done above)
    }

    // Send admin notification for approval
    await sendAdminNotification(`${requestType.charAt(0).toUpperCase() + requestType.slice(1)} approved for ${requestData.userName}`);

    return { success: true };
  } catch (error) {
    console.error('Error approving request:', error);
    return { success: false, error: error.message };
  }
};

export const rejectRequest = async (requestId, requestType, reason = '') => {
  try {
    const requestRef = doc(db, 'pendingApprovals', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestDoc.data();
    
    // Update request status
    await updateDoc(requestRef, {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectionReason: reason
    });
    
    // If it's a withdrawal, refund the balance
    if (requestType === 'withdrawal') {
      const userRef = doc(db, 'users', requestData.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newBalance = (userData.balance || 0) + requestData.amount;
        
        await updateDoc(userRef, {
          balance: newBalance
        });
      }
    }

    // Send admin notification for rejection
    await sendAdminNotification(`${requestType.charAt(0).toUpperCase() + requestType.slice(1)} rejected for ${requestData.userName}. Reason: ${reason}`);

    return { success: true };
  } catch (error) {
    console.error('Error rejecting request:', error);
    return { success: false, error: error.message };
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
  const q = query(submissionsRef, where('status', '==', 'pending_approval'), orderBy('submittedAt', 'desc'));
  
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
