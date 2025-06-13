import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2, Check, X, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const AdminDashboardPage = ({ onLogout }) => {
    const { 
        tasks, 
        addTask, 
        updateTask, 
        removeTask, 
        pendingWithdrawals,
        pendingDeposits,
        adminStats,
        loadWithdrawalHistory,
        loadDepositHistory,
        withdrawalHistory,
        depositHistory,
        loading
    } = useAdmin();
    
    const { toast } = useToast();
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

    useEffect(() => {
        loadWithdrawalHistory();
        loadDepositHistory();
    }, []);

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

    const handleDownloadHistory = (data, type) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, type);
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(blob, `${type}_history.xlsx`);
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
                            onClick={() => window.location.reload()}
                            disabled={loading}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button onClick={onLogout}>Logout</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{adminStats.totalUsers}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Tasks</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{adminStats.totalTasks}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Withdrawals</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{adminStats.pendingWithdrawals}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Deposits</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{adminStats.pendingDeposits}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Tasks</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{adminStats.pendingTasks}</p>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
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

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Pending Withdrawals</CardTitle>
                </CardHeader>
                <CardContent>
                    {pendingWithdrawals.length === 0 ? (
                        <p className="text-gray-500">No pending withdrawals.</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingWithdrawals.map(withdrawal => (
                                <div key={withdrawal.id} className="p-3 bg-white rounded-lg shadow-sm flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">:User  {withdrawal.username} ({withdrawal.userId})</p>
                                        <p className="text-sm">Amount: {withdrawal.amount} USDT</p>
                                        <p className="text-xs text-gray-500">Address: {withdrawal.address}</p>
                                        <p className="text-xs text-gray-400">{withdrawal.createdAt?.toDate ? withdrawal.createdAt.toDate().toLocaleString() : 'Date not available'}</p>
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
                    {pendingDeposits.length === 0 ? (
                        <p className="text-gray-500">No pending deposits.</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingDeposits.map(deposit => (
                                <div key={deposit.id} className="p-3 bg-white rounded-lg shadow-sm flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">:User  {deposit.username} ({deposit.userId})</p>
                                        <p className="text-sm">Amount: {deposit.amount} USDT</p>
                                        <p className="text-xs text-gray-500">TxHash: {deposit.transactionHash}</p>
                                        <p className="text-xs text-gray-400">{deposit.createdAt?.toDate ? deposit.createdAt.toDate().toLocaleString() : 'Date not available'}</p>
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

            <Button onClick={() => setIsHistoryDialogOpen(true)} className="mt-4">
                View Withdrawal History
            </Button>

            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Withdrawal History</DialogTitle>
                    </DialogHeader>
                    <DialogContent>
                        <div className="space-y-4">
                            {withdrawalHistory.map(history => (
                                <div key={history.id} className="flex justify-between p-2 bg-gray-100 rounded-lg">
                                    <div>
                                        <p>User: {history.username}</p>
                                        <p>Amount: {history.amount} USDT</p>
                                        <p>Status: {history.status}</p>
                                        <p>Date: {history.createdAt?.toDate().toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                    <DialogFooter>
                        <Button onClick={() => handleDownloadHistory(withdrawalHistory, 'withdrawal')}>Download as Excel</Button>
                        <DialogClose asChild>
                            <Button variant="secondary">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Deposit History</DialogTitle>
                    </DialogHeader>
                    <DialogContent>
                        <div className="space-y-4">
                            {depositHistory.map(history => (
                                <div key={history.id} className="flex justify-between p-2 bg-gray-100 rounded-lg">
                                    <div>
                                        <p>User: {history.username}</p>
                                        <p>Amount: {history.amount} USDT</p>
                                        <p>Status: {history.status}</p>
                                        <p>Date: {history.createdAt?.toDate().toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                    <DialogFooter>
                        <Button onClick={() => handleDownloadHistory(depositHistory, 'deposit')}>Download as Excel</Button>
                        <DialogClose asChild>
                            <Button variant="secondary">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminDashboardPage;
