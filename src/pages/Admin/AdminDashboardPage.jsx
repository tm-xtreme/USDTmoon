import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2, Check, X, RefreshCw } from 'lucide-react';

const AdminDashboardPage = ({ onLogout }) => {
    const { 
        tasks, 
        addTask, 
        updateTask, 
        removeTask, 
        getPendingTransactions,
        approveWithdrawal,
        rejectWithdrawal,
        approveDeposit,
        rejectDeposit
    } = useAdmin();
    
    const { toast } = useToast();
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
    const [pendingDeposits, setPendingDeposits] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadPendingTransactions();
    }, []);

    const loadPendingTransactions = async () => {
        setLoading(true);
        try {
            const { withdrawals, deposits } = await getPendingTransactions();
            setPendingWithdrawals(withdrawals);
            setPendingDeposits(deposits);
        } catch (error) {
            console.error('Error loading pending transactions:', error);
            toast({
                title: "Error",
                description: "Failed to load pending transactions.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenTaskDialog = (task = null) => {
        setCurrentTask(task);
        setIsTaskDialogOpen(true);
    };

    const handleSaveTask = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const taskData = {
            name: formData.get('name'),
            description: formData.get('description'),
            reward: parseFloat(formData.get('reward')),
            type: formData.get('type'),
            icon: formData.get('icon'),
            target: formData.get('target'),
        };

        try {
            if (currentTask) {
                await updateTask({ ...currentTask, ...taskData });
                toast({ title: "Task Updated Successfully!" });
            } else {
                await addTask(taskData);
                toast({ title: "Task Added Successfully!" });
            }
            setIsTaskDialogOpen(false);
            setCurrentTask(null);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save task.",
                variant: "destructive"
            });
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await removeTask(taskId);
            toast({ title: "Task Deleted Successfully!" });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete task.",
                variant: "destructive"
            });
        }
    };

    const handleWithdrawalAction = async (withdrawal, approve) => {
        try {
            if (approve) {
                await approveWithdrawal(withdrawal.id);
                toast({ title: "Withdrawal Approved", description: `${withdrawal.amount} USDT approved for ${withdrawal.username}` });
            } else {
                await rejectWithdrawal(withdrawal.id, withdrawal.userId, withdrawal.amount);
                toast({ title: "Withdrawal Rejected", description: `${withdrawal.amount} USDT refunded to ${withdrawal.username}` });
            }
            await loadPendingTransactions();
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to ${approve ? 'approve' : 'reject'} withdrawal.`,
                variant: "destructive"
            });
        }
    };

    const handleDepositAction = async (deposit, approve) => {
        try {
            if (approve) {
                await approveDeposit(deposit.id, deposit.userId, deposit.amount);
                toast({ title: "Deposit Approved", description: `${deposit.amount} USDT credited to ${deposit.username}` });
            } else {
                await rejectDeposit(deposit.id);
                toast({ title: "Deposit Rejected", description: `Deposit rejected for ${deposit.username}` });
            }
            await loadPendingTransactions();
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to ${approve ? 'approve' : 'reject'} deposit.`,
                variant: "destructive"
            });
        }
    };

    return (
        <div className="p-4 bg-gray-100 min-h-screen">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Admin Dashboard</CardTitle>
                        <CardDescription>Manage tasks, users, and transactions.</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                        <Button 
                            variant="outline" 
                            onClick={loadPendingTransactions}
                            disabled={loading}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button onClick={onLogout}>Logout</Button>
                    </div>
                </CardHeader>
            </Card>

            <Card className="mt-6">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Task Management</CardTitle>
                    <Button onClick={() => handleOpenTaskDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {tasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                                <div>
                                    <p className="font-semibold">
                                        {task.name} 
                                        <span className="text-xs font-normal text-gray-500">({task.type})</span>
                                    </p>
                                    <p className="text-sm text-green-600">{task.reward} USDT</p>
                                    <p className="text-xs text-gray-500">{task.description}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleOpenTaskDialog(task)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="icon" 
                                        onClick={() => handleDeleteTask(task.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <p className="text-gray-500 text-center py-4">No tasks available.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveTask} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input 
                                id="name" 
                                name="name" 
                                defaultValue={currentTask?.name || ''} 
                                required 
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Input 
                                id="description" 
                                name="description" 
                                defaultValue={currentTask?.description || ''} 
                                required 
                            />
                        </div>
                        <div>
                            <Label htmlFor="reward">Reward (USDT)</Label>
                            <Input 
                                id="reward" 
                                name="reward" 
                                type="number" 
                                step="any" 
                                defaultValue={currentTask?.reward || ''} 
                                required 
                            />
                        </div>
                        <div>
                            <Label htmlFor="target">Target (URL or keyword)</Label>
                            <Input 
                                id="target" 
                                name="target" 
                                defaultValue={currentTask?.target || ''} 
                                required 
                            />
                        </div>
                        <div>
                            <Label htmlFor="type">Type</Label>
                            <select 
                                id="type" 
                                name="type" 
                                defaultValue={currentTask?.type || 'manual'} 
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="manual">Manual</option>
                                <option value="auto">Auto</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="icon">Icon (Lucide Name)</Label>
                            <Input 
                                id="icon" 
                                name="icon" 
                                defaultValue={currentTask?.icon || 'Gift'} 
                                placeholder="e.g., Gift, Send, Users" 
                                required 
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Save Task</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Pending Withdrawals</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <RefreshCw className="h-6 w-6 animate-spin" />
                        </div>
                    ) : pendingWithdrawals.length === 0 ? (
                        <p className="text-gray-500">No pending withdrawals.</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingWithdrawals.map(withdrawal => (
                                <div key={withdrawal.id} className="p-3 bg-white rounded-lg shadow-sm flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">User: {withdrawal.username} ({withdrawal.userId})</p>
                                        <p className="text-sm">Amount: {withdrawal.amount} USDT</p>
                                        <p className="text-xs text-gray-500">Address: {withdrawal.address}</p>
                                        <p className="text-xs text-gray-400">
                                            {withdrawal.createdAt?.toDate ? 
                                                withdrawal.createdAt.toDate().toLocaleString() : 
                                                'Date not available'
                                            }
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button 
                                            size="icon" 
                                            variant="outline" 
                                            className="text-green-500 border-green-500 hover:bg-green-50" 
                                            onClick={() => handleWithdrawalAction(withdrawal, true)}
                                        >
                                            <Check className="h-4 w-4"/>
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="outline" 
                                            className="text-red-500 border-red-500 hover:bg-red-50" 
                                            onClick={() => handleWithdrawalAction(withdrawal, false)}
                                        >
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Pending Deposits</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <RefreshCw className="h-6 w-6 animate-spin" />
                        </div>
                    ) : pendingDeposits.length === 0 ? (
                        <p className="text-gray-500">No pending deposits.</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingDeposits.map(deposit => (
                                <div key={deposit.id} className="p-3 bg-white rounded-lg shadow-sm flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">User: {deposit.username} ({deposit.userId})</p>
                                        <p className="text-sm">Amount: {deposit.amount} USDT</p>
                                        <p className="text-xs text-gray-500">TxHash: {deposit.transactionHash}</p>
                                        <p className="text-xs text-gray-400">
                                            {deposit.createdAt?.toDate ? 
                                                deposit.createdAt.toDate().toLocaleString() : 
                                                'Date not available'
                                            }
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button 
                                            size="icon" 
                                            variant="outline" 
                                            className="text-green-500 border-green-500 hover:bg-green-50" 
                                            onClick={() => handleDepositAction(deposit, true)}
                                        >
                                            <Check className="h-4 w-4"/>
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="outline" 
                                            className="text-red-500 border-red-500 hover:bg-red-50" 
                                            onClick={() => handleDepositAction(deposit, false)}
                                        >
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminDashboardPage;
