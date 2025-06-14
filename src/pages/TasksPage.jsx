import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameData } from '@/hooks/useGameData';
import { getAllTasks } from '@/lib/firebaseService';
import { useTelegram } from '@/hooks/useTelegram';
import * as Icons from 'lucide-react';

const TaskItem = ({ task }) => {
    const { toast } = useToast();
    const { data: gameData, handleTaskAction } = useGameData();
    const { user } = useTelegram();
    const [processing, setProcessing] = useState(false);
    const userTask = gameData?.userTasks?.[task.id] || { status: 'new' };
    
    const IconComponent = Icons[task.icon] || Icons['Gift'];

    const getButtonInfo = () => {
        switch (userTask.status) {
            case 'new':
                const isTelegram = task.target.includes('t.me') || task.target.startsWith('@');
                return { text: isTelegram ? 'Join & Verify' : 'Complete Task', disabled: false };
            case 'pending_claim':
                return { text: 'Claim Reward', disabled: false };
            case 'pending_approval':
                return { text: 'Pending Review', disabled: true };
            case 'completed':
                return { text: 'Completed', disabled: true, icon: <Icons.Check className="h-5 w-5"/> };
            case 'rejected':
                return { text: 'Try Again', disabled: false, variant: 'outline' };
            default:
                return { text: 'Start Task', disabled: false };
        }
    };

    // Extract channel username from various formats
    const extractChannelUsername = (target) => {
        if (!target) return null;
        
        // Remove @ if present
        let username = target.replace('@', '');
        
        // Extract from t.me URLs
        if (target.includes('t.me/')) {
            const match = target.match(/t\.me\/([^/?]+)/);
            username = match ? match[1] : username;
        }
        
        // Remove any additional parameters
        username = username.split('?')[0].split('/')[0];
        
        return username;
    };

    const handleAction = async () => {
        if (processing) return;
        
        setProcessing(true);
        
        try {
            if (userTask.status === 'new') {
                if (task.type === 'auto') {
                    // First, open the channel/group for user to join
                    if (task.target.includes('t.me') || task.target.startsWith('@')) {
                        const channelUrl = task.target.startsWith('@') 
                            ? `https://t.me/${task.target.replace('@', '')}` 
                            : task.target;
                        
                        // Open the channel in a new window/tab
                        window.open(channelUrl, '_blank');
                        
                        // Wait a moment for user to join
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    // Now verify membership
                    const channelUsername = extractChannelUsername(task.target);
                    
                    if (!channelUsername) {
                        toast({
                            title: 'Invalid Channel',
                            description: 'Channel information is not valid.',
                            variant: 'destructive'
                        });
                        return;
                    }
                    
                    console.log('Checking membership for:', channelUsername, 'User ID:', user?.id);
                    
                    try {
                        const apiUrl = `https://api.telegram.org/bot8158970226:AAHcHhlZs5sL_eClx4UoGt9mx0edE2-N-Sw/getChatMember?chat_id=@${channelUsername}&user_id=${user?.id}`;
                        const response = await fetch(apiUrl);
                        const data = await response.json();
                        
                        console.log('Telegram API Response:', data);
                        
                        if (data.ok) {
                            const status = data.result.status;
                            console.log('User status in channel:', status);
                            
                            if (['member', 'administrator', 'creator'].includes(status)) {
                                // User is verified, complete task
                                await handleTaskAction(task);
                                
                                toast({
                                    title: 'Task Completed! 🎉',
                                    description: `You earned ${task.reward} USDT!`,
                                });
                            } else if (status === 'left' || status === 'kicked') {
                                toast({
                                    title: 'Not a Member',
                                    description: 'Please join the channel first, then try again.',
                                    variant: 'destructive'
                                });
                            } else {
                                toast({
                                    title: 'Verification Failed',
                                    description: `Status: ${status}. Please make sure you joined the channel.`,
                                    variant: 'destructive'
                                });
                            }
                        } else {
                            console.error('Telegram API Error:', data);
                            
                            if (data.error_code === 400) {
                                // Bad Request - usually means bot is not admin or channel doesn't exist
                                toast({
                                    title: 'Channel Error',
                                    description: 'Unable to verify membership. Please contact support.',
                                    variant: 'destructive'
                                });
                            } else if (data.error_code === 403) {
                                // Forbidden - bot doesn't have permission
                                toast({
                                    title: 'Verification Unavailable',
                                    description: 'Automatic verification is not available for this channel.',
                                    variant: 'destructive'
                                });
                            } else {
                                toast({
                                    title: 'Verification Error',
                                    description: data.description || 'Please try again later.',
                                    variant: 'destructive'
                                });
                            }
                        }
                    } catch (apiError) {
                        console.error('Error calling Telegram API:', apiError);
                        toast({
                            title: 'Network Error',
                            description: 'Unable to verify membership. Please check your connection and try again.',
                            variant: 'destructive'
                        });
                    }
                } else {
                    // Manual task - open link and submit for approval
                    if (task.target && (task.target.startsWith('http') || task.target.startsWith('https'))) {
                        window.open(task.target, '_blank');
                    }
                    
                    // Submit for admin approval
                    await handleTaskAction(task);
                    
                    toast({
                        title: "Task Submitted! 📋",
                        description: "Your submission is pending admin review.",
                    });
                }
            } else if (userTask.status === 'pending_claim') {
                // Claim reward
                await handleTaskAction(task);
                
                toast({
                    title: "Reward Claimed! 💰",
                    description: `You received ${task.reward} USDT!`,
                });
            } else if (userTask.status === 'rejected') {
                // Reset and try again
                await handleTaskAction(task);
                
                toast({
                    title: "Task Resubmitted",
                    description: "Your task has been resubmitted for review.",
                });
            }
        } catch (error) {
            console.error('Error handling task action:', error);
            toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive"
            });
        } finally {
            setProcessing(false);
        }
    };
    
    const { text, disabled, icon, variant } = getButtonInfo();

    return (
        <Card className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-brand-yellow/30 rounded-full">
                        <IconComponent className="h-6 w-6 text-brand-yellow" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-lg">{task.name}</p>
                        <p className="text-sm text-gray-500 mb-1">{task.description}</p>
                        <div className="flex items-center space-x-2">
                            <p className="text-sm text-green-600 font-semibold">+{task.reward} USDT</p>
                            {task.type === 'auto' && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    Auto-verify
                                </span>
                            )}
                            {task.type === 'manual' && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                    Manual review
                                </span>
                            )}
                        </div>
                        {userTask.status === 'pending_approval' && (
                            <p className="text-xs text-yellow-600 mt-1">⏳ Waiting for admin approval</p>
                        )}
                        {userTask.status === 'rejected' && userTask.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1">❌ {userTask.rejectionReason}</p>
                        )}
                    </div>
                </div>
                <Button 
                    onClick={handleAction} 
                    disabled={disabled || processing} 
                    className={`font-bold w-32 transition-all duration-300 ${
                        disabled || processing
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : variant === 'outline'
                            ? 'border-brand-yellow text-brand-yellow hover:bg-brand-yellow hover:text-black'
                            : 'bg-brand-yellow text-black hover:bg-yellow-400 hover:scale-105'
                    }`}
                    variant={variant}
                >
                    {processing ? (
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            <span className="text-xs">Processing...</span>
                        </div>
                    ) : (
                        icon || text
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};

const TasksPage = () => {
    const { data: gameData } = useGameData();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                setLoading(true);
                const tasksData = await getAllTasks();
                console.log('Fetched tasks:', tasksData);
                setTasks(tasksData || []);
            } catch (error) {
                console.error('Error fetching tasks:', error);
                toast({
                    title: "Error",
                    description: "Failed to load tasks. Please try again.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [toast]);

    if (loading) {
        return (
            <div className="p-4 space-y-6">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow mx-auto"></div>
                    <p className="mt-4 text-brand-text">Loading tasks...</p>
                </div>
            </div>
        );
    }

    if (!gameData) {
        return (
            <div className="p-4 space-y-6">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow mx-auto"></div>
                    <p className="mt-4 text-brand-text">Loading user data...</p>
                </div>
            </div>
        );
    }

    const pendingTasks = tasks.filter(t => {
        const userTaskStatus = gameData.userTasks?.[t.id]?.status;
        return !userTaskStatus || userTaskStatus !== 'completed';
    });

    const completedTasks = tasks.filter(t => {
        const userTaskStatus = gameData.userTasks?.[t.id]?.status;
        return userTaskStatus === 'completed';
    });

    const pendingApprovalTasks = tasks.filter(t => {
        const userTaskStatus = gameData.userTasks?.[t.id]?.status;
        return userTaskStatus === 'pending_approval';
    });
    
    return (
        <div className="p-4 space-y-6 bg-gradient-to-b from-purple-50 to-white min-h-screen">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2 text-brand-text">Tasks & Rewards</h1>
                <p className="text-gray-600 mb-4">Complete tasks to earn extra USDT!</p>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                    <div className="bg-white rounded-lg p-3 shadow-md">
                        <p className="text-2xl font-bold text-blue-600">{tasks.length}</p>
                        <p className="text-xs text-gray-500">Total Tasks</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-md">
                        <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
                        <p className="text-xs text-gray-500">Completed</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-md">
                        <p className="text-2xl font-bold text-orange-600">{pendingApprovalTasks.length}</p>
                        <p className="text-xs text-gray-500">Pending</p>
                    </div>
                </div>
            </div>

            {/* Available Tasks */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center">
                    <Icons.Target className="h-6 w-6 mr-2 text-blue-600" />
                    Available Tasks ({pendingTasks.length})
                </h2>
                <div className="space-y-3">
                    {pendingTasks.length > 0 ? (
                        pendingTasks.map(task => (
                            <TaskItem key={task.id} task={task} />
                        ))
                    ) : (
                        <Card className="bg-white rounded-2xl shadow-md">
                            <CardContent className="p-6 text-center text-gray-500">
                                <Icons.CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="font-semibold">All tasks completed!</p>
                                <p className="text-sm">Check back later for new tasks and rewards.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        <Icons.CheckCircle className="h-6 w-6 mr-2 text-green-600" />
                        Completed Tasks ({completedTasks.length})
                    </h2>
                    <div className="space-y-3">
                        {completedTasks.map(task => (
                            <TaskItem key={task.id} task={task} />
                        ))}
                    </div>
                </div>
            )}

            {/* Pending Approval Tasks */}
            {pendingApprovalTasks.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        <Icons.Clock className="h-6 w-6 mr-2 text-orange-600" />
                        Pending Review ({pendingApprovalTasks.length})
                    </h2>
                    <div className="space-y-3">
                        {pendingApprovalTasks.map(task => (
                            <TaskItem key={task.id} task={task} />
                        ))}
                    </div>
                    <Card className="bg-yellow-50 border-yellow-200 mt-4">
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                                <Icons.Info className="h-5 w-5 text-yellow-600" />
                                <span className="font-semibold text-yellow-800">Review Process</span>
                            </div>
                            <p className="text-sm text-yellow-700">
                                Your manual tasks are being reviewed by our admin team. 
                                This usually takes 1-24 hours. You'll be notified once approved or if any changes are needed.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Task Instructions */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-3 flex items-center">
                        <Icons.HelpCircle className="h-5 w-5 mr-2 text-blue-500" />
                        How Tasks Work
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-start space-x-2">
                            <Icons.Zap className="h-4 w-4 text-blue-500 mt-0.5" />
                            <span><strong>Auto-verify tasks:</strong> Join Telegram channels/groups and get instant rewards upon verification</span>
                        </div>
                        <div className="flex items-start space-x-2">
                            <Icons.Eye className="h-4 w-4 text-orange-500 mt-0.5" />
                            <span><strong>Manual tasks:</strong> Complete various activities and wait for admin approval</span>
                        </div>
                        <div className="flex items-start space-x-2">
                            <Icons.Gift className="h-4 w-4 text-green-500 mt-0.5" />
                            <span><strong>Rewards:</strong> Earn USDT that's added directly to your mining balance</span>
                        </div>
                        <div className="flex items-start space-x-2">
                            <Icons.RefreshCw className="h-4 w-4 text-purple-500 mt-0.5" />
                            <span><strong>Rejected tasks:</strong> Can be resubmitted after addressing the feedback</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* No Tasks Available */}
            {tasks.length === 0 && (
                <Card className="bg-white rounded-2xl shadow-md">
                    <CardContent className="p-8 text-center">
                        <Icons.Inbox className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-xl font-bold text-gray-600 mb-2">No Tasks Available</h3>
                        <p className="text-gray-500 mb-4">
                            There are currently no tasks available. New tasks are added regularly!
                        </p>
                        <Button 
                            onClick={() => window.location.reload()} 
                            className="bg-brand-yellow text-black font-bold"
                        >
                            <Icons.RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Tasks
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default TasksPage;
