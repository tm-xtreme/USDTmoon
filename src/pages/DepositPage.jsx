import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import QRCode from "qrcode.react";
import { useToast } from '@/components/ui/use-toast';
import { useGameData } from '@/hooks/useGameData';
import { Copy, CheckCircle, AlertCircle, Wallet, Send, Clock } from 'lucide-react';

const DepositPage = () => {
    const { toast } = useToast();
    const { requestDeposit, data } = useGameData();
    const [amount, setAmount] = useState('');
    const [transactionHash, setTransactionHash] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const depositAddress = "0x10aDaB723498E5d6258542Ee6717458a1E3F6590"; // Example address

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(depositAddress);
            toast({
                title: "Copied! 📋",
                description: "Deposit address copied to clipboard.",
            });
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = depositAddress;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            toast({
                title: "Copied! 📋",
                description: "Deposit address copied to clipboard.",
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (submitting) return;
        
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ 
                title: "Invalid Amount", 
                description: "Please enter a valid positive amount.", 
                variant: "destructive" 
            });
            return;
        }
        
        if (numAmount < 0.000001) {
            toast({ 
                title: "Amount Too Small", 
                description: "Minimum deposit amount is 0.000001 USDT.", 
                variant: "destructive" 
            });
            return;
        }
        
        if (!transactionHash.trim()) {
            toast({ 
                title: "Missing Transaction Hash", 
                description: "Please enter the transaction hash.", 
                variant: "destructive" 
            });
            return;
        }
        
        if (transactionHash.trim().length < 10) {
            toast({ 
                title: "Invalid Transaction Hash", 
                description: "Transaction hash seems too short. Please check and try again.", 
                variant: "destructive" 
            });
            return;
        }

        setSubmitting(true);
        
        try {
            const result = await requestDeposit(numAmount, transactionHash.trim());
            
            if (result.success) {
                toast({ 
                    title: "Deposit Requested! 🎉", 
                    description: "Your deposit request has been submitted for verification. You'll be notified once approved." 
                });
                setAmount('');
                setTransactionHash('');
            } else {
                toast({ 
                    title: "Deposit Failed", 
                    description: result.reason || "Failed to submit deposit request. Please try again.", 
                    variant: "destructive" 
                });
            }
        } catch (error) {
            console.error('Error submitting deposit:', error);
            toast({ 
                title: "Deposit Failed", 
                description: "An unexpected error occurred. Please try again.", 
                variant: "destructive" 
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (!data) {
        return (
            <div className="text-center p-10">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow mx-auto"></div>
                <p className="mt-4">Loading Deposit Page...</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 bg-gradient-to-b from-green-50 to-white min-h-screen">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-brand-text mb-2">Deposit USDT</h1>
                <p className="text-gray-600">Add funds to your mining account</p>
                <div className="mt-4 p-4 bg-white rounded-xl shadow-md">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <Wallet className="h-5 w-5 text-brand-yellow" />
                        <span className="text-sm text-gray-500">Current Balance</span>
                    </div>
                    <p className="text-2xl font-bold text-brand-text">{data.totalMined.toFixed(8)} USDT</p>
                </div>
            </div>

            {/* Deposit Address Card */}
            <Card className="bg-white rounded-2xl shadow-lg border-2 border-green-100">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center space-x-2">
                        <Send className="h-6 w-6 text-green-600" />
                        <span>Deposit Address (BEP20)</span>
                    </CardTitle>
                    <CardDescription>Send USDT to this address on BNB Smart Chain</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                    {/* QR Code */}
                    <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                        <QRCode 
                            value={depositAddress} 
                            size={180}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            level="M"
                        />
                    </div>
                    
                    {/* Address */}
                    <div className="w-full max-w-md">
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">Deposit Address:</Label>
                        <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between border">
                            <span className="text-sm font-mono truncate flex-1 mr-2">{depositAddress}</span>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleCopy}
                                className="hover:bg-green-100"
                            >
                                <Copy className="h-4 w-4 mr-1"/>
                                Copy
                            </Button>
                        </div>
                    </div>
                    
                    {/* Important Notes */}
                    <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                            <span className="font-semibold text-yellow-800">Important Notes</span>
                        </div>
                        <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                            <li>Only send USDT on BNB Smart Chain (BEP20)</li>
                            <li>Minimum deposit: 0.000001 USDT</li>
                            <li>Deposits require admin verification</li>
                            <li>Processing time: 1-24 hours</li>
                            <li>Double-check the address before sending</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Deposit Form Card */}
            <Card className="bg-white rounded-2xl shadow-lg border-2 border-blue-100">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <CheckCircle className="h-6 w-6 text-blue-600" />
                        <span>Submit Deposit Details</span>
                    </CardTitle>
                    <CardDescription>
                        After sending USDT, fill out this form to notify us of your deposit
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="amount" className="text-sm font-semibold">
                                Amount Deposited (USDT)
                            </Label>
                            <Input 
                                id="amount" 
                                type="number" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                placeholder="e.g., 10.5" 
                                step="0.000001"
                                min="0.000001"
                                disabled={submitting}
                                required 
                                className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Enter the exact amount you sent (minimum: 0.000001 USDT)
                            </p>
                        </div>
                        
                        <div>
                            <Label htmlFor="transactionHash" className="text-sm font-semibold">
                                Transaction Hash (TxID)
                            </Label>
                            <Input 
                                id="transactionHash" 
                                type="text" 
                                value={transactionHash} 
                                onChange={(e) => setTransactionHash(e.target.value)} 
                                placeholder="0x1234567890abcdef..." 
                                disabled={submitting}
                                required 
                                className="mt-1 font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Copy the transaction hash from your wallet or block explorer
                            </p>
                        </div>
                        
                        <Button 
                            type="submit" 
                            disabled={submitting}
                            className={`w-full font-bold text-lg h-12 transition-all duration-300 ${
                                submitting 
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                    : 'bg-brand-yellow text-black hover:bg-yellow-400 hover:scale-105 shadow-lg'
                            }`}
                        >
                            {submitting ? (
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                                    <span>Submitting...</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Send className="h-5 w-5" />
                                    <span>Submit Deposit Request</span>
                                </div>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Process Timeline */}
            <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
                <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-3 flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-blue-500" />
                        Deposit Process
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                            <span className="text-sm">Send USDT to the deposit address above</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                            <span className="text-sm">Fill out and submit the deposit form</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                            <span className="text-sm">Wait for admin verification (1-24 hours)</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</div>
                            <span className="text-sm">Funds credited to your account</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Support Info */}
            <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4 text-center">
                    <h3 className="font-bold text-lg mb-2">Need Help?</h3>
                    <p className="text-sm text-gray-600 mb-3">
                        If you have any issues with your deposit, please contact our support team.
                    </p>
                    <p className="text-xs text-gray-500">
                        Make sure to include your transaction hash and deposit amount when contacting support.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default DepositPage;
            
