import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameData } from '@/hooks/useGameData';
import { getAllTasks, getUserTaskSubmissions } from '@/lib/firebaseService';
import * as Icons from 'lucide-react';

const TaskItem = ({ task, userSubmission, onRetry }) => {
    const { toast } = useToast();
    const { handleTaskAction } = useGameData();
    const [processing, setProcessing] = useState(false);
    const [hasVisited, setHasVisited] = useState(false);
    
    // Get user task status from submission
    const userTask = userSubmission 
        ? { 
            ...userSubmission, 
            rejectionReason: userSubmission.rejectionReason
          }
        : { status: 'new' };
    
    const IconComponent = Icons[task.icon] || Icons['Gift'];

    const getButtonInfo = () => {
        switch (userTask.status) {
            case 'new':
                if (task.type === 'auto') {
                    return hasVisited ? { text: 'Claim', disabled: false, color: 'bg-green-500 text-white' } : { text: 'Join', disabled: false, color: 'bg-brand-yellow text-black' };
                } else {
                    return hasVisited ? { text: 'Request', disabled: false, color: 'bg-blue-500 text-white' } : { text: 'Start', disabled: false, color: 'bg-brand-yellow text-black' };
                }
            case 'pending_claim':
                return { text: 'Claim', disabled: false, color: 'bg-green-500 text-white' };
            case 'pending_approval':
                return { text: 'Pending', disabled: true, color: 'bg-orange-400 text-white' };
            case 'completed':
                return { text: 'Done', disabled: true, color: 'bg-green-600 text-white' };
            case 'rejected':
                return { text: 'Retry', disabled: false, color: 'bg-red-500 text-white' };
            default:
                return { text: 'Start', disabled: false, color: 'bg-brand-yellow text-black' };
        }
    };

    const handleAction = async () => {
        if (processing) return;
        
        setProcessing(true);
        
        try {
            if (userTask.status === 'new') {
                if (task.type === 'auto') {
                    if (!hasVisited) {
                        const channelUrl = task.target.startsWith('@') ? `https://t.me/${task.target.replace('@', '')}` : task.target;
                        window.open(channelUrl, '_blank');
                        setHasVisited(true);
                        toast({ title: 'Channel Opened', description: 'Please join the channel and then click "Claim" to verify.' });
                    } else {
                        const result = await handleTaskAction(task);
                        if (result) {
                            toast({ title: 'Task Completed! 🎉', description: `You earned ${task.reward} USDT!` });
                            setHasVisited(false);
                        } else {
                            setHasVisited(false);
                            toast({ title: 'Verification Failed', description: 'Please make sure you joined the channel and try again.', variant: 'destructive' });
                        }
                    }
                } else {
                    if (!hasVisited) {
                        window.open(task.target, '_blank');
                        setHasVisited(true);
                        toast({ title: 'Task Started', description: 'Please complete the task and then click "Request" for verification.' });
                    } else {
                        // Move task to pending section
                        await handleTaskAction(task);
                        toast({ title: "Task Submitted! 📋", description: "Your submission is pending admin review." });
                        setHasVisited(false);
                    }
                }
            } else if (userTask.status === 'pending_claim') {
                const result = await handleTaskAction(task);
                if (result) {
                    toast({ title: "Reward Claimed! 💰", description: `You received ${task.reward} USDT!` });
                } else {
                    toast({ title: "Claim Failed", description: "Failed to claim reward. Please try again.", variant: 'destructive' });
                }
            } else if (userTask.status === 'rejected') {
                // Retry functionality
                onRetry(task);
            }
        } catch (error) {
            console.error('Error handling task action:', error);
            toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };
    
    const { text, disabled, color } = getButtonInfo();

    return (
        <Card className="bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 p-3 bg-brand-yellow/20 rounded-xl">
                        <IconComponent className="h-6 w-6 text-brand-yellow" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-lg text-gray-900 leading-tight">{task.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">{task.description}</p>
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
                                className={`font-semibold px-4 py-2 rounded-lg transition-all duration-300 ${color} ${!disabled && !processing ? 'hover:scale-105 shadow-md' : 'opacity-70'}`}
                            >
                                {processing ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                        <span className="text-xs">Loading...</span>
                                    </div>
                                ) : (
                                    <span className="text-sm">{text}</span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const TasksPage = () => {
    const { data: gameData } = useGameData();
    const [tasks, setTasks] = useState([]);
    const [userSubmissions, setUserSubmissions] = useState({});
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const userIdRef = useRef(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                setLoading(true);
                const tasksData = await getAllTasks();
                console.log('Fetched tasks:', tasksData);
                setTasks(tasksData || []);
            } catch (error) {
                console.error('Error fetching tasks:', error);
                toast({ title: "Error", description: "Failed to load tasks. Please try again.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [toast]);

    useEffect(() => {
        const fetchUserSubmissions = async () => {
            const currentUserId = gameData?.userId;
            if (!currentUser Id) return;

            if (userIdRef.current === currentUserId) return;

            try {
                console.log('Fetching user submissions for:', currentUser Id);
                const submissions = await getUserTaskSubmissions(currentUser Id.toString());
                console.log('User  submissions:', submissions);
                setUserSubmissions(submissions || {});
                userIdRef.current = currentUserId;
            } catch (error) {
                console.error('Error fetching user submissions:', error);
            }
        };

        fetchUserSubmissions();
    }, [gameData?.userId]);

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

    // Filter tasks based on submission status
    const availableTasks = tasks.filter(task => {
        const submission = userSubmissions[task.id];
        return !submission || submission.status === 'rejected';
    });

    const pendingTasks = tasks.filter(task => {
        const submission = userSubmissions[task.id];
        return submission && submission.status === 'pending_approval';
    });

    const completedTasks = tasks.filter(task => {
        const submission = userSubmissions[task.id];
        return submission && submission.status === 'approved';
    });

    console.log('Available tasks:', availableTasks.length);
    console.log('Pending tasks:', pendingTasks.length);
    console.log('Completed tasks:', completedTasks.length);

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
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                userSubmission={userSubmissions[task.id]} 
                                onRetry={handleRetry} 
                            />
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
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                userSubmission={userSubmissions[task.id]} 
                            />
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
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                userSubmission={userSubmissions[task.id]} 
                            />
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
