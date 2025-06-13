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
      getCountFromServer(query(collection(db, 'userTaskSubmissions'), where('status', '==', 'pending')))
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
    const querySnapshot = await getDocs(tasksRef);
    
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
      createdAt: serverTimestamp()
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

// Pending Task Submissions
export const getPendingTaskSubmissions = async () => {
  try {
    const submissionsRef = collection(db, 'userTaskSubmissions');
    const q = query(submissionsRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
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

export const updateTaskSubmissionStatus = async (submissionId, status) => {
  try {
    const submissionRef = doc(db, 'userTaskSubmissions', submissionId);
    await updateDoc(submissionRef, {
      status,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating task submission status:', error);
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
    
    // Add transaction record
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
