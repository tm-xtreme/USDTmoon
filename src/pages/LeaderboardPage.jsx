import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy } from 'lucide-react';

const mockLeaderboard = [
    { rank: 1, name: 'CryptoKing', usdt: 1250.75, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704a' },
    { rank: 2, name: 'MineMaster', usdt: 1100.50, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704b' },
    { rank: 3, name: 'USDTWhale', usdt: 980.25, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704c' },
    { rank: 4, name: 'CoinCollector', usdt: 850.00, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
    { rank: 5, name: 'SatoshiJr', usdt: 720.80, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e' },
    { rank: 6, name: 'EtheriumGod', usdt: 610.90, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704f' },
    { rank: 7, name: 'MoonLambo', usdt: 550.00, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704g' },
    { rank: 8, name: 'DiamondHands', usdt: 480.45, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704h' },
    { rank: 9, name: 'Miner49er', usdt: 420.69, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704i' },
    { rank: 10, name: 'JustHodlIt', usdt: 390.10, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704j' },
];

const LeaderboardPage = () => {
    return (
        <div className="p-4 space-y-6">
            <div className="flex flex-col items-center text-center">
                <Trophy className="h-16 w-16 text-brand-yellow drop-shadow-lg" />
                <h1 className="text-3xl font-bold mt-2">Top Miners</h1>
                <p className="text-gray-600">See who's leading the charge!</p>
            </div>

            <Card className="bg-white rounded-2xl shadow-md">
                <CardHeader>
                    <CardTitle>Global Rankings</CardTitle>
                    <CardDescription>Real-time data requires backend integration. This is mock data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {mockLeaderboard.map((user, index) => (
                            <div key={user.rank} className={`flex items-center space-x-4 p-3 rounded-lg ${index < 3 ? 'bg-brand-yellow/20' : ''}`}>
                                <span className="text-lg font-bold w-6 text-center">{user.rank}</span>
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow">
                                    <p className="font-semibold">{user.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-600">{user.usdt.toFixed(2)} USDT</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LeaderboardPage;