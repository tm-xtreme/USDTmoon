import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    PlusCircle, 
    Edit, 
    Trash2, 
    Check, 
    X, 
    RefreshCw, 
    Download, 
    History, 
    Users, 
    DollarSign,
    FileText,
    TrendingUp,
    Clock,
    AlertCircle
} from 'lucide-react';
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
        pendingTaskSubmissions,
        adminStats,
        approveWithdrawal,
        rejectWithdrawal,
        approveDeposit,
        rejectDeposit,
        approveTaskSubmission,
        rejectTaskSubmission,
        loadWithdrawalHistory,
        loadDepositHistory,
        withdrawalHistory,
        depositHistory,
        refreshData,
        loading
    } = useAdmin();
    
    const { toast } = useToast();
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [isWithdrawalHistoryOpen, setIsWithdrawalHistoryOpen] = useState(false);
    const [isDepositHistoryOpen, setIsDepositHistoryOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [currentSubmission, setCurrentSubmission] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadWithdrawalHistory();
        loadDepositHistory();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshData();
            await loadWithdrawalHistory();
            await loadDepositHistory();
            toast({
                title: "Success",
                description: "Data refreshed successfully!",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to refresh data.",
                variant: "destructive"
            });
        } finally {
            setRefreshing(false);
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
        if (!confirm('Are you sure you want to delete this task?')) return;
        
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
                toast({ 
                    title: "Withdrawal Approved", 
                    description: `${withdrawal.amount} USDT approved for ${withdrawal.username}` 
                });
            } else {
                await rejectWithdrawal(withdrawal.id, withdrawal.userId, withdrawal.amount);
                toast({ 
                    title: "Withdrawal Rejected", 
                    description: `${withdrawal.amount} USDT refunded to ${withdrawal.username}` 
                });
            }
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
                toast({ 
                    title: "Deposit Approved", 
                    description: `${deposit.amount} USDT credited to ${deposit.username}` 
                });
            } else {
                await rejectDeposit(deposit.id);
                toast({ 
                    title: "Deposit Rejected", 
                    description: `Deposit rejected for ${deposit.username}` 
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to ${approve ? 'approve' : 'reject'} deposit.`,
                variant: "destructive"
            });
        }
    };

    const handleTaskSubmissionApprove = async (submission) => {
        try {
            await approveTaskSubmission(submission.id, submission.userId, submission.taskReward);
            toast({ 
                title: "Task Approved", 
                description: `${submission.taskReward} USDT rewarded to ${submission.username || submission.firstName}` 
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to approve task submission.",
                variant: "destructive"
            });
        }
    };

    const handleTaskSubmissionReject = (submission) => {
        setCurrentSubmission(submission);
        setRejectionReason('');
        setIsRejectDialogOpen(true);
    };

    const confirmTaskRejection = async () => {
        try {
            await rejectTaskSubmission(currentSubmission.id, rejectionReason);
            toast({ 
                title: "Task Rejected", 
                description: `Task rejected for ${currentSubmission.username || currentSubmission.firstName}` 
            });
            setIsRejectDialogOpen(false);
            setCurrentSubmission(null);
            setRejectionReason('');
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to reject task submission.",
                variant: "destructive"
            });
        }
    };

    const handleDownloadHistory = (data, type) => {
        try {
            const formattedData = data.map(item => ({
                ID: item.id,
                Username: item.username,
                'User ID': item.userId,
                Amount: item.amount,
                Status: item.status,
                Address: item.address || 'N/A',
                'Transaction Hash': item.transactionHash || 'N/A',
                'Created At': item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : 'N/A',
                'Updated At': item.updatedAt?.toDate ? item.updatedAt.toDate().toLocaleString() : 'N/A'
            }));

            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, type);
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
            saveAs(blob, `${type}_history_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            toast({
                title: "Success",
                description: `${type} history downloaded successfully!`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to download history.",
                variant: "destructive"
            });
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        if (timestamp.toDate) {
            return timestamp.toDate().toLocaleString();
        }
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <Card className="mb-6">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
                        <CardDescription>Manage tasks, users, and transactions for MOONUSDT</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                        <Button 
                            variant="outline" 
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button onClick={onLogout} variant="destructive">
                            Logout
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{adminStats.totalUsers || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{adminStats.totalTasks || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
                        <TrendingUp className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{adminStats.pendingWithdrawals || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{adminStats.pendingDeposits || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{adminStats.pendingTasks || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="tasks" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="tasks">Task Management</TabsTrigger>
                    <TabsTrigger value="pending-tasks">
                        Pending Tasks
                        {pendingTaskSubmissions && pendingTaskSubmissions.length > 0 && (
                            <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                                {pendingTaskSubmissions.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                    <TabsTrigger value="deposits">Deposits</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                {/* Tasks Tab */}
                <TabsContent value="tasks">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Task Management</CardTitle>
                            <Button onClick={() => handleOpenTaskDialog()}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {tasks && tasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <h3 className="font-semibold">{task.name}</h3>
                                                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                                                    {task.type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-green-600 font-medium">{task.reward} USDT</p>
                                            <p className="text-sm text-gray-600">{task.description}</p>
                                            <p className="text-xs text-gray-400">Target: {task.target}</p>
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
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleDeleteTask(task.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {(!tasks || tasks.length === 0) && (
                                    <div className="text-center py-8 text-gray-500">
                                        <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                        <p>No tasks available. Create your first task!</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Pending Tasks Tab */}
                <TabsContent value="pending-tasks">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Clock className="h-5 w-5 text-orange-500" />
                                <span>Pending Task Submissions</span>
                            </CardTitle>
                            <CardDescription>Review and approve/reject manual task submissions from users</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {(!pendingTaskSubmissions || pendingTaskSubmissions.length === 0) ? (
                                <div className="text-center py-8 text-gray-500">
                                    <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                    <p>No pending task submissions.</p>
                                    <p className="text-sm">All tasks are up to date!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingTaskSubmissions.map(submission => (
                                        <div key={submission.id} className="p-4 bg-white rounded-lg border shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 space-y-2">
                                                    {/* User Info */}
                                                    <div className="flex items-center space-x-2">
                                                        <div className="p-2 bg-blue-100 rounded-full">
                                                            <Users className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">
                                                                {submission.username || `${submission.firstName} ${submission.lastName}`.trim() || 'Unknown User'}
                                                            </p>
                                                            <p className="text-sm text-gray-500">User ID: {submission.userId}</p>
                                                        </div>
                                                    </div>

                                                    {/* Task Info */}
                                                    <div className="bg-gray-50 p-3 rounded-lg">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-semibold text-lg">{submission.taskName}</h4>
                                                            <span className="text-lg font-bold text-green-600">
                                                                +{submission.taskReward} USDT
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-2">{submission.taskDescription}</p>
                                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                            <span>Target: {submission.taskTarget}</span>
                                                            <span>Type: {submission.taskType}</span>
                                                            <span>Submitted: {formatDate(submission.submittedAt)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-col space-y-2 ml-4">
                                                    <Button 
                                                        size="sm" 
                                                        className="bg-green-600 hover:bg-green-700 text-white" 
                                                        onClick={() => handleTaskSubmissionApprove(submission)}
                                                    >
                                                        <Check className="h-4 w-4 mr-1"/>
                                                        Approve
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-red-600 border-red-600 hover:bg-red-50" 
                                                        onClick={() => handleTaskSubmissionReject(submission)}
                                                    >
                                                        <X className="h-4 w-4 mr-1"/>
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

                {/* Withdrawals Tab */}
                <TabsContent value="withdrawals">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Withdrawals</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(!pendingWithdrawals || pendingWithdrawals.length === 0) ? (
                                <div className="text-center py-8 text-gray-500">
                                    <DollarSign className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                    <p>No pending withdrawals.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingWithdrawals.map(withdrawal => (
                                        <div key={withdrawal.id} className="p-4 bg-white rounded-lg border shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-medium">User: {withdrawal.username} ({withdrawal.userId})</p>
                                                    <p className="text-lg font-bold text-red-600">{withdrawal.amount} USDT</p>
                                                    <p className="text-sm text-gray-600">Address: {withdrawal.address}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {formatDate(withdrawal.createdAt)}
                                                    </p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-green-600 border-green-600 hover:bg-green-50" 
                                                        onClick={() => handleWithdrawalAction(withdrawal, true)}
                                                    >
                                                        <Check className="h-4 w-4 mr-1"/>
                                                        Approve
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-red-600 border-red-600 hover:bg-red-50" 
                                                        onClick={() => handleWithdrawalAction(withdrawal, false)}
                                                    >
                                                        <X className="h-4 w-4 mr-1"/>
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

                {/* Deposits Tab */}
                <TabsContent value="deposits">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Deposits</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(!pendingDeposits || pendingDeposits.length === 0) ? (
                                <div className="text-center py-8 text-gray-500">
                                    <TrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                    <p>No pending deposits.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingDeposits.map(deposit => (
                                        <div key={deposit.id} className="p-4 bg-white rounded-lg border shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-medium">User: {deposit.username} ({deposit.userId})</p>
                                                    <p className="text-lg font-bold text-green-600">{deposit.amount} USDT</p>
                                                    <p className="text-sm text-gray-600">TxHash: {deposit.transactionHash}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {formatDate(deposit.createdAt)}
                                                    </p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-green-600 border-green-600 hover:bg-green-50" 
                                                        onClick={() => handleDepositAction(deposit, true)}
                                                    >
                                                        <Check className="h-4 w-4 mr-1"/>
                                                        Approve
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-red-600 border-red-600 hover:bg-red-50" 
                                                        onClick={() => handleDepositAction(deposit, false)}
                                                    >
                                                        <X className="h-4 w-4 mr-1"/>
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

                {/* History Tab */}
                <TabsContent value="history">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Withdrawal History</CardTitle>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setIsWithdrawalHistoryOpen(true)}
                                >
                                    <History className="h-4 w-4 mr-2" />
                                    View All
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {withdrawalHistory && withdrawalHistory.slice(0, 5).map(withdrawal => (
                                        <div key={withdrawal.id} className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium text-sm">{withdrawal.username}</p>
                                                    <p className="text-xs text-gray-500">{withdrawal.amount} USDT</p>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    withdrawal.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    withdrawal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {withdrawal.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!withdrawalHistory || withdrawalHistory.length === 0) && (
                                        <p className="text-gray-500 text-center py-4">No withdrawal history</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Deposit History</CardTitle>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setIsDepositHistoryOpen(true)}
                                >
                                    <History className="h-4 w-4 mr-2" />
                                    View All
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {depositHistory && depositHistory.slice(0, 5).map(deposit => (
                                        <div key={deposit.id} className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium text-sm">{deposit.username}</p>
                                                    <p className="text-xs text-gray-500">{deposit.amount} USDT</p>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    deposit.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    deposit.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {deposit.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!depositHistory || depositHistory.length === 0) && (
                                        <p className="text-gray-500 text-center py-4">No deposit history</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Task Dialog */}
            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{currentTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveTask} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Task Name</Label>
                            <Input 
                                id="name" 
                                name="name" 
                                defaultValue={currentTask?.name || ''} 
                                placeholder="Enter task name"
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input 
                                id="description" 
                                name="description" 
                                defaultValue={currentTask?.description || ''} 
                                placeholder="Enter task description"
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reward">Reward (USDT)</Label>
                            <Input 
                                id="reward" 
                                name="reward" 
                                type="number" 
                                step="0.000001" 
                                defaultValue={currentTask?.reward || ''} 
                                placeholder="0.000000"
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="target">Target (URL or keyword)</Label>
                            <Input 
                                id="target" 
                                name="target" 
                                defaultValue={currentTask?.target || ''} 
                                placeholder="https://example.com or keyword"
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">Task Type</Label>
                            <select 
                                id="type" 
                                name="type" 
                                defaultValue={currentTask?.type || 'manual'} 
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="manual">Manual Verification</option>
                                <option value="auto">Auto Verification</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="icon">Icon (Lucide Name)</Label>
                            <Input 
                                id="icon" 
                                name="icon" 
                                defaultValue={currentTask?.icon || 'Gift'} 
                                placeholder="e.g., Gift, Send, Users, Star"
                                required 
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">
                                {currentTask ? 'Update Task' : 'Create Task'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Withdrawal History Dialog */}
            <Dialog open={isWithdrawalHistoryOpen} onOpenChange={setIsWithdrawalHistoryOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Complete Withdrawal History</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {withdrawalHistory && withdrawalHistory.map(withdrawal => (
                            <div key={withdrawal.id} className="p-4 border rounded-lg">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="font-medium">{withdrawal.username}</p>
                                        <p className="text-sm text-gray-500">ID: {withdrawal.userId}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">{withdrawal.amount} USDT</p>
                                        <p className="text-xs text-gray-500">Amount</p>
                                    </div>
                                    <div>
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            withdrawal.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            withdrawal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {withdrawal.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">
                                            {formatDate(withdrawal.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <p className="text-xs text-gray-600">Address: {withdrawal.address}</p>
                                </div>
                            </div>
                        ))}
                        {(!withdrawalHistory || withdrawalHistory.length === 0) && (
                            <p className="text-center text-gray-500 py-8">No withdrawal history available</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={() => handleDownloadHistory(withdrawalHistory, 'withdrawal')}
                            disabled={!withdrawalHistory || withdrawalHistory.length === 0}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download Excel
                        </Button>
                        <DialogClose asChild>
                            <Button variant="secondary">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deposit History Dialog */}
            <Dialog open={isDepositHistoryOpen} onOpenChange={setIsDepositHistoryOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Complete Deposit History</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {depositHistory && depositHistory.map(deposit => (
                            <div key={deposit.id} className="p-4 border rounded-lg">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="font-medium">{deposit.username}</p>
                                        <p className="text-sm text-gray-500">ID: {deposit.userId}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">{deposit.amount} USDT</p>
                                        <p className="text-xs text-gray-500">Amount</p>
                                    </div>
                                    <div>
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            deposit.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            deposit.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {deposit.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">
                                            {formatDate(deposit.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <p className="text-xs text-gray-600">TxHash: {deposit.transactionHash}</p>
                                </div>
                            </div>
                        ))}
                        {(!depositHistory || depositHistory.length === 0) && (
                            <p className="text-center text-gray-500 py-8">No deposit history available</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={() => handleDownloadHistory(depositHistory, 'deposit')}
                            disabled={!depositHistory || depositHistory.length === 0}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download Excel
                        </Button>
                        <DialogClose asChild>
                            <Button variant="secondary">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Task Submission Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject Task Submission</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Label htmlFor="reason">Rejection Reason</Label>
                        <Textarea 
                            id="reason" 
                            value={rejectionReason} 
                            onChange={(e) => setRejectionReason(e.target.value)} 
                            placeholder="Enter reason for rejection"
                            required 
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="button" onClick={confirmTaskRejection}>
                            Reject Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminDashboardPage;
