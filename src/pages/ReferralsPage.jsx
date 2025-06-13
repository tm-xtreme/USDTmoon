
import React from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, Share2 } from 'lucide-react';

const ReferralsPage = () => {
    const { user } = useTelegram();
    const { toast } = useToast();
    const botUsername = "YourTelegramBot"; // Replace with your bot's username
    const referralLink = `https://t.me/${botUsername}?start=refTGID_${user?.id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        toast({
            title: "Link Copied!",
            description: "Your referral link has been copied to the clipboard.",
        });
    };
    
    const handleInvite = () => {
        const text = `Come mine USDT with me! Use my link to get a starting bonus! 💰\n${referralLink}`;
        const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    return (
        <div className="p-4 space-y-6 text-center">
            <div className="flex flex-col items-center">
                 <Avatar className="h-20 w-20 border-4 border-brand-yellow">
                    <AvatarImage src={user?.photo_url} alt={user?.username} />
                    <AvatarFallback>{user?.first_name?.[0]}</AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold mt-2">Invite & Earn More</h1>
                <p className="text-gray-600">Build your network! The more friends you invite, the more you earn.</p>
            </div>

            <Card className="bg-white rounded-2xl shadow-md p-4">
                <CardContent className="p-0 space-y-3">
                    <h2 className="text-lg font-semibold text-left">Referral Bonuses</h2>
                    <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-brand-bg p-3 rounded-lg">
                            <p className="text-xl font-bold text-green-500">+0.5 USDT</p>
                            <p className="text-sm">For you</p>
                        </div>
                         <div className="bg-brand-bg p-3 rounded-lg">
                            <p className="text-xl font-bold text-green-500">+0.2 USDT</p>
                            <p className="text-sm">For your friend</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">+ You get a permanent mining speed boost for every referral!</p>
                </CardContent>
            </Card>

            <div className="space-y-3">
                 <Button onClick={handleInvite} className="w-full h-14 bg-brand-yellow text-black font-bold text-lg flex items-center justify-center space-x-2 rounded-xl">
                    <Share2 />
                    <span>Invite a Friend</span>
                </Button>
                <p className="text-sm text-gray-500">... or copy your personal link</p>
                <div className="w-full p-3 bg-white rounded-lg flex items-center justify-between border">
                    <span className="text-sm font-mono truncate mr-2">{referralLink}</span>
                    <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 flex-shrink-0">
                        <Copy className="h-5 w-5"/>
                    </Button>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-2">Your Invites (0)</h3>
                 <Card className="bg-white rounded-2xl shadow-md p-4">
                    <CardContent className="p-0 text-center text-gray-500">
                        <p>You haven't invited any friends yet.</p>
                        <p className="text-sm">Start inviting to earn bonuses!</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ReferralsPage;
