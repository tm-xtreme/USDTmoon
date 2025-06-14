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
import { Badge } from '@/components/ui/badge';
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
    AlertCircle,
    Eye,
    ArrowUpCircle,
    ArrowDownCircle,
    Gift,
    CheckCircle,
    XCircle,
    ExternalLink
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
    const [actionType, setActionType] = useState(''); // 'task', 'withdrawal', 'deposit'

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
                    title: "Withdrawal Approved ✅", 
                    description: `${withdrawal.amount} USDT approved for ${withdrawal.username}` 
                });
            } else {
                await rejectWithdrawal(withdrawal.id, withdrawal.userId, withdrawal.amount);
                toast({ 
                    title: "Withdrawal Rejected ❌", 
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
                    title: "Deposit Approved ✅", 
                    description: `${deposit.amount} USDT credited to ${deposit.username}` 
                });
            } else {
                await rejectDeposit(deposit.id);
                toast({ 
                    title: "Deposit Rejected ❌", 
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
                title: "Task Approved ✅", 
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
        setActionType('task');
        setRejectionReason('');
        setIsRejectDialogOpen(true);
    };

    const handleWithdrawalReject = (withdrawal) => {
        setCurrentSubmission(withdrawal);
        setActionType('withdrawal');
        setRejectionReason('');
        setIsRejectDialogOpen(true);
    };

    const handleDepositReject = (deposit) => {
        setCurrentSubmission(deposit);
        setActionType('deposit');
        setRejectionReason('');
        setIsRejectDialogOpen(true);
    };

    const confirmRejection = async () => {
        try {
            if (actionType === 'task') {
                await rejectTaskSubmission(currentSubmission.id, rejectionReason);
                toast({ 
                    title: "Task Rejected ❌", 
                    description: `Task rejected for ${currentSubmission.username || currentSubmission.firstName}` 
                });
            } else if (actionType === 'withdrawal') {
                await rejectWithdrawal(currentSubmission.id, currentSubmission.userId, currentSubmission.amount, rejectionReason);
                toast({ 
                    title: "Withdrawal Rejected ❌", 
                    description: `${currentSubmission.amount} USDT refunded to ${currentSubmission.username}` 
                });
            } else if (actionType === 'deposit') {
                await rejectDeposit(currentSubmission.id, rejectionReason);
                toast({ 
                    title: "Deposit Rejected ❌", 
                    description: `Deposit rejected for ${currentSubmission.username}` 
                });
            }
            
            setIsRejectDialogOpen(false);
            setCurrentSubmission(null);
            setRejectionReason('');
            setActionType('');
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to reject submission.",
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

    if (loading) {
        return (
            <div className="p-6 bg-gradient-to-b from-yellow-50 to-orange-50 min-h-screen">
                <div className="text-center mt-20">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow mx-auto"></div>
                    <p className="mt-4 text-brand-text">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gradient-to-b from-yellow-50 to-orange-50 min-h-screen">
            {/* Header */}
            <Card className="mb-6 bg-white border border-gray-100 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-3xl font-bold text-brand-text">Admin Dashboard</CardTitle>
                        <CardDescription className="text-gray-600">Manage tasks, users, and transactions for MOONUSDT</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                        <Button 
                            variant="outline" 
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="border-brand-yellow text-brand-text hover:bg-brand-yellow hover:text-black"
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                        <Button onClick={onLogout} variant="destructive">
                            Logout
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <Card className="bg-white border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                        <Users className="h-5 w-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{adminStats.totalUsers || 0}</div>
                        <p className="text-xs text-gray-500 mt-1">Registered users</p>
                    </CardContent>
                </Card>
                
                <Card className="bg-white border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
                        <FileText className="h-5 w-5 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{adminStats.totalTasks || 0}</div>
                        <p className="text-xs text-gray-500 mt-1">Available tasks</p>
                    </CardContent>
                </Card>
                
                <Card className="bg-white border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Pending Withdrawals</CardTitle>
                        <ArrowUpCircle className="h-5 w-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{adminStats.pendingWithdrawals || 0}</div>
                        <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
                    </CardContent>
                </Card>
                
                <Card className="bg-white border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Pending Deposits</CardTitle>
                        <ArrowDownCircle className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{adminStats.pendingDeposits || 0}</div>
                        <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
                    </CardContent>
                </Card>
                
                <Card className="bg-white border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Pending Tasks</CardTitle>
                        <Clock className="h-5 w-5 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{adminStats.pendingTasks || 0}</div>
                        <p className="text-xs text-gray-500 mt-1">Manual reviews</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="tasks" className="space-y-4">
                <TabsList className="bg-white border border-gray-200 shadow-sm">
                    <TabsTrigger value="tasks" className="data-[state=active]:bg-brand-yellow data-[state=active]:text-black">
                        Task Management
                    </TabsTrigger>
                    <TabsTrigger value="pending-tasks" className="relative data-[state=active]:bg-brand-yellow data-[state=active]:text-black">
                        Pending Tasks
                        {pendingTaskSubmissions && pendingTaskSubmissions.length > 0 && (
                            <Badge className="ml-2 bg-orange-500 text-white text-xs">
                                {pendingTaskSubmissions.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="withdrawals" className="relative data-[state=active]:bg-brand-yellow data-[state=active]:text-black">
                        Withdrawals
                        {pendingWithdrawals && pendingWithdrawals.length > 0 && (
                            <Badge className="ml-2 bg-red-500 text-white text-xs">
                                {pendingWithdrawals.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="deposits" className="relative data-[state=active]:bg-brand-yellow data-[state=active]:text-black">
                        Deposits
                        {pendingDeposits && pendingDeposits.length > 0 && (
                            <Badge className="ml-2 bg-green-500 text-white text-xs">
                                {pendingDeposits.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-brand-yellow data-[state=active]:text-black">
                        History
                    </TabsTrigger>
                </TabsList>

                {/* Tasks Tab */}
                <TabsContent value="tasks">
                    <Card className="bg-white border border-gray-100 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
                            <div>
                                <CardTitle className="text-xl font-bold text-brand-text">Task Management</CardTitle>
                                <CardDescription>Create, edit, and manage tasks for users</CardDescription>
                            </div>
                            <Button 
                                onClick={() => handleOpenTaskDialog()}
                                className="bg-brand-yellow text-black font-bold hover:bg-yellow-400"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {tasks && tasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="font-bold text-lg text-brand-text">{task.name}</h3>
                                                <Badge variant={task.type === 'auto' ? 'default' : 'secondary'} className="text-xs">
                                                    {task.type === 'auto' ? 'Auto' : 'Manual'}
                                                </Badge>
                                                <Badge className="bg-green-100 text-green-800 text-xs">
                                                    {task.reward} USDT
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                <span>Target: {task.target}</span>
                                                <span>Icon: {task.icon}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleOpenTaskDialog(task)}
                                                className="hover:bg-blue-50"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleDeleteTask(task.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {(!tasks || tasks.length === 0) && (
                                    <div className="text-center py-12 text-gray-500">
                                        <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No tasks available</h3>
                                        <p className="text-sm">Create your first task to get started!</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Pending Tasks Tab */}
                <TabsContent value="pending-tasks">
                    <Card className="bg-white border border-gray-100 shadow-lg">
                        <CardHeader className="border-b border-gray-100">
                            <CardTitle className="flex items-center space-x-2">
                                <Clock className="h-6 w-6 text-orange-500" />
                                <span className="text-xl font-bold text-brand-text">Pending Task Submissions</span>
                            </CardTitle>
                            <CardDescription>Review and approve/reject manual task submissions from users</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {(!pendingTaskSubmissions || pendingTaskSubmissions.length === 0) ? (
                                <div className="text-center py-12 text-gray-500">
                                    <CheckCircle className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No pending task submissions</h3>
                                    <p className="text-sm">All tasks are up to date!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingTaskSubmissions.map(submission => (
                                        <div key={submission.id} className="p-4 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 space-y-3">
                                                    {/* User Info */}
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-blue-100 rounded-full">
                                                            <Users className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-lg">
                                                                {submission.username || `${submission.firstName} ${submission.lastName}`.trim() || 'Unknown User'}
                                                            </p>
                                                            <p className="text-sm text-gray-600">User ID: {submission.userId}</p>
                                                        </div>
                                                    </div>

                                                    {/* Task Info */}
                                                    <div className="bg-white p-3 rounded-lg border">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-semibold text-brand-text">{submission.taskName}</h4>
                                                            <Badge className="bg-green-100 text-green-800">
                                                                {submission.taskReward} USDT
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-2">{submission.taskDescription}</p>
                                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                            <span>Target: {submission.taskTarget}</span>
                                                            <span>Submitted: {formatDate(submission.submittedAt)}</span>
                                                        </div>
                                                        {submission.taskTarget && submission.taskTarget.startsWith('http') && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="mt-2"
                                                                onClick={() => window.open(submission.taskTarget, '_blank')}
                                                            >
                                                                <ExternalLink className="h-3 w-3 mr-1" />
                                                                View Target
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-col space-y-2 ml-4">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-500 text-white hover:bg-green-600"
                                                        onClick={() => handleTaskSubmissionApprove(submission)}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleTaskSubmissionReject(submission)}
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

                {/* Withdrawals Tab */}
                <TabsContent value="withdrawals">
                    <Card className="bg-white border border-gray-100 shadow-lg">
                        <CardHeader className="border-b border-gray-100">
                            <CardTitle className="flex items-center space-x-2">
                                <ArrowUpCircle className="h-6 w-6 text-red-500" />
                                <span className="text-xl font-bold text-brand-text">Pending Withdrawals</span>
                            </CardTitle>
                            <CardDescription>Review and process withdrawal requests from users</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {(!pendingWithdrawals || pendingWithdrawals.length === 0) ? (
                                <div className="text-center py-12 text-gray-500">
                                    <ArrowUpCircle className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No pending withdrawals</h3>
                                    <p className="text-sm">All withdrawal requests are processed!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingWithdrawals.map(withdrawal => (
                                        <div key={withdrawal.id} className="p-4 bg-red-50 rounded-lg border border-red-200 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 space-y-3">
                                                    {/* User Info */}
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-red-100 rounded-full">
                                                            <DollarSign className="h-5 w-5 text-red-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-lg">{withdrawal.username || 'Unknown User'}</p>
                                                            <p className="text-sm text-gray-600">User ID: {withdrawal.userId}</p>
                                                        </div>
                                                    </div>

                                                    {/* Withdrawal Details */}
                                                    <div className="bg-white p-3 rounded-lg border">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                            <div>
                                                                <span className="font-semibold text-gray-700">Amount:</span>
                                                                <span className="ml-2 font-bold text-red-600">{withdrawal.amount} USDT</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-gray-700">Network:</span>
                                                                <span className="ml-2">BEP20 (BSC)</span>
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <span className="font-semibold text-gray-700">Address:</span>
                                                                <div className="mt-1 p-2 bg-gray-100 rounded font-mono text-xs break-all">
                                                                    {withdrawal.address}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-gray-700">Requested:</span>
                                                                <span className="ml-2">{formatDate(withdrawal.createdAt)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-gray-700">Status:</span>
                                                                <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                                                                    {withdrawal.status || 'Pending'}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-col space-y-2 ml-4">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-500 text-white hover:bg-green-600"
                                                        onClick={() => handleWithdrawalAction(withdrawal, true)}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleWithdrawalReject(withdrawal)}
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

                {/* Deposits Tab */}
                <TabsContent value="deposits">
                    <Card className="bg-white border border-gray-100 shadow-lg">
                        <CardHeader className="border-b border-gray-100">
                            <CardTitle className="flex items-center space-x-2">
                                <ArrowDownCircle className="h-6 w-6 text-green-500" />
                                <span className="text-xl font-bold text-brand-text">Pending Deposits</span>
                            </CardTitle>
                            <CardDescription>Review and process deposit confirmations from users</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {(!pendingDeposits || pendingDeposits.length === 0) ? (
                                <div className="text-center py-12 text-gray-500">
                                    <ArrowDownCircle className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No pending deposits</h3>
                                    <p className="text-sm">All deposit requests are processed!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingDeposits.map(deposit => (
                                        <div key={deposit.id} className="p-4 bg-green-50 rounded-lg border border-green-200 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 space-y-3">
                                                    {/* User Info */}
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-green-100 rounded-full">
                                                            <DollarSign className="h-5 w-5 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-lg">{deposit.username || 'Unknown User'}</p>
                                                            <p className="text-sm text-gray-600">User ID: {deposit.userId}</p>
                                                        </div>
                                                    </div>

                                                    {/* Deposit Details */}
                                                    <div className="bg-white p-3 rounded-lg border">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                            <div>
                                                                <span className="font-semibold text-gray-700">Amount:</span>
                                                                <span className="ml-2 font-bold text-green-600">{deposit.amount} USDT</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-gray-700">Network:</span>
                                                                <span className="ml-2">BEP20 (BSC)</span>
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <span className="font-semibold text-gray-700">Transaction Hash:</span>
                                                                <div className="mt-1 p-2 bg-gray-100 rounded font-mono text-xs break-all">
                                                                    {deposit.transactionHash}
                                                                </div>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="mt-2"
                                                                    onClick={() => window.open(`https://bscscan.com/tx/${deposit.transactionHash}`, '_blank')}
                                                                >
                                                                    <ExternalLink className="h-3 w-3 mr-1" />
                                                                    View on BSCScan
                                                                </Button>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-gray-700">Submitted:</span>
                                                                <span className="ml-2">{formatDate(deposit.createdAt)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-gray-700">Status:</span>
                                                                <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                                                                    {deposit.status || 'Pending'}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-col space-y-2 ml-4">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-500 text-white hover:bg-green-600"
                                                        onClick={() => handleDepositAction(deposit, true)}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDepositReject(deposit)}
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

                {/* History Tab */}
                <TabsContent value="history">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Withdrawal History */}
                        <Card className="bg-white border border-gray-100 shadow-lg">
                            <CardHeader className="border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center space-x-2">
                                        <History className="h-5 w-5 text-red-500" />
                                        <span>Withdrawal History</span>
                                    </CardTitle>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadHistory(withdrawalHistory, 'withdrawals')}
                                        disabled={!withdrawalHistory || withdrawalHistory.length === 0}
                                    >
                                        <Download className="h-4 w-4 mr-1" />
                                        Export
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {withdrawalHistory && withdrawalHistory.length > 0 ? (
                                        withdrawalHistory.slice(0, 10).map(withdrawal => (
                                            <div key={withdrawal.id} className="p-3 bg-gray-50 rounded-lg border">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold text-sm">{withdrawal.username}</p>
                                                        <p className="text-xs text-gray-600">{withdrawal.amount} USDT</p>
                                                        <p className="text-xs text-gray-500">{formatDate(withdrawal.createdAt)}</p>
                                                    </div>
                                                    <Badge 
                                                        className={`text-xs ${
                                                            withdrawal.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                            withdrawal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}
                                                    >
                                                        {withdrawal.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <History className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                                            <p className="text-sm">No withdrawal history</p>
                                        </div>
                                    )}
                                </div>
                                {withdrawalHistory && withdrawalHistory.length > 10 && (
                                    <div className="mt-3 text-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsWithdrawalHistoryOpen(true)}
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            View All ({withdrawalHistory.length})
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Deposit History */}
                        <Card className="bg-white border border-gray-100 shadow-lg">
                            <CardHeader className="border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center space-x-2">
                                        <History className="h-5 w-5 text-green-500" />
                                        <span>Deposit History</span>
                                    </CardTitle>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadHistory(depositHistory, 'deposits')}
                                        disabled={!depositHistory || depositHistory.length === 0}
                                    >
                                        <Download className="h-4 w-4 mr-1" />
                                        Export
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {depositHistory && depositHistory.length > 0 ? (
                                        depositHistory.slice(0, 10).map(deposit => (
                                            <div key={deposit.id} className="p-3 bg-gray-50 rounded-lg border">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold text-sm">{deposit.username}</p>
                                                        <p className="text-xs text-gray-600">{deposit.amount} USDT</p>
                                                        <p className="text-xs text-gray-500">{formatDate(deposit.createdAt)}</p>
                                                    </div>
                                                    <Badge 
                                                        className={`text-xs ${
                                                            deposit.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                            deposit.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}
                                                    >
                                                        {deposit.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <History className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                                            <p className="text-sm">No deposit history</p>
                                        </div>
                                    )}
                                </div>
                                {depositHistory && depositHistory.length > 10 && (
                                    <div className="mt-3 text-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsDepositHistoryOpen(true)}
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            View All ({depositHistory.length})
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>


            {/* Task Dialog */}
            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogContent className="bg-white max-w-md">
                    <DialogHeader>
                        <DialogTitle>{currentTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveTask} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Task Name</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={currentTask?.name || ''}
                                placeholder="Enter task name"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                defaultValue={currentTask?.description || ''}
                                placeholder="Enter task description"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
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
                            <div>
                                <Label htmlFor="type">Type</Label>
                                <select
                                    id="type"
                                    name="type"
                                    defaultValue={currentTask?.type || 'manual'}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                                    required
                                >
                                    <option value="manual">Manual</option>
                                    <option value="auto">Auto</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="target">Target (URL/Channel)</Label>
                            <Input
                                id="target"
                                name="target"
                                defaultValue={currentTask?.target || ''}
                                placeholder="https://... or @channel"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="icon">Icon Name</Label>
                            <Input
                                id="icon"
                                name="icon"
                                defaultValue={currentTask?.icon || 'Gift'}
                                placeholder="Gift, Star, Heart, etc."
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Available icons: Gift, Star, Heart, Trophy, Target, Users, etc.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-brand-yellow text-black hover:bg-yellow-400">
                                {currentTask ? 'Update Task' : 'Create Task'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Rejection Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent className="bg-white max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Reject {actionType === 'task' ? 'Task' : actionType === 'withdrawal' ? 'Withdrawal' : 'Deposit'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {currentSubmission && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2">Details:</h4>
                                <div className="space-y-1 text-sm">
                                    {actionType === 'task' && (
                                        <>
                                            <p><span className="font-medium">Task:</span> {currentSubmission.taskName}</p>
                                            <p><span className="font-medium">User :</span> {currentSubmission.username || currentSubmission.firstName}</p>
                                            <p><span className="font-medium">Reward:</span> {currentSubmission.taskReward} USDT</p>
                                        </>
                                    )}
                                    {actionType === 'withdrawal' && (
                                        <>
                                            <p><span className="font-medium">Amount:</span> {currentSubmission.amount} USDT</p>
                                            <p><span className="font-medium">User :</span> {currentSubmission.username}</p>
                                            <p><span className="font-medium">Address:</span> {currentSubmission.address}</p>
                                        </>
                                    )}
                                    {actionType === 'deposit' && (
                                        <>
                                            <p><span className="font-medium">Amount:</span> {currentSubmission.amount} USDT</p>
                                            <p><span className="font-medium">User :</span> {currentSubmission.username}</p>
                                            <p><span className="font-medium">Hash:</span> {currentSubmission.transactionHash}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="rejection-reason">Rejection Reason</Label>
                            <Textarea
                                id="rejection-reason"
                                placeholder="Enter reason for rejection..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="mt-1"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmRejection}
                            disabled={!rejectionReason.trim()}
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Withdrawal History Dialog */}
            <Dialog open={isWithdrawalHistoryOpen} onOpenChange={setIsWithdrawalHistoryOpen}>
                <DialogContent className="bg-white max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle>Complete Withdrawal History</DialogTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadHistory(withdrawalHistory, 'withdrawals')}
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Export All
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="overflow-y-auto max-h-96">
                        <div className="space-y-3">
                            {withdrawalHistory && withdrawalHistory.map(withdrawal => (
                                <div key={withdrawal.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{withdrawal.username}</p>
                                            <p className="text-xs text-gray-600">{withdrawal.amount} USDT</p>
                                            <p className="text-xs text-gray-500">{formatDate(withdrawal.createdAt)}</p>
                                        </div>
                                        <Badge 
                                            className={`${
                                                withdrawal.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                withdrawal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}
                                        >
                                            {withdrawal.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deposit History Dialog */}
            <Dialog open={isDepositHistoryOpen} onOpenChange={setIsDepositHistoryOpen}>
                <DialogContent className="bg-white max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle>Complete Deposit History</DialogTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadHistory(depositHistory, 'deposits')}
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Export All
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="overflow-y-auto max-h-96">
                        <div className="space-y-3">
                            {depositHistory && depositHistory.map(deposit => (
                                <div key={deposit.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{deposit.username}</p>
                                            <p className="text-xs text-gray-600">{deposit.amount} USDT</p>
                                            <p className="text-xs text-gray-500">{formatDate(deposit.createdAt)}</p>
                                        </div>
                                        <Badge 
                                            className={`${
                                                deposit.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                deposit.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}
                                        >
                                            {deposit.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminDashboardPage;
                
