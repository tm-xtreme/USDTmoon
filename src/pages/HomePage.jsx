import React, { useState, useEffect } from 'react';
import { useGameData } from '@/hooks/useGameData';
import { useTelegram } from '@/hooks/useTelegram';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight, CheckCircle, ArrowUpCircle, ArrowDownCircle, Download, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getUserTransactions, createWithdrawalRequest } from '@/lib/firebaseService';

const TransactionHistory = ({ transactions, loading }) => {
    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-yellow mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading transactions...</p>
            </div>
        );
    }

    if (!transactions || transactions.length === 0) {
        return <p className="text-center text-gray-500 py-8">No transactions yet.</p>;
    }
    
    const ICONS = {
        claim: <ArrowUpCircle className="h-5 w-5 text-green-500" />,
        fee: <ArrowDownCircle className="h-5 w-5 text-red-500" />,
        task_reward: <ArrowUpCircle className="h-5 w-5 text-blue-500" />,
        upgrade_miner: <ArrowDownCircle className="h-5 w-5 text-purple-500" />,
        upgrade_storage: <ArrowDownCircle className="h-5 w-5 text-orange-500" />,
        withdrawal_request: <Upload className="h-5 w-5 text-red-500" />,
        withdrawal_refund: <Download className="h-5 w-5 text-orange-500" />,
        deposit: <Download className="h-5 w-5 text-green-500" />,
        deposit_approved: <Download className="h-5 w-5 text-green-500" />,
    };

    const LABELS = {
        claim: "Storage Claim",
        fee: "Claim Fee",
        task_reward: "Task Reward",
        upgrade_miner: "Miner Upgrade",
        upgrade_storage: "Storage Upgrade",
        withdrawal_request: "Withdrawal Request",
        withdrawal_refund: "Withdrawal Refund",
        deposit: "Deposit",
        deposit_approved: "Deposit Approved",
    };
    
    return (
        <div className="space-y-2 py-4">
            {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                        {ICONS[tx.type] || <ArrowUpCircle className="h-5 w-5 text-gray-500" />}
                        <div>
                            <p className="font-semibold">{LABELS[tx.type] || 'Transaction'}</p>
                            <p className="text-xs text-gray-400">
                                {tx.createdAt?.toDate ? 
                                    tx.createdAt.toDate().toLocaleString() : 
                                    new Date(tx.createdAt).toLocaleString()
                                }
                            </p>
                            {tx.status && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    tx.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                    {tx.status}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.amount > 0 ? '+' : ''}{parseFloat(tx.amount).toFixed(8)} USDT
                    </p>
                </div>
            ))}
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
            // Deduct amount from user balance first
            await updateUserBalance(-numAmount);
            
            // Create withdrawal request
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
    const { data, isInitialized, claimStorage } = useGameData();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [transactionsLoading, setTransactionsLoading] = useState(true);

    // Load user transactions from Firestore
    useEffect(() => {
        const loadTransactions = async () => {
            if (data?.id) {
                try {
                    setTransactionsLoading(true);
                    const userTransactions = await getUserTransactions(data.id);
                    setTransactions(userTransactions || []);
                } catch (error) {
                    console.error('Error loading transactions:', error);
                    setTransactions([]);
                } finally {
                    setTransactionsLoading(false);
                }
            }
        };

        loadTransactions();
    }, [data?.id]);

    // Handle claim action
    const handleClaim = async () => {
        if (!isStorageFull) {
            toast({
                title: "Storage Not Full",
                description: "Wait for storage to fill up before claiming.",
                variant: "destructive"
            });
            return;
        }

        try {
            const result = await claimStorage();
            if (result.success) {
                toast({
                    title: "Claim Successful!",
                    description: `+${result.amount.toFixed(8)} USDT claimed!`,
                });
                // Reload transactions after claim
                const userTransactions = await getUserTransactions(data.id);
                setTransactions(userTransactions || []);
            } else {
                toast({
                    title: "Claim Failed",
                    description: result.error || "Something went wrong.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Claim error:', error);
            toast({
                title: "Claim Failed",
                description: "Something went wrong. Please try again.",
                variant: "destructive"
            });
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
            {/* User Profile Card */}
            <Card className="bg-white rounded-2xl shadow-md p-4">
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

            {/* Balance Card */}
            <Card className="bg-white rounded-2xl shadow-md p-4 text-center cursor-pointer" onClick={handleClaim}>
                <CardContent className="p-0">
                    <p className="text-sm text-gray-500">Total Balance</p>
                    <p className="text-4xl font-bold my-1">{data.totalMined.toFixed(8)}</p>
                    <p className="text-xs text-gray-400 mb-3">USDT</p>
                    <div className="flex space-x-2 justify-center mt-2">
                        <Button 
                            className="bg-brand-yellow text-black font-bold flex-1" 
                            onClick={(e) => {
                                e.stopPropagation(); 
                                navigate('/deposit');
                            }}
                        >
                            Deposit
                        </Button>
                        <Button 
                            className="bg-gray-200 text-gray-700 font-bold flex-1" 
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
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="tokens">
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        {/* USDT Balance Card */}
                        <Card className="bg-white rounded-2xl shadow-md p-4 cursor-pointer" onClick={handleClaim}>
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
                        
                        {/* Storage Card */}
                        <Card className="bg-white rounded-2xl shadow-md p-4 cursor-pointer" onClick={handleClaim}>
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
                                        <div className="flex items-center space-x-1 text-brand-green">
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
                    <Card className="bg-white rounded-2xl shadow-md p-4 mt-2">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">Transaction History</h3>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={async () => {
                                        setTransactionsLoading(true);
                                        try {
                                            const userTransactions = await getUserTransactions(data.id);
                                            setTransactions(userTransactions || []);
                                        } catch (error) {
                                            console.error('Error reloading transactions:', error);
                                        } finally {
                                            setTransactionsLoading(false);
                                        }
                                    }}
                                >
                                    Refresh
                                </Button>
                            </div>
                            <TransactionHistory 
                                transactions={transactions} 
                                loading={transactionsLoading}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            {/* Daily Earn Button */}
            <Button 
                className="w-full h-14 bg-brand-yellow text-black font-bold text-lg flex justify-between items-center rounded-xl" 
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
