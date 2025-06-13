
import React from 'react';
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


const TransactionHistory = ({ transactions }) => {
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
        deposit_approved: <Download className="h-5 w-5 text-green-500" />,
    }

    const LABELS = {
        claim: "Storage Claim",
        fee: "Claim Fee",
        task_reward: "Task Reward",
        upgrade_miner: "Miner Upgrade",
        upgrade_storage: "Storage Upgrade",
        withdrawal_request: "Withdrawal Request",
        deposit_approved: "Deposit Approved",
    }
    
    return (
        <div className="space-y-2 py-4">
            {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-3">
                        {ICONS[tx.type] || <ArrowUpCircle className="h-5 w-5 text-gray-500" />}
                        <div>
                            <p className="font-semibold">{LABELS[tx.type] || 'Transaction'}</p>
                            <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleString()}</p>
                        </div>
                    </div>
                    <p className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(8)}
                    </p>
                </div>
            ))}
        </div>
    );
}

const WithdrawSheet = ({ open, onOpenChange }) => {
    const { toast } = useToast();
    const { data, requestWithdrawal } = useGameData();
    const [amount, setAmount] = React.useState('');
    const [address, setAddress] = React.useState('');

    const handleSubmit = () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a valid positive amount.", variant: "destructive" });
            return;
        }
        if (!address.trim()) { // Basic validation
            toast({ title: "Invalid Address", description: "Please enter a valid wallet address.", variant: "destructive" });
            return;
        }
        if (data.totalMined < numAmount) {
             toast({ title: "Insufficient Balance", description: "You don't have enough USDT to withdraw.", variant: "destructive" });
            return;
        }

        const result = requestWithdrawal(numAmount, address);
        if (result.success) {
            toast({ title: "Withdrawal Requested", description: "Your request is pending admin approval." });
            setAmount('');
            setAddress('');
            onOpenChange(false);
        } else {
            toast({ title: "Withdrawal Failed", description: result.reason, variant: "destructive" });
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
                        <Input id="withdraw-amount" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="withdraw-address">Wallet Address (BEP20)</Label>
                        <Input id="withdraw-address" type="text" placeholder="0x..." value={address} onChange={e => setAddress(e.target.value)} />
                    </div>
                </div>
                <SheetFooter>
                    <Button onClick={handleSubmit} className="w-full bg-brand-yellow text-black font-bold">Confirm Withdrawal</Button>
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
    const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = React.useState(false);

    if (!isInitialized || !data) {
        return <div className="text-center p-10">Loading...</div>;
    }
    
    const isStorageFull = data.storageMined >= data.storageCapacity;

    return (
        <div className="p-4 space-y-4">
            <Card className="bg-white rounded-2xl shadow-md p-4">
                <CardContent className="flex items-center space-x-3 p-0">
                    <Avatar className="h-12 w-12"><AvatarImage src={user?.photo_url} alt={user?.username} /><AvatarFallback>{user?.first_name?.[0]}</AvatarFallback></Avatar>
                    <div><p className="font-bold">{`${user?.first_name || 'User'} ${user?.last_name || ''}`}</p><p className="text-sm text-gray-500">@{user?.username || 'telegram_user'}</p></div>
                </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl shadow-md p-4 text-center cursor-pointer" onClick={() => navigate('/claim')}>
                <CardContent className="p-0">
                    <p className="text-sm text-gray-500">Total Balance</p>
                    <p className="text-4xl font-bold my-1">{data.totalMined.toFixed(8)}</p>
                    <div className="flex space-x-2 justify-center mt-2">
                        <Button className="bg-brand-yellow text-black font-bold flex-1" onClick={(e) => {e.stopPropagation(); navigate('/deposit')}}>Deposit</Button>
                        <Button className="bg-gray-200 text-gray-700 font-bold flex-1" onClick={(e) => {e.stopPropagation(); setIsWithdrawSheetOpen(true)}}>Withdraw</Button>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="tokens" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-200"><TabsTrigger value="tokens">Tokens</TabsTrigger><TabsTrigger value="transactions">Transactions</TabsTrigger></TabsList>
                <TabsContent value="tokens">
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <Card className="bg-white rounded-2xl shadow-md p-4 cursor-pointer" onClick={() => navigate('/claim')}>
                            <CardContent className="p-0"><p className="font-bold">USDT Balance</p><p className="text-2xl font-bold">{data.totalMined.toFixed(8)}</p>
                                <img  className="w-full h-16 object-cover rounded-lg mt-2" alt="Moon and planet illustration" src="https://images.unsplash.com/photo-1695738654978-cca6cbfcb8df" />
                            </CardContent>
                        </Card>
                         <Card className="bg-white rounded-2xl shadow-md p-4 cursor-pointer" onClick={() => navigate('/claim')}>
                            <CardContent className="p-0 flex flex-col justify-between h-full">
                                <div><p className="font-bold">Storage</p><Progress value={(data.storageMined / data.storageCapacity) * 100} className="mt-2 h-3 bg-gray-200 [&>div]:bg-brand-yellow" /></div>
                                <div className="mt-2">
                                     {isStorageFull ? (<div className="flex items-center space-x-1 text-brand-green"><CheckCircle className="h-4 w-4" /><span className="font-bold text-sm">Full</span></div>) : (<p className="text-gray-500 text-sm">Collecting</p>)}
                                    <p className="font-bold text-lg">{data.storageMined.toFixed(8)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="transactions">
                    <Card className="bg-white rounded-2xl shadow-md p-4 mt-2">
                        <TransactionHistory transactions={data.transactions}/>
                    </Card>
                </TabsContent>
            </Tabs>
            
             <Button className="w-full h-14 bg-brand-yellow text-black font-bold text-lg flex justify-between items-center rounded-xl" onClick={() => navigate('/boost')}>
                <span>EARN 0.1 USDT ON DAILY</span>
                <ChevronRight className="h-6 w-6" />
            </Button>
            <WithdrawSheet open={isWithdrawSheetOpen} onOpenChange={setIsWithdrawSheetOpen} />
        </div>
    );
};

export default HomePage;
