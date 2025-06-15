import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameData } from '@/hooks/useGameData';
import { getAllTasks, getUserTaskSubmissions } from '@/lib/firebaseService';
import * as Icons from 'lucide-react';

const TaskItem = ({ task, userSubmission }) => {
    const { toast } = useToast();
    const { handleTaskAction } = useGameData();
    const [processing, setProcessing] = useState(false);
    const [hasVisited, setHasVisited] = useState(false);
    
    // Map taskSubmissions status to the original UI status for compatibility
    const mapTaskStatus = (submissionStatus) => {
        switch (submissionStatus) {
            case 'pending_approval':
                return 'pending_approval';
            case 'approved':
                return 'completed';
            case 'rejected':
                return 'rejected';
            default:
                return 'new';
        }
    };

    // Get user task status from submission
    const userTask = userSubmission 
        ? { 
            ...userSubmission, 
            status: mapTaskStatus(userSubmission.status),
            rejectionReason: userSubmission.rejectionReason
          }
        : { status: 'new' };
    
    const IconComponent = Icons[task.icon] || Icons['Gift'];

    const getButtonInfo = () => {
        switch (userTask.status) {
            case 'new':
                if (task.type === 'auto') {
                    if (!hasVisited) {
                        return { text: 'Join', disabled: false, color: 'bg-brand-yellow text-black' };
                    } else {
                        return { text: 'Claim', disabled: false, color: 'bg-green-500 text-white' };
                    }
                } else {
                    if (!hasVisited) {
                        return { text: 'Start', disabled: false, color: 'bg-brand-yellow text-black' };
                    } else {
                        return { text: 'Request', disabled: false, color: 'bg-blue-500 text-white' };
                    }
                }
            case 'pending_claim':
                return { text: 'Claim', disabled: false, color: 'bg-green-500 text-white' };
            case 'pending_approval':
                return { text: 'Pending', disabled: true, color: 'bg-orange-400 text-white' };
            case 'completed':
                return { text: 'Done', disabled: true, color: 'bg-green-600 text-white', icon: <Icons.Check className="h-4 w-4"/> };
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
                    // Auto task (Telegram) flow
                    if (!hasVisited) {
                        // First click: Open channel and mark as visited
                        if (task.target && (task.target.includes('t.me') || task.target.startsWith('@'))) {
                            const channelUrl = task.target.startsWith('@') 
                                ? `https://t.me/${task.target.replace('@', '')}` 
                                : task.target;
                            
                            window.open(channelUrl, '_blank');
                            setHasVisited(true);
                            
                            toast({
                                title: 'Channel Opened',
                                description: 'Please join the channel and then click "Claim" to verify.',
                            });
                        }
                    } else {
                        // Second click: Use hook's handleTaskAction for verification
                        const result = await handleTaskAction(task);
                        
                        if (result) {
                            toast({
                                title: 'Task Completed! 🎉',
                                description: `You earned ${task.reward} USDT!`,
                            });
                            setHasVisited(false); // Reset for future use
                        } else {
                            // Reset to initial state if verification failed
                            setHasVisited(false);
                            toast({
                                title: 'Verification Failed',
                                description: 'Please make sure you joined the channel and try again.',
                                variant: 'destructive'
                            });
                        }
                    }
                } else {
                    // Manual task flow
                    if (!hasVisited) {
                        // First click: Open link and mark as visited
                        if (task.target && (task.target.startsWith('http') || task.target.startsWith('https'))) {
                            window.open(task.target, '_blank');
                        }
                        setHasVisited(true);
                        
                        toast({
                            title: 'Task Started',
                            description: 'Please complete the task and then click "Request" for verification.',
                        });
                    } else {
                        // Second click: Submit for admin approval
                        const result = await handleTaskAction(task);
                        
                        if (result) {
                            toast({
                                title: "Task Submitted! 📋",
                                description: "Your submission is pending admin review.",
                            });
                            setHasVisited(false); // Reset for future use
                        } else {
                            setHasVisited(false);
                            toast({
                                title: "Submission Failed",
                                description: "Failed to submit task. Please try again.",
                                variant: 'destructive'
                            });
                        }
                    }
                }
            } else if (userTask.status === 'pending_claim') {
                // Claim reward
                const result = await handleTaskAction(task);
                
                if (result) {
                    toast({
                        title: "Reward Claimed! 💰",
                        description: `You received ${task.reward} USDT!`,
                    });
                } else {
                    toast({
                        title: "Claim Failed",
                        description: "Failed to claim reward. Please try again.",
                        variant: 'destructive'
                    });
                }
            } else if (userTask.status === 'rejected') {
                // Reset and try again
                setHasVisited(false);
                toast({
                    title: "Try Again",
                    description: "You can now retry this task.",
                });
            }
        } catch (error) {
            console.error('Error handling task action:', error);
            
            if (userTask.status === 'new') {
                setHasVisited(false);
            }
            
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

                        {/* Instructions for next step */}
                        {userTask.status === 'new' && hasVisited && (
                            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs text-blue-700 flex items-center">
                                    <Icons.Info className="h-3 w-3 mr-1" />
                                    {task.type === 'auto' 
                                        ? 'Now click "Claim" to verify your membership'
                                        : 'Now click "Request" to submit for admin verification'
                                    }
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
    const { data: gameData, loading: gameLoading } = useGameData();
    const [tasks, setTasks] = useState([]);
    const [userSubmissions, setUserSubmissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [dataFetched, setDataFetched] = useState(false);
    const { toast } = useToast();
    const userIdRef = useRef(null);

    // Extract stable user ID
    const getUserId = (gameData) => {
        if (!gameData) return null;
        return gameData.userId || gameData.id || gameData.telegramId || null;
    };

    useEffect(() => {
        const fetchTasks = async () => {
            if (dataFetched) return; // Prevent multiple fetches
            
            try {
                console.log('Fetching tasks...');
                setLoading(true);
                const tasksData = await getAllTasks();
                console.log('Fetched tasks:', tasksData);
                setTasks(tasksData || []);
                setDataFetched(true);
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
    }, []); // Only run once

    useEffect(() => {
        const fetchUserSubmissions = async () => {
            const currentUserId = getUserId(gameData);
            
            if (!currentUserId) {
                console.log('No user ID available yet');
                return;
            }

            // Only fetch if user ID changed
            if (userIdRef.current === currentUserId) {
                console.log('User ID unchanged, skipping fetch');
                return;
            }

            try {
                console.log('Fetching user submissions for:', currentUserId);
                const submissions = await getUserTaskSubmissions(currentUserId.toString());
                console.log('User submissions:', submissions);
                setUserSubmissions(submissions || {});
                userIdRef.current = currentUserId;
            } catch (error) {
                console.error('Error fetching user submissions:', error);
            }
        };

        fetchUserSubmissions();
    }, [gameData?.userId, gameData?.id, gameData?.telegramId]); // Only depend on stable ID fields

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
