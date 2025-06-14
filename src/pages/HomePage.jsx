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
import { getUserTransactions, createWithdrawalRequest } from '@/lib/firebaseService';

const TransactionHistory = ({ transactions, loading, error, currentPage, totalPages, onPageChange, onRefresh }) => {
    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-yellow mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading transactions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-500">
                <Database className="mx-auto h-12 w-12 text-red-300 mb-4" />
                <p>Failed to load transactions</p>
                <p className="text-sm text-gray-500">{error}</p>
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
            <div className="text-center py-8 text-gray-500">
                <Database className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>No transactions yet.</p>
                <p className="text-sm">Start mining or complete tasks to see your transaction history!</p>
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
        <div className="space-y-3">
            {/* Transaction List */}
            <div className="space-y-2">
                {transactions.map((tx, index) => {
                    const config = getTransactionConfig(tx.type);
                    const amount = parseFloat(tx.amount);
                    const isPositive = amount > 0;
                    
                    return (
                        <div key={tx.id || index} className={`p-3 rounded-lg border ${config.bgColor}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
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
                <div className="flex items-center justify-between pt-4 border-t">
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
    const { data, updateUserBalance } = useGameData();
    const { user } = useTelegram();
    const [amount, setAmount] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ 
                title: "Invalid Amount", 
                description: "Please enter a valid positive amount.", 
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
        
        if (data.totalMined < numAmount) {
            toast({ 
                title: "Insufficient Balance", 
                description: "You don't have enough USDT to withdraw.", 
                variant: "destructive" 
            });
            return;
        }

        setLoading(true);
        try {
            await updateUserBalance(-numAmount);
            
            await createWithdrawalRequest(
                data.id, 
                numAmount, 
                address, 
                user?.username || user?.first_name || 'Unknown'
            );
            
            toast({ 
                title: "Withdrawal Requested", 
                description: "Your request is pending admin approval." 
            });
            
            setAmount('');
            setAddress('');
            onOpenChange(false);
        } catch (error) {
            console.error('Withdrawal error:', error);
            toast({ 
                title: "Withdrawal Failed", 
                description: "Something went wrong. Please try again.", 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="rounded-t-2xl bg-brand-bg text-brand-text p-6 h-auto max-h-[90vh] flex flex-col">
                <SheetHeader className="text-center mb-4">
                    <SheetTitle className="text-2xl font-bold">Withdraw USDT</SheetTitle>
                    <SheetDescription>Enter amount and BEP20 address.</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="withdraw-amount">Amount</Label>
                        <Input 
                            id="withdraw-amount" 
                            type="number" 
                            placeholder="0.00" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)}
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Available: {data?.totalMined?.toFixed(8) || '0.00000000'} USDT
                        </p>
                    </div>
                    <div>
                        <Label htmlFor="withdraw-address">Wallet Address (BEP20)</Label>
                        <Input 
                            id="withdraw-address" 
                            type="text" 
                            placeholder="0x..." 
                            value={address} 
                            onChange={e => setAddress(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                </div>
                <SheetFooter>
                    <Button 
                        onClick={handleSubmit} 
                        className="w-full bg-brand-yellow text-black font-bold"
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : 'Confirm Withdrawal'}
                    </Button>
                </SheetFooter>
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

    const [allTransactions, setAllTransactions] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const [transactionError, setTransactionError] = useState(null);

    const TRANSACTIONS_PER_PAGE = 10;

    const totalPages = Math.ceil(allTransactions.length / TRANSACTIONS_PER_PAGE);
    const startIndex = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
    const endIndex = startIndex + TRANSACTIONS_PER_PAGE;
    const currentTransactions = allTransactions.slice(startIndex, endIndex);

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

                const userTransactions = await getUserTransactions(data.id, 100);
                console.log('Raw transactions from Firebase:', userTransactions);

                if (Array.isArray(userTransactions) && userTransactions.length > 0) {
                    const parseDate = (tx) => {
                        if (tx.createdAt?.toDate) return tx.createdAt.toDate();
                        if (tx.createdAt?.seconds) return new Date(tx.createdAt.seconds * 1000);
                        if (tx.date) return new Date(tx.date);
                        return new Date(0);
                    };

                    const sortedTransactions = userTransactions.sort(
                        (a, b) => parseDate(b) - parseDate(a)
                    );

                    setAllTransactions(sortedTransactions);
                    setCurrentPage(1);
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

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

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

            if (Array.isArray(userTransactions) && userTransactions.length > 0) {
                const parseDate = (tx) => {
                    if (tx.createdAt?.toDate) return tx.createdAt.toDate();
                    if (tx.createdAt?.seconds) return new Date(tx.createdAt.seconds * 1000);
                    if (tx.date) return new Date(tx.date);
                    return new Date(0);
                };

                const sortedTransactions = userTransactions.sort(
                    (a, b) => parseDate(b) - parseDate(a)
                );

                setAllTransactions(sortedTransactions);
                setCurrentPage(1);

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
            <div className="text-center p-10">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow mx-auto"></div>
                <p className="mt-4 text-brand-text">Loading...</p>
            </div>
        );
    }

    const isStorageFull = data.storageMined >= data.storageCapacity;

    return (
        <div className="p-4 space-y-4">
            {/* The rest of your JSX content remains unchanged */}
        </div>
    );
};

export default HomePage;
