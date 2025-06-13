
import React from 'react';
import { useGameData } from '@/hooks/useGameData';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const ClaimPage = () => {
    const { data, handleClaimStorage } = useGameData();
    const { toast } = useToast();
    const navigate = useNavigate();

    if (!data) return <div className="text-center p-10">Loading Mining...</div>;

    const timeToFillMs = data.storageFillTime - Date.now();
    const hours = Math.floor(timeToFillMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeToFillMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const onClaimClick = () => {
        const { success, amount, reason } = handleClaimStorage();
         if (success) {
            toast({
                title: `Claimed ${amount.toFixed(8)} USDT!`,
                description: 'Your balance has been updated.',
            });
            navigate('/'); // Go back to home after successful claim
        } else {
             toast({
                title: "Claim Failed!",
                description: reason,
                variant: 'destructive',
            });
        }
    }

    return (
        <div className="flex flex-col items-center justify-center p-4 text-center h-full">
            <p className="text-lg">In storage:</p>
            <p className="text-5xl font-bold my-2">{data.storageMined.toFixed(8)}</p>
            <p className="text-sm text-gray-500">USDT Balance: {data.totalMined.toFixed(8)}</p>
            
            <Card className="w-full max-w-sm mt-8 p-4 bg-white rounded-2xl shadow-lg">
                <CardContent className="flex items-center justify-between p-0">
                    <div className="flex items-center space-x-3">
                         <img  className="h-12 w-12" alt="Treasure chest" src="https://images.unsplash.com/photo-1642211841112-2beeda7bfc07" />
                        <div>
                            <p className="font-bold">Level {data.storageLevel}</p>
                            <p className="text-xs text-gray-500">{timeToFillMs > 0 ? `${hours}h ${minutes}m to fill` : 'Filled'}</p>
                            <p className="text-xs text-brand-text font-semibold">{data.minerRate.toFixed(8)} USDT/hour</p>
                        </div>
                    </div>
                    <Button onClick={onClaimClick} className="bg-brand-yellow text-black font-bold text-lg px-8">Claim</Button>
                </CardContent>
            </Card>

            <div className="w-full max-w-sm flex justify-between text-sm mt-4">
                <span>Claim fee</span>
                <span className="font-bold">0.000007 USDT</span>
            </div>
            <p className="text-xs text-gray-500 mt-4">Claim fee will be deducted from your main balance.</p>
        </div>
    );
};

export default ClaimPage;
