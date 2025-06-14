import React, { useState, useEffect } from 'react';
import { useGameData } from '@/hooks/useGameData';
import { useTelegram } from '@/hooks/useTelegram';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight, CheckCircle, ArrowUpCircle, ArrowDownCircle, Download, Upload, Gift, Zap, Database, RefreshCw, ChevronLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getUserTransactions } from '@/lib/firebaseService';

const TransactionHistory = ({ transactions, loading, error, currentPage, totalPages, onPageChange, onRefresh }) => {
    if (loading) {
        return (
            <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-yellow mx-auto"></div>
                <p className="text-gray-500 mt-2 text-sm">Loading transactions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-6 text-red-500">
                <Database className="mx-auto h-8 w-8 text-red-300 mb-2" />
                <p className="text-sm">Failed to load transactions</p>
                <p className="text-xs text-gray-500">{error}</p>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onRefresh}
                    className="mt-2"
                >
                    Try Again
                </Button>
            </div>
        );
    }

    if (!transactions || transactions.length === 0) {
        return (
            <div className="text-center py-6 text-gray-500">
                <Database className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm">No transactions yet.</p>
                <p className="text-xs">Start mining or complete tasks to see your transaction history!</p>
            </div>
        );
    }
    
    const TRANSACTION_CONFIG = {
        claim: {
            icon: <ArrowUpCircle className="h-4 w-4 text-green-500" />,
            label: "Storage Claim",
            bgColor: "bg-green-50",
            textColor: "text-green-700"
        },
        fee: {
            icon: <ArrowDownCircle className="h-4 w-4 text-red-500" />,
            label: "Claim Fee",
            bgColor: "bg-red-50",
            textColor: "text-red-700"
        },
        task_reward: {
            icon: <Gift className="h-4 w-4 text-blue-500" />,
            label: "Task Reward",
            bgColor: "bg-blue-50",
            textColor: "text-blue-700"
        },
        upgrade_miner: {
            icon: <Zap className="h-4 w-4 text-purple-500" />,
            label: "Miner Upgrade",
            bgColor: "bg-purple-50",
            textColor: "text-purple-700"
        },
        upgrade_storage: {
            icon: <Database className="h-4 w-4 text-orange-500" />,
            label: "Storage Upgrade",
            bgColor: "bg-orange-50",
            textColor: "text-orange-700"
        },
        withdrawal_request: {
            icon: <Upload className="h-4 w-4 text-red-500" />,
            label: "Withdrawal Request",
            bgColor: "bg-red-50",
            textColor: "text-red-700"
        },
        withdrawal_refund: {
            icon: <RefreshCw className="h-4 w-4 text-orange-500" />,
            label: "Withdrawal Refund",
            bgColor: "bg-orange-50",
            textColor: "text-orange-700"
        },
        deposit: {
            icon: <Download className="h-4 w-4 text-green-500" />,
            label: "Deposit",
            bgColor: "bg-green-50",
            textColor: "text-green-700"
        },
        deposit_approved: {
            icon: <Download className="h-4 w-4 text-green-500" />,
            label: "Deposit Approved",
            bgColor: "bg-green-50",
            textColor: "text-green-700"
        }
    };

    const getTransactionConfig = (type) => {
        return TRANSACTION_CONFIG[type] || {
            icon: <ArrowUpCircle className="h-4 w-4 text-gray-500" />,
            label: "Transaction",
            bgColor: "bg-gray-50",
            textColor: "text-gray-700"
        };
    };

    const formatDate = (timestamp, dateString) => {
        try {
            let date;
            
            if (timestamp && timestamp.toDate) {
                date = timestamp.toDate();
            } 
            else if (timestamp && timestamp.seconds) {
                date = new Date(timestamp.seconds * 1000);
            }
            else if (dateString) {
                date = new Date(dateString);
            }
            else if (timestamp) {
                date = new Date(timestamp);
            }
            else {
                return 'Unknown date';
            }
            
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    };

    const formatAmount = (amount) => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return '0.00000000';
        return Math.abs(numAmount).toFixed(8);
    };
    
    return (
        <div className="space-y-2">
            {/* Transaction List */}
            <div className="space-y-2">
                {transactions.map((tx, index) => {
                    const config = getTransactionConfig(tx.type);
                    const amount = parseFloat(tx.amount);
                    const isPositive = amount > 0;
                    
                    return (
                        <div key={tx.id || index} className={`p-3 rounded-lg border ${config.bgColor}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1.5 bg-white rounded-full shadow-sm">
                                        {config.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-sm ${config.textColor}`}>
                                            {config.label}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatDate(tx.createdAt, tx.date)}
                                        </p>
                                        {tx.status && (
                                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                                                tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                tx.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                            </span>
                                        )}
                                        {tx.reason && (
                                            <p className="text-xs text-gray-400 mt-1 truncate">
                                                {tx.reason}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold text-sm ${
                                        isPositive ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {isPositive ? '+' : ''}{formatAmount(amount)}
                                    </p>
                                    <p className="text-xs text-gray-500">USDT</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center space-x-1"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous</span>
                    </Button>
                    
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                            Page {currentPage} of {totalPages}
                        </span>
                    </div>
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center space-x-1"
                    >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
};

const WithdrawSheet = ({ open, onOpenChange }) => {
    const { toast } = useToast();
    const { data, requestWithdrawal } = useGameData();
    const { user } = useTelegram();
    const [amount, setAmount] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount);
        
        // Validation
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
                description: "Minimum withdrawal amount is 0.000001 USDT.", 
                variant: "destructive" 
            });
            return;
        }
        
        if (!address.trim()) {
            toast({ 
                title: "Invalid Address", 
                description: "Please enter a valid wallet address.", 
                variant: "destructive" 
            });
            return;
        }
        
        if (address.trim().length < 10) {
            toast({ 
                title: "Invalid Address", 
                description: "Wallet address seems too short. Please check and try again.", 
                variant: "destructive" 
            });
            return;
        }
        
        if (!data || data.totalMined < numAmount) {
            toast({ 
                title: "Insufficient Balance", 
                description: `You don't have enough USDT to withdraw. Available: ${data?.totalMined?.toFixed(8) || '0.00000000'} USDT`, 
                variant: "destructive" 
            });
            return;
        }

        setLoading(true);
        
        try {
            console.log('Submitting withdrawal request:', {
                amount: numAmount,
                address: address.trim(),
                userId: data.id,
                username: user?.username || user?.first_name || 'Unknown'
            });

            const result = await requestWithdrawal(numAmount, address.trim());
            
            if (result.success) {
                toast({ 
                    title: "Withdrawal Requested! 🎉", 
                    description: "Your withdrawal request has been submitted for admin approval. You'll be notified once processed." 
                });
                
                setAmount('');
                setAddress('');
                onOpenChange(false);
            } else {
                toast({ 
                    title: "Withdrawal Failed", 
                    description: result.reason || "Failed to submit withdrawal request. Please try again.", 
                    variant: "destructive" 
                });
            }
        } catch (error) {
            console.error('Withdrawal error:', error);
            toast({ 
                title: "Withdrawal Failed", 
                description: "An unexpected error occurred. Please try again.", 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    // Reset form when sheet closes
    useEffect(() => {
        if (!open) {
            setAmount('');
            setAddress('');
            setLoading(false);
        }
    }, [open]);

    const isValidAmount = amount && parseFloat(amount) > 0;
    
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="rounded-t-2xl bg-white text-brand-text max-h-[95vh] flex flex-col">
                <SheetHeader className="text-center pb-4 border-b border-gray-100">
                    <SheetTitle className="text-2xl font-bold">Withdraw USDT</SheetTitle>
                    <SheetDescription>Enter withdrawal amount and your BEP20 wallet address</SheetDescription>
                </SheetHeader>
                
                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto py-4 px-6 space-y-4">
                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="withdraw-amount" className="text-sm font-semibold">Amount (USDT)</Label>
                            <Input 
                                id="withdraw-amount" 
                                type="number" 
                                placeholder="0.000000" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)}
                                disabled={loading}
                                step="0.000001"
                                min="0.000001"
                                className="mt-1"
                            />
                            <div className="mt-1 space-y-1">
                                <p className="text-xs text-gray-500">
                                    Available: {data?.totalMined?.toFixed(8) || '0.00000000'} USDT
                                </p>
                                <p className="text-xs text-gray-400">
                                    Minimum withdrawal: 0.000001 USDT
                                </p>
                            </div>
                        </div>
                        
                        <div>
                            <Label htmlFor="withdraw-address" className="text-sm font-semibold">Wallet Address (BEP20)</Label>
                            <Input 
                                id="withdraw-address" 
                                type="text" 
                                placeholder="0x..." 
                                value={address} 
                                onChange={e => setAddress(e.target.value)}
                                disabled={loading}
                                className="mt-1"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Enter your BEP20 (BSC) wallet address for USDT withdrawal
                            </p>
                        </div>
                    </div>

                    {/* Important Information - Always Visible */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Important Information</h4>
                        <ul className="text-xs text-yellow-700 space-y-1">
                            <li>• Withdrawals are processed manually by admin</li>
                            <li>• Processing time: 1-24 hours</li>
                            <li>• Only BEP20 (BSC) USDT addresses supported</li>
                            <li>• Double-check your wallet address</li>
                            <li>• You'll receive a notification when processed</li>
                        </ul>
                    </div>

                    {/* Summary - Only show when amount is valid */}
                    {isValidAmount && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-blue-800 mb-2">📋 Withdrawal Summary</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-blue-700">Amount:</span>
                                    <span className="font-semibold text-blue-900">{parseFloat(amount).toFixed(8)} USDT</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-700">Network:</span>
                                    <span className="font-semibold text-blue-900">BEP20 (BSC)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-700">Status:</span>
                                    <span className="font-semibold text-orange-600">Pending Approval</span>
                                </div>
                                {address && (
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">To Address:</span>
                                        <span className="font-mono text-xs text-blue-900 break-all">
                                            {address.length > 20 ? `${address.slice(0, 10)}...${address.slice(-10)}` : address}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Fixed Footer with Buttons */}
                <div className="border-t border-gray-100 p-6 bg-white">
                    <div className="space-y-3">
                        <Button 
                            onClick={handleSubmit} 
                            className="w-full bg-brand-yellow text-black font-bold hover:bg-yellow-400 disabled:opacity-50 h-12"
                            disabled={loading || !amount || !address || parseFloat(amount) <= 0}
                        >
                            {loading ? (
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                'Submit Withdrawal Request'
                            )}
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            onClick={() => onOpenChange(false)}
                            className="w-full h-10"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};


const HomePage = () => {
    const { user } = useTelegram();
    const { data, isInitialized } = useGameData();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = useState(false);
    
    // Transaction pagination state
    const [allTransactions, setAllTransactions] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const [transactionError, setTransactionError] = useState(null);
    
    const TRANSACTIONS_PER_PAGE = 10;

    // Calculate pagination
    const totalPages = Math.ceil(allTransactions.length / TRANSACTIONS_PER_PAGE);
    const startIndex = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
    const endIndex = startIndex + TRANSACTIONS_PER_PAGE;
    const currentTransactions = allTransactions.slice(startIndex, endIndex);

    // Load user transactions from Firestore
    useEffect(() => {
        const loadTransactions = async () => {
            if (!data?.id) {
                console.log('No user ID available for transactions');
                return;
            }
            
            try {
                setTransactionsLoading(true);
                setTransactionError(null);
                console.log('Loading transactions for user ID:', data.id);
                
                // Load more transactions to support pagination (get up to 100)
                const userTransactions = await getUserTransactions(data.id, 100);
                console.log('Raw transactions from Firebase:', userTransactions);
                
                if (userTransactions && Array.isArray(userTransactions) && userTransactions.length > 0) {
                    // Sort transactions by creation date (newest first)
                    const sortedTransactions = userTransactions.sort((a, b) => {
                        let dateA, dateB;
                        
                        if (a.createdAt?.toDate) {
                            dateA = a.createdAt.toDate();
                        } else if (a.createdAt?.seconds) {
                            dateA = new Date(a.createdAt.seconds * 1000);
                        } else if (a.date) {
                            dateA = new Date(a.date);
                        } else {
                            dateA = new Date(0);
                        }
                        
                        if (b.createdAt?.toDate) {
                            dateB = b.createdAt.toDate();
                        } else if (b.createdAt?.seconds) {
                            dateB = new Date(b.createdAt.seconds * 1000);
                        } else if (b.date) {
                            dateB = new Date(b.date);
                        } else {
                            dateB = new Date(0);
                        }
                        
                        return dateB - dateA;
                    });
                    
                    setAllTransactions(sortedTransactions);
                    setCurrentPage(1); // Reset to first page when loading new data
                    console.log('Processed transactions:', sortedTransactions);
                } else {
                    setAllTransactions([]);
                    setCurrentPage(1);
                    console.log('No transactions found for user');
                }
            } catch (error) {
                console.error('Error loading transactions:', error);
                setAllTransactions([]);
                setTransactionError(error.message || 'Failed to load transactions');
                console.log('Transaction error details:', {
                    code: error.code,
                    message: error.message,
                    userId: data.id
                });
            } finally {
                setTransactionsLoading(false);
            }
        };

        if (isInitialized && data?.id) {
            loadTransactions();
        }
    }, [data?.id, isInitialized]);

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Refresh transactions function
    const refreshTransactions = async () => {
        if (!data?.id) {
            toast({
                title: "Error",
                description: "No user ID available",
                variant: "destructive"
            });
            return;
        }
        
        setTransactionsLoading(true);
        setTransactionError(null);
        
        try {
            console.log('Refreshing transactions for user:', data.id);
            const userTransactions = await getUserTransactions(data.id, 100);
            console.log('Refreshed transactions:', userTransactions);
            
            if (userTransactions && Array.isArray(userTransactions) && userTransactions.length > 0) {
                const sortedTransactions = userTransactions.sort((a, b) => {
                    let dateA, dateB;
                    
                    if (a.createdAt?.toDate) {
                        dateA = a.createdAt.toDate();
                    } else if (a.createdAt?.seconds) {
                        dateA = new Date(a.createdAt.seconds * 1000);
                    } else if (a.date) {
                        dateA = new Date(a.date);
                    } else {
                        dateA = new Date(0);
                    }
                    
                    if (b.createdAt?.toDate) {
                        dateB = b.createdAt.toDate();
                    } else if (b.createdAt?.seconds) {
                        dateB = new Date(b.createdAt.seconds * 1000);
                    } else if (b.date) {
                        dateB = new Date(b.date);
                    } else {
                        dateB = new Date(0);
                    }
                    
                    return dateB - dateA;
                });
                setAllTransactions(sortedTransactions);
                setCurrentPage(1); // Reset to first page after refresh
                
                toast({
                    title: "Success",
                    description: `Loaded ${sortedTransactions.length} transactions`,
                });
            } else {
                setAllTransactions([]);
                setCurrentPage(1);
                toast({
                    title: "No Transactions",
                    description: "No transaction history found",
                });
            }
        } catch (error) {
            console.error('Error refreshing transactions:', error);
            setTransactionError(error.message || 'Failed to refresh transactions');
            toast({
                title: "Error",
                description: `Failed to refresh transactions: ${error.message}`,
                variant: "destructive"
            });
        } finally {
            setTransactionsLoading(false);
        }
    };

    if (!isInitialized || !data) {
        return (
            <div className="text-center p-10 bg-gradient-to-b from-yellow-50 to-orange-50 min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow mx-auto"></div>
                <p className="mt-4 text-brand-text">Loading...</p>
            </div>
        );
    }
    
    const isStorageFull = data.storageMined >= data.storageCapacity;

    return (
        <div className="p-4 space-y-4 bg-gradient-to-b from-yellow-50 to-orange-50 min-h-screen">
            {/* User Profile Card */}
            <Card className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
                <CardContent className="flex items-center space-x-3 p-0">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={user?.photo_url} alt={user?.username} />
                        <AvatarFallback>{user?.first_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-bold">{`${user?.first_name || 'User'} ${user?.last_name || ''}`}</p>
                        <p className="text-sm text-gray-500">@{user?.username || 'telegram_user'}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Balance Card - Navigate to Claim Page */}
            <Card className="bg-white rounded-2xl shadow-md p-4 text-center cursor-pointer border border-gray-100" onClick={() => navigate('/claim')}>
                <CardContent className="p-0">
                    <p className="text-sm text-gray-500">Total Balance</p>
                    <p className="text-4xl font-bold my-1">{data.totalMined.toFixed(8)}</p>
                    <p className="text-xs text-gray-400 mb-3">USDT</p>
                    <div className="flex space-x-2 justify-center mt-2">
                        <Button 
                            className="bg-brand-yellow text-black font-bold flex-1 hover:bg-yellow-400" 
                            onClick={(e) => {
                                e.stopPropagation(); 
                                navigate('/deposit');
                            }}
                        >
                            Deposit
                        </Button>
                        <Button 
                            className="bg-gray-200 text-gray-700 font-bold flex-1 hover:bg-gray-300" 
                            onClick={(e) => {
                                e.stopPropagation(); 
                                setIsWithdrawSheetOpen(true);
                            }}
                        >
                            Withdraw
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="tokens" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-200">
                    <TabsTrigger value="tokens">Tokens</TabsTrigger>
                    <TabsTrigger value="transactions" className="relative">
                        Transactions
                        {allTransactions.length > 0 && (
                            <span className="ml-1 bg-brand-yellow text-black text-xs px-2 py-1 rounded-full">
                                {allTransactions.length}
                            </span>
                        )}
                        {transactionError && (
                            <span className="ml-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                !
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="tokens">
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        {/* USDT Balance Card - Navigate to Claim Page */}
                        <Card className="bg-white rounded-2xl shadow-md p-4 cursor-pointer border border-gray-100" onClick={() => navigate('/claim')}>
                            <CardContent className="p-0">
                                <p className="font-bold">USDT Balance</p>
                                <p className="text-2xl font-bold">{data.totalMined.toFixed(8)}</p>
                                <img  
                                    className="w-full h-16 object-cover rounded-lg mt-2" 
                                    alt="Moon and planet illustration" 
                                    src="https://images.unsplash.com/photo-1695738654978-cca6cbfcb8df" 
                                />
                            </CardContent>
                        </Card>
                        
                        {/* Storage Card - Navigate to Claim Page */}
                        <Card className="bg-white rounded-2xl shadow-md p-4 cursor-pointer border border-gray-100" onClick={() => navigate('/claim')}>
                            <CardContent className="p-0 flex flex-col justify-between h-full">
                                <div>
                                    <p className="font-bold">Storage</p>
                                    <Progress 
                                        value={(data.storageMined / data.storageCapacity) * 100} 
                                        className="mt-2 h-3 bg-gray-200 [&>div]:bg-brand-yellow" 
                                    />
                                </div>
                                <div className="mt-2">
                                    {isStorageFull ? (
                                        <div className="flex items-center space-x-1 text-green-600">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="font-bold text-sm">Full - Tap to Claim</span>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Collecting...</p>
                                    )}
                                    <p className="font-bold text-lg">{data.storageMined.toFixed(8)}</p>
                                    <p className="text-xs text-gray-400">/ {data.storageCapacity.toFixed(8)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                
                <TabsContent value="transactions">
                    <Card className="bg-white rounded-2xl shadow-md p-4 mt-2 border border-gray-100">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">Transaction History</h3>
                                    {allTransactions.length > 0 && (
                                        <p className="text-sm text-gray-500">
                                            Showing {startIndex + 1}-{Math.min(endIndex, allTransactions.length)} of {allTransactions.length}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    {transactionError && (
                                        <span className="text-xs text-red-500">Error</span>
                                    )}
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={refreshTransactions}
                                        disabled={transactionsLoading}
                                        className="flex items-center space-x-2"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${transactionsLoading ? 'animate-spin' : ''}`} />
                                        <span>{transactionsLoading ? 'Loading...' : 'Refresh'}</span>
                                    </Button>
                                </div>
                            </div>
                            
                            <TransactionHistory 
                                transactions={currentTransactions}
                                loading={transactionsLoading}
                                error={transactionError}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                onRefresh={refreshTransactions}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            {/* Daily Earn Button */}
            <Button 
                className="w-full h-14 bg-brand-yellow text-black font-bold text-lg flex justify-between items-center rounded-xl hover:bg-yellow-400" 
                onClick={() => navigate('/boost')}
            >
                <span>EARN 0.1 USDT DAILY</span>
                <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Withdraw Sheet */}
            <WithdrawSheet 
                open={isWithdrawSheetOpen} 
                onOpenChange={setIsWithdrawSheetOpen} 
            />
        </div>
    );
};

export default HomePage;
