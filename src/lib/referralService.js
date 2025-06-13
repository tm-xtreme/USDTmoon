import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { addTransaction } from './firebaseService';

const REFERRAL_REWARDS = {
  directBonus: 0.5, // 0.5 USDT for referrer
  friendBonus: 0.2, // 0.2 USDT for new user
  miningSpeedBoost: 0.000001, // Additional mining rate per referral
};

export const processReferralSignup = async (newUserId, referrerId) => {
  try {
    if (!referrerId || referrerId === newUserId) return;

    const referrerRef = doc(db, 'users', referrerId);
    const referrerSnap = await getDoc(referrerRef);
    const newUserRef = doc(db, 'users', newUserId);
    const newUserSnap = await getDoc(newUserRef);

    if (!referrerSnap.exists() || !newUserSnap.exists()) return;

    const referrerData = referrerSnap.data();
    const newUserData = newUserSnap.data();

    // Update referrer's balance and mining rate
    const currentReferralCount = referrerData.referralCount || 0;
    const newMiningRate = referrerData.minerRate + REFERRAL_REWARDS.miningSpeedBoost;

    await updateDoc(referrerRef, {
      totalMined: referrerData.totalMined + REFERRAL_REWARDS.directBonus,
      minerRate: newMiningRate,
      referralCount: currentReferralCount + 1,
      updatedAt: serverTimestamp()
    });

    // Update new user's balance
    await updateDoc(newUserRef, {
      totalMined: newUserData.totalMined + REFERRAL_REWARDS.friendBonus,
      referredBy: referrerId,
      updatedAt: serverTimestamp()
    });

    // Add transaction records
    await addTransaction(referrerId, {
      type: 'referral_bonus',
      amount: REFERRAL_REWARDS.directBonus,
      fromUser: newUserId,
      reason: 'New referral signup'
    });

    await addTransaction(newUserId, {
      type: 'welcome_bonus',
      amount: REFERRAL_REWARDS.friendBonus,
      fromUser: referrerId,
      reason: 'Referral welcome bonus'
    });

    // Create referral record
    const referralRecordRef = doc(collection(db, 'referrals'));
    await setDoc(referralRecordRef, {
      referrerId: referrerId,
      referredUserId: newUserId,
      bonusAmount: REFERRAL_REWARDS.directBonus,
      friendBonusAmount: REFERRAL_REWARDS.friendBonus,
      createdAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error processing referral signup:', error);
    return false;
  }
};

export const getReferralStats = async (userId) => {
  try {
    // Get direct referrals
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referredBy', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const directReferrals = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      directReferrals.push({
        id: doc.id,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        photoUrl: userData.photoUrl,
        createdAt: userData.createdAt,
        totalMined: userData.totalMined || 0
      });
    });

    // Calculate total earnings from referrals
    const totalEarnings = directReferrals.length * REFERRAL_REWARDS.directBonus;
    const totalMiningBoost = directReferrals.length * REFERRAL_REWARDS.miningSpeedBoost;

    return {
      directReferrals,
      referralCount: directReferrals.length,
      totalEarnings,
      miningSpeedBoost: totalMiningBoost
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return { 
      directReferrals: [], 
      referralCount: 0, 
      totalEarnings: 0, 
      miningSpeedBoost: 0 
    };
  }
};

export const processReferralTaskReward = async (userId, taskReward) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return;
    
    const userData = userSnap.data();
    const referrerId = userData.referredBy;
    
    if (!referrerId) return;
    
    // Give 10% of task reward to referrer
    const referralBonus = taskReward * 0.1;
    
    const referrerRef = doc(db, 'users', referrerId);
    const referrerSnap = await getDoc(referrerRef);
    
    if (referrerSnap.exists()) {
      const referrerData = referrerSnap.data();
      
      await updateDoc(referrerRef, {
        totalMined: referrerData.totalMined + referralBonus,
        updatedAt: serverTimestamp()
      });
      
      // Add transaction record
      await addTransaction(referrerId, {
        type: 'referral_task_bonus',
        amount: referralBonus,
        fromUser: userId,
        reason: 'Referral task completion bonus'
      });
    }
  } catch (error) {
    console.error('Error processing referral task reward:', error);
  }
};

export const generateReferralLink = (userId, botUsername) => {
  return `https://t.me/${botUsername}?start=refTGID_${userId}`;
};

export const extractReferrerIdFromStartParam = (startParam) => {
  if (!startParam || !startParam.startsWith('refTGID_')) return null;
  return startParam.replace('refTGID_', '');
};
