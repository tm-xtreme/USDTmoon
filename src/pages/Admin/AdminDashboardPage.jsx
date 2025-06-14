import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
    getAllTasks, 
    getAllUsers, 
    getPendingWithdrawals, 
    getPendingDeposits,
    approveWithdrawal,
    rejectWithdrawal,
    approveDeposit,
    rejectDeposit,
    updateUserData,
    addTransaction
} from '@/lib/firebaseService';
import { useGameData } from '@/hooks/useGameData';
import { useTelegram } from '@/hooks/useTelegram';
import { 
    CheckCircle, 
    XCircle, 
    Clock, 
    Users, 
    Gift, 
    ArrowUpCircle, 
    ArrowDownCircle,
    RefreshCw,
    Eye,
    AlertTriangle,
    DollarSign,
    TrendingUp,
    Database
} from 'lucide-react';

const AdminDashboardPage = () => {
    const { toast } = useToast();
    const { user } = useTelegram();
    const { approveTask, rejectTask } = useGameData();
    
    // State management
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Data states
    const [pendingTasks, setPendingTasks] = useState([]);
    const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
    const [pendingDeposits, setPendingDeposits] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    
    // Dialog states
    const [selectedItem, setSelectedItem] = useState(null);
    const [dialogType, setDialogType] = useState(''); // 'task', 'withdrawal', 'deposit'
    const [actionType, setActionType] = useState(''); // 'approve', 'reject'
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    // Check if user is admin
    const isAdmin = user?.id?.toString() === '5063003944';

    // Load all data
    const loadData = async () => {
        try {
            setLoading(true);
            
            const [tasks, users, withdrawals, deposits] = await Promise.all([
                getAllTasks(),
                getAllUsers(),
                getPendingWithdrawals(),
                getPendingDeposits()
            ]);

            setAllTasks(tasks || []);
            setAllUsers(users || []);
            setPendingWithdrawals(withdrawals || []);
            setPendingDeposits(deposits || []);

            // Filter pending tasks from users
            const pending = [];
            if (users && tasks) {
                users.forEach(user => {
                    if (user.userTasks) {
                        Object.entries(user.userTasks).forEach(([taskId, taskData]) => {
                            if (taskData.status === 'pending_approval') {
                                const task = tasks.find(t => t.id === taskId);
                                if (task) {
                                    pending.push({
                                        ...taskData,
                                        taskId,
                                        userId: user.id,
                                        username: user.username || user.first_name || 'Unknown',
                                        taskDetails: task
                                    });
                                }
                            }
                        });
                    }
                });
            }
            setPendingTasks(pending);

        } catch (error) {
            console.error('Error loading admin data:', error);
            toast({
                title: "Error",
                description: "Failed to load admin data. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Refresh data
    const refreshData = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
        toast({
            title: "Data Refreshed",
            description: "All data has been updated successfully."
        });
    };

    useEffect(() => {
        if (isAdmin) {
            loadData();
        }
    }, [isAdmin]);

    // Handle task approval
    const handleTaskApproval = async (approve) => {
        if (!selectedItem) return;
        
        setProcessing(true);
        try {
            let result;
            if (approve) {
                result = await approveTask(
                    selectedItem.userId, 
                    selectedItem.taskId, 
                    selectedItem.taskDetails
                );
            } else {
                result = await rejectTask(
                    selectedItem.userId, 
                    selectedItem.taskId, 
                    selectedItem.taskDetails, 
                    rejectionReason
                );
            }

            if (result.success) {
                toast({
                    title: approve ? "Task Approved! ✅" : "Task Rejected! ❌",
                    description: `Task "${selectedItem.taskDetails.name}" has been ${approve ? 'approved' : 'rejected'}.`
                });
                
                // Remove from pending tasks
                setPendingTasks(prev => prev.filter(t => 
                    !(t.userId === selectedItem.userId && t.taskId === selectedItem.taskId)
                ));
                
                setSelectedItem(null);
                setRejectionReason('');
            } else {
                toast({
                    title: "Error",
                    description: result.reason || "Failed to process task.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error processing task:', error);
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive"
            });
        } finally {
            setProcessing(false);
        }
    };

    // Handle withdrawal approval/rejection
    const handleWithdrawalAction = async (approve) => {
        if (!selectedItem) return;
        
        setProcessing(true);
        try {
            let result;
            if (approve) {
                result = await approveWithdrawal(selectedItem.id);
            } else {
                result = await rejectWithdrawal(selectedItem.id, rejectionReason);
            }

            if (result.success) {
                toast({
                    title: approve ? "Withdrawal Approved! ✅" : "Withdrawal Rejected! ❌",
                    description: `Withdrawal of ${selectedItem.amount} USDT has been ${approve ? 'approved' : 'rejected'}.`
                });
                
                // Remove from pending withdrawals
                setPendingWithdrawals(prev => prev.filter(w => w.id !== selectedItem.id));
                
                setSelectedItem(null);
                setRejectionReason('');
            } else {
                toast({
                    title: "Error",
                    description: result.reason || "Failed to process withdrawal.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive"
            });
        } finally {
            setProcessing(false);
        }
    };

    // Handle deposit approval/rejection
    const handleDepositAction = async (approve) => {
        if (!selectedItem) return;
        
        setProcessing(true);
        try {
            let result;
            if (approve) {
                result = await approveDeposit(selectedItem.id);
            } else {
                result = await rejectDeposit(selectedItem.id, rejectionReason);
            }

            if (result.success) {
                toast({
                    title: approve ? "Deposit Approved! ✅" : "Deposit Rejected! ❌",
                    description: `Deposit of ${selectedItem.amount} USDT has been ${approve ? 'approved' : 'rejected'}.`
                });
                
                // Remove from pending deposits
                setPendingDeposits(prev => prev.filter(d => d.id !== selectedItem.id));
                
                setSelectedItem(null);
                setRejectionReason('');
            } else {
                toast({
                    title: "Error",
                    description: result.reason || "Failed to process deposit.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error processing deposit:', error);
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive"
            });
        } finally {
            setProcessing(false);
        }
    };

    // Open dialog for actions
    const openDialog = (item, type, action) => {
        setSelectedItem(item);
        setDialogType(type);
        setActionType(action);
        setRejectionReason('');
    };

    // Close dialog
    const closeDialog = () => {
        setSelectedItem(null);
        setDialogType('');
        setActionType('');
        setRejectionReason('');
    };

    // Format date
    const formatDate = (timestamp) => {
        try {
            let date;
            if (timestamp?.toDate) {
                date = timestamp.toDate();
            } else if (timestamp?.seconds) {
                date = new Date(timestamp.seconds * 1000);
            } else {
                date = new Date(timestamp);
            }
            return date.toLocaleString();
        } catch {
            return 'Unknown date';
        }
    };

    // Calculate statistics
    const stats = {
        totalUsers: allUsers.length,
        totalTasks: allTasks.length,
        pendingTasksCount: pendingTasks.length,
        pendingWithdrawalsCount: pendingWithdrawals.length,
        pendingDepositsCount: pendingDeposits.length,
        totalWithdrawalAmount: pendingWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0),
        totalDepositAmount: pendingDeposits.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
    };

    if (!isAdmin) {
        return (
            <div className="p-4 text-center bg-gradient-to-b from-yellow-50 to-orange-50 min-h-screen">
                <div className="max-w-md mx-auto mt-20">
                    <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
                    <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-4 text-center bg-gradient-to-b from-yellow-50 to-orange-50 min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow mx-auto mt-20"></div>
                <p className="mt-4 text-brand-text">Loading admin dashboard...</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 bg-gradient-to-b from-yellow-50 to-orange-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-brand-text">Admin Dashboard</h1>
                    <p className="text-gray-600">Manage tasks, withdrawals, and deposits</p>
                </div>
                <Button 
                    onClick={refreshData} 
                    disabled={refreshing}
                    className="bg-brand-yellow text-black font-bold hover:bg-yellow-400"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white border border-gray-100">
                    <CardContent className="p-4 text-center">
                        <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.totalUsers}</p>
                        <p className="text-sm text-gray-500">Total Users</p>
                    </CardContent>
                </Card>
                
                <Card className="bg-white border border-gray-100">
                    <CardContent className="p-4 text-center">
                        <Gift className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.totalTasks}</p>
                        <p className="text-sm text-gray-500">Total Tasks</p>
                    </CardContent>
                </Card>
                
                <Card className="bg-white border border-gray-100">
                    <CardContent className="p-4 text-center">
                        <ArrowUpCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.totalWithdrawalAmount.toFixed(4)}</p>
                        <p className="text-sm text-gray-500">Pending Withdrawals</p>
                    </CardContent>
                </Card>
                
                <Card className="bg-white border border-gray-100">
                    <CardContent className="p-4 text-center">
                        <ArrowDownCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.totalDepositAmount.toFixed(4)}</p>
                        <p className="text-sm text-gray-500">Pending Deposits</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="tasks" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-200">
                    <TabsTrigger value="tasks" className="relative">
                        Tasks
                        {stats.pendingTasksCount > 0 && (
                            <Badge className="ml-2 bg-red-500 text-white text-xs">
                                {stats.pendingTasksCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="withdrawals" className="relative">
                        Withdrawals
                        {stats.pendingWithdrawalsCount > 0 && (
                            <Badge className="ml-2 bg-red-500 text-white text-xs">
                                {stats.pendingWithdrawalsCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="deposits" className="relative">
                        Deposits
                        {stats.pendingDepositsCount > 0 && (
                            <Badge className="ml-2 bg-red-500 text-white text-xs">
                                {stats.pendingDepositsCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Pending Tasks Tab */}
                <TabsContent value="tasks">
                    <Card className="bg-white border border-gray-100">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Clock className="h-5 w-5 mr-2 text-orange-500" />
                                Pending Tasks ({stats.pendingTasksCount})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingTasks.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Gift className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No pending tasks to review</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingTasks.map((task, index) => (
                                        <div key={`${task.userId}-${task.taskId}`} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <h3 className="font-bold text-lg">{task.taskDetails.name}</h3>
                                                        <Badge variant="outline" className="text-xs">
                                                            {task.taskDetails.type === 'auto' ? 'Auto' : 'Manual'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2">{task.taskDetails.description}</p>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="font-semibold">User:</span> {task.username}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">Reward:</span> {task.taskDetails.reward} USDT
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">Target:</span> {task.taskDetails.target}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">Submitted:</span> {formatDate(task.submittedAt)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col space-y-2 ml-4">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-500 text-white hover:bg-green-600"
                                                        onClick={() => openDialog(task, 'task', 'approve')}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => openDialog(task, 'task', 'reject')}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Pending Withdrawals Tab */}
                <TabsContent value="withdrawals">
                    <Card className="bg-white border border-gray-100">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <ArrowUpCircle className="h-5 w-5 mr-2 text-red-500" />
                                Pending Withdrawals ({stats.pendingWithdrawalsCount})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingWithdrawals.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <ArrowUpCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No pending withdrawals to review</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingWithdrawals.map((withdrawal) => (
                                        <div key={withdrawal.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <h3 className="font-bold text-lg">{withdrawal.amount} USDT</h3>
                                                        <Badge className="bg-red-100 text-red-800">
                                                            {withdrawal.status || 'Pending'}
                                                        </Badge>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="font-semibold">User:</span> {withdrawal.username || 'Unknown'}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">User ID:</span> {withdrawal.userId}
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <span className="font-semibold">Address:</span> 
                                                            <span className="font-mono text-xs ml-2 break-all">{withdrawal.address}</span>
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">Requested:</span> {formatDate(withdrawal.createdAt)}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">Network:</span> BEP20 (BSC)
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col space-y-2 ml-4">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-500 text-white hover:bg-green-600"
                                                        onClick={() => openDialog(withdrawal, 'withdrawal', 'approve')}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => openDialog(withdrawal, 'withdrawal', 'reject')}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Pending Deposits Tab */}
                <TabsContent value="deposits">
                    <Card className="bg-white border border-gray-100">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <ArrowDownCircle className="h-5 w-5 mr-2 text-green-500" />
                                Pending Deposits ({stats.pendingDepositsCount})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingDeposits.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <ArrowDownCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>No pending deposits to review</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingDeposits.map((deposit) => (
                                        <div key={deposit.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <h3 className="font-bold text-lg">{deposit.amount} USDT</h3>
                                                        <Badge className="bg-green-100 text-green-800">
                                                            {deposit.status || 'Pending'}
                                                        </Badge>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="font-semibold">User:</span> {deposit.username || 'Unknown'}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">User ID:</span> {deposit.userId}
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <span className="font-semibold">Transaction Hash:</span> 
                                                            <span className="font-mono text-xs ml-2 break-all">{deposit.transactionHash}</span>
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">Submitted:</span> {formatDate(deposit.createdAt)}
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold">Network:</span> BEP20 (BSC)
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col space-y-2 ml-4">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-500 text-white hover:bg-green-600"
                                                        onClick={() => openDialog(deposit, 'deposit', 'approve')}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => openDialog(deposit, 'deposit', 'reject')}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Action Dialog */}
            <Dialog open={!!selectedItem} onOpenChange={closeDialog}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approve' ? 'Approve' : 'Reject'} {' '}
                            {dialogType === 'task' ? 'Task' : 
                             dialogType === 'withdrawal' ? 'Withdrawal' : 'Deposit'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        {selectedItem && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2">Details:</h4>
                                {dialogType === 'task' && (
                                    <div className="space-y-1 text-sm">
                                        <p><span className="font-medium">Task:</span> {selectedItem.taskDetails?.name}</p>
                                        <p><span className="font-medium">User:</span> {selectedItem.username}</p>
                                        <p><span className="font-medium">Reward:</span> {selectedItem.taskDetails?.reward} USDT</p>
                                        <p><span className="font-medium">Type:</span> {selectedItem.taskDetails?.type}</p>
                                    </div>
                                )}
                                {dialogType === 'withdrawal' && (
                                    <div className="space-y-1 text-sm">
                                        <p><span className="font-medium">Amount:</span> {selectedItem.amount} USDT</p>
                                        <p><span className="font-medium">User:</span> {selectedItem.username}</p>
                                        <p><span className="font-medium">Address:</span> {selectedItem.address}</p>
                                    </div>
                                )}
                                {dialogType === 'deposit' && (
                                    <div className="space-y-1 text-sm">
                                        <p><span className="font-medium">Amount:</span> {selectedItem.amount} USDT</p>
                                        <p><span className="font-medium">User:</span> {selectedItem.username}</p>
                                        <p><span className="font-medium">Hash:</span> {selectedItem.transactionHash}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {actionType === 'reject' && (
                            <div>
                                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                                <Textarea
                                    id="rejection-reason"
                                    placeholder="Enter reason for rejection..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        )}
                        
                        {actionType === 'approve' && (
                            <div className="bg-green-50 p-4 rounded-lg">
                                <p className="text-green-800 text-sm">
                                    {dialogType === 'task' && 'This will reward the user and mark the task as completed.'}
                                    {dialogType === 'withdrawal' && 'This will mark the withdrawal as approved. Make sure to process the actual payment.'}
                                    {dialogType === 'deposit' && 'This will add the amount to the user\'s balance.'}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog} disabled={processing}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (dialogType === 'task') {
                                    handleTaskApproval(actionType === 'approve');
                                } else if (dialogType === 'withdrawal') {
                                    handleWithdrawalAction(actionType === 'approve');
                                } else if (dialogType === 'deposit') {
                                    handleDepositAction(actionType === 'approve');
                                }
                            }}
                            disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
                            className={actionType === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
                        >
                            {processing ? (
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                <>
                                    {actionType === 'approve' ? (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Approve
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Reject
                                        </>
                                    )}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminDashboardPage;
