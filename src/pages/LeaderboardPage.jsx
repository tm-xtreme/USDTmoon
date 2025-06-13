import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Award, Crown, RefreshCw, Users, Star, Zap } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { getAllUsers } from '@/lib/firebaseService';

const LeaderboardPage = () => {
    const { user } = useTelegram();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserRank, setCurrentUserRank] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        try {
            setLoading(true);
            const users = await getAllUsers(100); // Get top 100 users
            
            // Sort users by totalMined in descending order
            const sortedUsers = users
                .filter(u => u.totalMined > 0) // Only show users with some earnings
                .sort((a, b) => (b.totalMined || 0) - (a.totalMined || 0))
                .map((u, index) => ({
                    rank: index + 1,
                    id: u.id,
                    name: u.username || u.firstName || `User${u.telegramId}`,
                    firstName: u.firstName || '',
                    lastName: u.lastName || '',
                    fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || `User${u.telegramId}`,
                    usdt: u.totalMined || 0,
                    avatar: u.photoUrl || '',
                    referralCount: u.referralCount || 0,
                    minerLevel: u.minerLevel || 1,
                    storageLevel: u.storageLevel || 1,
                    lastActive: u.lastActive,
                    createdAt: u.createdAt,
                    isPremium: u.isPremium || false
                }));

            setLeaderboard(sortedUsers);

            // Find current user's rank
            if (user) {
                const userRank = sortedUsers.find(u => u.id === user.id.toString());
                setCurrentUserRank(userRank);
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadLeaderboard();
        setRefreshing(false);
    };

    const getRankIcon = (rank) => {
        switch (rank) {
            case 1:
                return <Crown className="h-5 w-5 text-yellow-500" />;
            case 2:
                return <Medal className="h-5 w-5 text-gray-400" />;
            case 3:
                return <Award className="h-5 w-5 text-amber-600" />;
            default:
                return <span className="text-sm font-bold w-5 text-center text-gray-600">{rank}</span>;
        }
    };

    const getRankBadgeColor = (rank) => {
        if (rank <= 3) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
        if (rank <= 10) return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white';
        if (rank <= 50) return 'bg-gradient-to-r from-green-400 to-green-600 text-white';
        return 'bg-gray-100 text-gray-700';
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Never';
        
        const now = new Date();
        const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return `${Math.floor(diffInHours / 168)}w ago`;
    };

    if (loading) {
        return (
            <div className="p-4 space-y-6">
                <div className="flex flex-col items-center text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow"></div>
                    <p className="mt-4 text-brand-text">Loading leaderboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex flex-col items-center text-center">
                <Trophy className="h-16 w-16 text-brand-yellow drop-shadow-lg" />
                <h1 className="text-3xl font-bold mt-2 text-brand-text">Top Miners</h1>
                <p className="text-brand-text/70">See who's leading the charge!</p>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="mt-2"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Current User Rank Card */}
            {currentUserRank && (
                <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                                {getRankIcon(currentUserRank.rank)}
                                <span className="text-lg font-bold">#{currentUserRank.rank}</span>
                            </div>
                            <Avatar className="h-12 w-12 border-2 border-white">
                                <AvatarImage src={currentUserRank.avatar} alt={currentUserRank.fullName} />
                                <AvatarFallback className="bg-white text-blue-600 font-bold">
                                    {currentUserRank.fullName[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-grow min-w-0">
                                <p className="font-bold text-lg truncate">Your Rank</p>
                                <p className="text-sm opacity-90 truncate">{currentUserRank.fullName}</p>
                                <p className="text-xs opacity-80">{currentUserRank.usdt.toFixed(6)} USDT</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Leaderboard Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white rounded-xl shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Users className="h-8 w-8 text-brand-yellow mx-auto mb-2" />
                        <p className="text-2xl font-bold text-brand-text">{leaderboard.length}</p>
                        <p className="text-sm text-brand-text/70">Active Miners</p>
                    </CardContent>
                </Card>
                <Card className="bg-white rounded-xl shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Trophy className="h-8 w-8 text-brand-yellow mx-auto mb-2" />
                        <p className="text-2xl font-bold text-brand-text">
                            {leaderboard[0]?.usdt.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-brand-text/70">Top Earner</p>
                    </CardContent>
                </Card>
            </div>

            {/* Leaderboard */}
            <Card className="bg-white rounded-2xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-brand-text">Global Rankings</CardTitle>
                    <CardDescription>Real-time leaderboard based on total USDT earned</CardDescription>
                </CardHeader>
                <CardContent>
                    {leaderboard.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <p>No miners found yet.</p>
                            <p className="text-sm">Be the first to start mining!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {leaderboard.slice(0, 50).map((userItem, index) => (
                                <div 
                                    key={userItem.id} 
                                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all hover:shadow-md ${
                                        index < 3 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200' : 
                                        userItem.id === user?.id.toString() ? 'bg-blue-50 border border-blue-200' : 
                                        'hover:bg-gray-50'
                                    }`}
                                >
                                    {/* Rank */}
                                    <div className="flex items-center justify-center w-8">
                                        {getRankIcon(userItem.rank)}
                                    </div>

                                    {/* Avatar */}
                                    <Avatar className="h-10 w-10 border-2 border-gray-200">
                                        <AvatarImage src={userItem.avatar} alt={userItem.fullName} />
                                        <AvatarFallback className="bg-brand-yellow text-white font-bold text-sm">
                                            {userItem.fullName[0]?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* User Info */}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <p className="font-bold text-lg text-brand-text truncate">
                                                {userItem.fullName}
                                            </p>
                                            {userItem.isPremium && (
                                                <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                            )}
                                            {userItem.id === user?.id.toString() && (
                                                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* User Stats Row 1 */}
                                        <div className="flex items-center space-x-3 text-xs text-gray-600 mt-0.5">
                                            <div className="flex items-center space-x-1">
                                                <Zap className="h-3 w-3" />
                                                <span>L{userItem.minerLevel}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Users className="h-3 w-3" />
                                                <span>{userItem.referralCount}</span>
                                            </div>
                                            <span className="text-gray-400">•</span>
                                            <span>{formatTimeAgo(userItem.lastActive)}</span>
                                        </div>
                                        
                                        {/* USDT Amount */}
                                        <div className="mt-1">
                                            <p className="text-sm font-semibold text-green-600">
                                                {userItem.usdt.toFixed(6)} USDT
                                            </p>
                                        </div>
                                    </div>

                                    {/* Rank Badge */}
                                    <div className={`px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ${getRankBadgeColor(userItem.rank)}`}>
                                        #{userItem.rank}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Show More Button */}
            {leaderboard.length > 50 && (
                <div className="text-center">
                    <p className="text-sm text-gray-500">
                        Showing top 50 miners. Total active miners: {leaderboard.length}
                    </p>
                </div>
            )}
        </div>
    );
};

export default LeaderboardPage;
