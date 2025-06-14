import React, { useState } from 'react';
import { useGameData } from '@/hooks/useGameData';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { addClaimTransaction } from '@/lib/firebaseService';

const ClaimPage = () => {
    const { data, handleClaimStorage } = useGameData();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [claiming, setClaiming] = useState(false);

    if (!data) {
        return (
            <div className="text-center p-10">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow mx-auto"></div>
                <p className="mt-4">Loading Mining...</p>
            </div>
        );
    }

    const timeToFillMs = data.storageFillTime - Date.now();
    const hours = Math.floor(timeToFillMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeToFillMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Calculate dynamic claim fee based on collected amount
    const calculateClaimFee = (amount) => {
        if (amount <= 0) return 0;
        
        // Dynamic fee calculation: 0.5% of claimed amount with minimum and maximum limits
        const feePercentage = 0.005; // 0.5%
        const minFee = 0.000001; // Minimum fee
        const maxFee = 0.00001; // Maximum fee
        
        let fee = amount * feePercentage;
        
        // Apply minimum and maximum limits
        if (fee < minFee) fee = minFee;
        if (fee > maxFee) fee = maxFee;
        
        return fee;
    };

    const claimFee = calculateClaimFee(data.storageMined);
    const netClaimAmount = Math.max(0, data.storageMined - claimFee);
    
    const onClaimClick = async () => {
        if (claiming) return;
        
        // Check if there's anything to claim
        if (data.storageMined <= 0) {
            toast({
                title: "Nothing to Claim",
                description: "Your storage is empty. Wait for it to fill up.",
                variant: "destructive",
            });
            return;
        }

        // Check if user has enough balance to pay the fee
        if (data.totalMined < claimFee) {
            toast({
                title: "Insufficient Balance",
                description: `You need at least ${claimFee.toFixed(8)} USDT to pay the claim fee.`,
                variant: "destructive",
            });
            return;
        }

        setClaiming(true);
        
        try {
            console.log('Starting claim process...');
            console.log('Storage mined:', data.storageMined);
            console.log('Claim fee:', claimFee);
            console.log('Net claim amount:', netClaimAmount);
            
            // Call the claim function from useGameData
            const result = handleClaimStorage();
            console.log('Claim result:', result);
            
            if (result.success) {
                // Record transactions in Firestore
                try {
                    await addClaimTransaction(data.id, netClaimAmount, claimFee);
                    console.log('Transactions recorded successfully');
                } catch (transactionError) {
                    console.error('Error recording transactions:', transactionError);
                    // Don't fail the claim if transaction recording fails
                }
                
                toast({
                    title: "Claim Successful!",
                    description: `Claimed ${netClaimAmount.toFixed(8)} USDT (Fee: ${claimFee.toFixed(8)} USDT)`,
                });
                
                // Navigate back to home after a short delay
                setTimeout(() => {
                    navigate('/');
                }, 1500);
            } else {
                toast({
                    title: "Claim Failed",
                    description: result.reason || "Something went wrong during the claim process.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error during claim:', error);
            toast({
                title: "Claim Failed",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
            });
        } finally {
            setClaiming(false);
        }
    };

    const canClaim = data.storageMined > 0 && data.totalMined >= claimFee;

    return (
        <div className="flex flex-col items-center justify-center p-4 text-center h-full">
            <p className="text-lg">In storage:</p>
            <p className="text-5xl font-bold my-2">{data.storageMined.toFixed(8)}</p>
            <p className="text-sm text-gray-500">USDT Balance: {data.totalMined.toFixed(8)}</p>
            
            <Card className="w-full max-w-sm mt-8 p-4 bg-white rounded-2xl shadow-lg">
                <CardContent className="flex items-center justify-between p-0">
                    <div className="flex items-center space-x-3">
                        <img  
                            className="h-12 w-12 rounded-lg object-cover" 
                            alt="Treasure chest" 
                            src="https://images.unsplash.com/photo-1642211841112-2beeda7bfc07" 
                        />
                        <div>
                            <p className="font-bold">Level {data.storageLevel}</p>
                            <p className="text-xs text-gray-500">
                                {timeToFillMs > 0 ? `${hours}h ${minutes}m to fill` : 'Filled'}
                            </p>
                            <p className="text-xs text-brand-text font-semibold">
                                {data.minerRate.toFixed(8)} USDT/hour
                            </p>
                        </div>
                    </div>
                    <Button 
                        onClick={onClaimClick} 
                        disabled={!canClaim || claiming}
                        className={`font-bold text-lg px-8 ${
                            canClaim && !claiming 
                                ? 'bg-brand-yellow text-black hover:bg-yellow-400' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {claiming ? 'Claiming...' : 'Claim'}
                    </Button>
                </CardContent>
            </Card>

            <div className="w-full max-w-sm space-y-2 mt-4">
                <div className="flex justify-between text-sm">
                    <span>Claim amount</span>
                    <span className="font-bold text-green-600">
                        +{data.storageMined.toFixed(8)} USDT
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span>Claim fee ({(calculateClaimFee(data.storageMined) / Math.max(data.storageMined, 0.000001) * 100).toFixed(2)}%)</span>
                    <span className="font-bold text-red-600">
                        -{claimFee.toFixed(8)} USDT
                    </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                    <span className="font-bold">Net amount</span>
                    <span className="font-bold text-blue-600">
                        +{netClaimAmount.toFixed(8)} USDT
                    </span>
                </div>
            </div>
            
            {!canClaim && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        {data.storageMined <= 0 
                            ? "Storage is empty. Wait for it to fill up."
                            : `Insufficient balance to pay claim fee. Need ${claimFee.toFixed(8)} USDT.`
                        }
                    </p>
                </div>
            )}
            
            <p className="text-xs text-gray-500 mt-4 max-w-sm">
                Claim fee is calculated as 0.5% of claimed amount and will be deducted from your main balance.
                Both claim and fee will be recorded as separate transactions.
            </p>
        </div>
    );
};

export default ClaimPage;
