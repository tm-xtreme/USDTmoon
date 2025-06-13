
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import QRCode from "qrcode.react";
import { useToast } from '@/components/ui/use-toast';
import { useGameData } from '@/hooks/useGameData';
import { Copy } from 'lucide-react';

const DepositPage = () => {
    const { toast } = useToast();
    const { requestDeposit } = useGameData();
    const [amount, setAmount] = useState('');
    const [transactionHash, setTransactionHash] = useState('');
    const depositAddress = "0x10aDaB723498E5d6258542Ee6717458a1E3F6590"; // Example address

    const handleCopy = () => {
        navigator.clipboard.writeText(depositAddress);
        toast({
          title: "Copied!",
          description: "Deposit address copied to clipboard.",
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a valid positive amount.", variant: "destructive" });
            return;
        }
        if (!transactionHash.trim()) {
            toast({ title: "Missing Transaction Hash", description: "Please enter the transaction hash.", variant: "destructive" });
            return;
        }

        const result = requestDeposit(numAmount, transactionHash);
        if (result.success) {
            toast({ title: "Deposit Requested", description: "Your deposit request has been submitted for verification." });
            setAmount('');
            setTransactionHash('');
        } else {
            toast({ title: "Deposit Failed", description: result.reason, variant: "destructive" });
        }
    };

    return (
        <div className="p-4 space-y-6">
            <Card className="bg-white rounded-2xl shadow-md">
                <CardHeader className="text-center">
                    <CardTitle>Deposit USDT (BEP20)</CardTitle>
                    <CardDescription>Send USDT to the address below and submit the details.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-white rounded-lg border">
                        <QRCode value={depositAddress} size={180} />
                    </div>
                    <div className="w-full max-w-md p-3 bg-gray-100 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-mono truncate">{depositAddress}</span>
                        <Button variant="ghost" size="sm" onClick={handleCopy}><Copy className="h-4 w-4 mr-1"/>Copy</Button>
                    </div>
                     <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside max-w-md">
                        <li>Only send USDT on the BNB Smart Chain (BEP20).</li>
                        <li>Deposits are credited after admin verification.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl shadow-md">
                <CardHeader>
                    <CardTitle>Submit Deposit Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="amount">Amount Deposited (USDT)</Label>
                            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 10.5" step="any" required />
                        </div>
                        <div>
                            <Label htmlFor="transactionHash">Transaction Hash (TxID)</Label>
                            <Input id="transactionHash" type="text" value={transactionHash} onChange={(e) => setTransactionHash(e.target.value)} placeholder="0x..." required />
                        </div>
                        <Button type="submit" className="w-full bg-brand-yellow text-black font-bold">Submit Deposit</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default DepositPage;
