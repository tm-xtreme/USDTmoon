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
                return { text: isTelegram ? 'Join' : 'Start', disabled: false, color: 'bg-brand-yellow text-black' };
            case 'pending_claim':
                return { text: 'Claim', disabled: false, color: 'bg-green-500 text-white' };
            case 'pending_approval':
                return { text: 'Pending', disabled: true, color: 'bg-orange-400 text-white' };
            case 'completed':
                return { text: 'Completed', disabled: true, color: 'bg-green-600 text-white', icon: <Icons.Check className="h-4 w-4"/> };
            case 'rejected':
                return { text: 'Retry', disabled: false, color: 'bg-red-500 text-white' };
            default:
                return { text: 'Start', disabled: false, color: 'bg-brand-yellow text-black' };
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
                                toast({
                                    title: 'Channel Error',
                                    description: 'Unable to verify membership. Please contact support.',
                                    variant: 'destructive'
                                });
                            } else if (data.error_code === 403) {
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
    
    const { text, disabled, icon, color } = getButtonInfo();

    return (
        <Card className="bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 p-3 bg-brand-yellow/20 rounded-xl">
                        <IconComponent className="h-6 w-6 text-brand-yellow" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-lg text-gray-900 leading-tight">{task.name}</h3>
                            <div className="flex items-center space-x-1 ml-2">
                                {task.type === 'auto' && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                        Auto
                                    </span>
                                )}
                                {task.type === 'manual' && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                                        Manual
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">{task.description}</p>
                        
                        {/* Reward and Status */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                    <Icons.Coins className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-bold text-green-600">+{task.reward} USDT</span>
                                </div>
                            </div>
                            
                            <Button 
                                onClick={handleAction} 
                                disabled={disabled || processing} 
                                size="sm"
                                className={`font-semibold px-4 py-2 rounded-lg transition-all duration-300 ${color} ${
                                    !disabled && !processing ? 'hover:scale-105 shadow-md' : 'opacity-70'
                                }`}
                            >
                                {processing ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                        <span className="text-xs">Loading...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-1">
                                        {icon}
                                        <span className="text-sm">{text}</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                        
                        {/* Status Messages */}
                        {userTask.status === 'pending_approval' && (
                            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                                <p className="text-xs text-orange-700 flex items-center">
                                    <Icons.Clock className="h-3 w-3 mr-1" />
                                    Waiting for admin approval
                                </p>
                            </div>
                        )}
                        
                        {userTask.status === 'rejected' && userTask.rejectionReason && (
                            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs text-red-700 flex items-center">
                                    <Icons.AlertCircle className="h-3 w-3 mr-1" />
                                    Rejected: {userTask.rejectionReason}
                                </p>
                            </div>
                        )}
                        
                        {userTask.status === 'completed' && (
                            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700 flex items-center">
                                    <Icons.CheckCircle className="h-3 w-3 mr-1" />
                                    Task completed successfully
                                </p>
                            </div>
                        )}
                    </div>
                </div>
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
            <div className="p-4 space-y-6 bg-gradient-to-b from-yellow-50 to-orange-50 min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow mx-auto"></div>
                    <p className="mt-4 text-brand-text">Loading tasks...</p>
                </div>
            </div>
        );
    }

    if (!gameData) {
        return (
            <div className="p-4 space-y-6 bg-gradient-to-b from-yellow-50 to-orange-50 min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-yellow mx-auto"></div>
                    <p className="mt-4 text-brand-text">Loading user data...</p>
                </div>
            </div>
        );
    }

    // Filter tasks by status
    const availableTasks = tasks.filter(t => {
        const userTaskStatus = gameData.userTasks?.[t.id]?.status;
        return !userTaskStatus || userTaskStatus === 'new' || userTaskStatus === 'rejected';
    });

    const pendingTasks = tasks.filter(t => {
        const userTaskStatus = gameData.userTasks?.[t.id]?.status;
        return userTaskStatus === 'pending_approval' || userTaskStatus === 'pending_claim';
    });

    const completedTasks = tasks.filter(t => {
        const userTaskStatus = gameData.userTasks?.[t.id]?.status;
        return userTaskStatus === 'completed';
    });
    
    return (
        <div className="p-4 space-y-6 bg-gradient-to-b from-yellow-50 to-orange-50 min-h-screen">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2 text-brand-text">Tasks & Rewards</h1>
                <p className="text-gray-600 mb-4">Complete tasks to earn extra USDT!</p>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <p className="text-xl font-bold text-blue-600">{availableTasks.length}</p>
                        <p className="text-xs text-gray-500">Available</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <p className="text-xl font-bold text-orange-600">{pendingTasks.length}</p>
                        <p className="text-xs text-gray-500">Pending</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <p className="text-xl font-bold text-green-600">{completedTasks.length}</p>
                        <p className="text-xs text-gray-500">Completed</p>
                    </div>
                </div>
            </div>

            {/* Available Tasks */}
            {availableTasks.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center text-brand-text">
                        <Icons.Target className="h-6 w-6 mr-2 text-blue-600" />
                        Available Tasks ({availableTasks.length})
                    </h2>
                    <div className="space-y-3">
                        {availableTasks.map(task => (
                            <TaskItem key={task.id} task={task} />
                        ))}
                    </div>
                </div>
            )}

            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center text-brand-text">
                        <Icons.Clock className="h-6 w-6 mr-2 text-orange-600" />
                        Pending Tasks ({pendingTasks.length})
                    </h2>
                    <div className="space-y-3">
                        {pendingTasks.map(task => (
                            <TaskItem key={task.id} task={task} />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center text-brand-text">
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

            {/* No Tasks Available */}
            {tasks.length === 0 && (
                <Card className="bg-white rounded-2xl shadow-md border border-gray-100">
                    <CardContent className="p-8 text-center">
                        <Icons.Inbox className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-xl font-bold text-gray-600 mb-2">No Tasks Available</h3>
                        <p className="text-gray-500 mb-4">
                            There are currently no tasks available. New tasks are added regularly!
                        </p>
                        <Button 
                            onClick={() => window.location.reload()} 
                            className="bg-brand-yellow text-black font-bold hover:bg-yellow-400"
                        >
                            <Icons.RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Tasks
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* All Tasks Completed */}
            {tasks.length > 0 && availableTasks.length === 0 && pendingTasks.length === 0 && (
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="p-6 text-center">
                        <Icons.Trophy className="h-12 w-12 mx-auto mb-3 text-green-600" />
                        <h3 className="text-lg font-bold text-green-800 mb-2">All Tasks Completed! 🎉</h3>
                        <p className="text-green-700 text-sm">
                            Great job! You've completed all available tasks. Check back later for new opportunities to earn more USDT.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default TasksPage;
            
