import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameData } from '@/hooks/useGameData';
import { getAllTasks } from '@/lib/firebaseService';
import * as Icons from 'lucide-react';

const TaskItem = ({ task }) => {
    const { toast } = useToast();
    const { data: gameData, handleTaskAction } = useGameData();
    const userTask = gameData?.userTasks?.[task.id] || { status: 'new' };
    
    const IconComponent = Icons[task.icon] || Icons['Gift'];

    const getButtonInfo = () => {
        switch (userTask.status) {
            case 'new':
                const isTelegram = task.target.startsWith('https://t.me/');
                return { text: isTelegram ? 'Join' : 'Go', disabled: false };
            case 'pending_claim':
                return { text: 'Claim', disabled: false };
            case 'pending_approval':
                return { text: 'Pending', disabled: true };
            case 'completed':
                return { text: 'Completed', disabled: true, icon: <Icons.Check className="h-5 w-5"/> };
            case 'rejected':
                return { text: 'Try Again', disabled: false, variant: 'outline' };
            default:
                return { text: 'Error', disabled: true };
        }
    };

    const handleAction = async () => {
        if (userTask.status === 'new') {
            if (task.type === 'auto') {
                // Check Telegram status
                const apiUrl = `https://api.telegram.org/botuser_bot_token/getChatMember?chat_id=@${task.target.replace('@', '')}&user_id=${gameData.id}`;
                const res = await fetch(apiUrl);
                const data = await res.json();

                if (data.ok) {
                    const status = data.result.status;
                    if (['member', 'administrator', 'creator'].includes(status)) {
                        const verified = await handleTaskAction(task);
                        if (verified) {
                            const userMention = gameData.username ? `@${gameData.username}` : `User  ${gameData.id}`;
                            await sendAdminNotification(`✅ <b>Auto-Verification Success</b>\n${userMention} successfully joined <b>${task.name}</b> (${task.target})\nReward: +${task.reward} USDT`);
                            toast({ 
                                title: 'Joined Verified', 
                                description: `+${task.reward} USDT`, 
                                variant: 'success', 
                                className: "bg-[#1a1a1a] text-white" 
                            });
                        }
                    } else {
                        toast({ 
                            title: 'Not Verified', 
                            description: 'Please join the channel first.', 
                            variant: 'destructive', 
                            className: "bg-[#1a1a1a] text-white" 
                        });
                    }
                } else {
                    toast({ 
                        title: 'Bot Error', 
                        description: 'Something went wrong, please try again later.', 
                        variant: 'destructive', 
                        className: "bg-[#1a1a1a] text-white" 
                    });
                }
            } else {
                // Manual task - submit for admin approval
                await handleTaskAction(task);
                toast({
                    title: "Task Submitted!",
                    description: "Pending admin approval.",
                });
            }
        } else {
            await handleTaskAction(task);
            if (userTask.status === 'pending_claim') {
                toast({
                    title: "Task Submitted!",
                    description: "Reward claimed!",
                });
            }
        }
    };
    
    const { text, disabled, icon, variant } = getButtonInfo();

    return (
        <Card className="bg-white rounded-2xl shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-brand-yellow/30 rounded-full">
                        <IconComponent className="h-6 w-6 text-brand-yellow" />
                    </div>
                    <div>
                        <p className="font-bold">{task.name}</p>
                        <p className="text-sm text-gray-500">{task.description}</p>
                        <p className="text-sm text-green-600 font-semibold">+{task.reward} USDT</p>
                    </div>
                </div>
                <Button 
                    onClick={handleAction} 
                    disabled={disabled} 
                    className="bg-brand-yellow text-black font-bold w-32" 
                    variant={variant}
                >
                    {icon || text}
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
        return userTaskStatus !== 'completed';
    });

    const completedTasks = tasks.filter(t => {
        const userTaskStatus = gameData.userTasks?.[t.id]?.status;
        return userTaskStatus === 'completed';
    });
    
    return (
        <div className="p-4 space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2 text-center">Tasks</h1>
                <p className="text-center text-gray-500 mb-4">Complete tasks to earn extra rewards!</p>
                {tasks.length > 0 && (
                    <p className="text-center text-sm text-gray-400">
                        {tasks.length} task{tasks.length !== 1 ? 's' : ''} available
                    </p>
                )}
            </div>

            <div>
                <h2 className="text-xl font-bold mb-2">Available Tasks</h2>
                <div className="space-y-3">
                    {pendingTasks.length > 0 ? (
                        pendingTasks.map(task => (
                            <TaskItem key={task.id} task={task} />
                        ))
                    ) : (
                        <Card className="bg-white rounded-2xl shadow-md">
                            <CardContent className="p-4 text-center text-gray-500">
                                No tasks available yet. Check back later!
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {completedTasks.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-2">Completed Tasks</h2>
                    <div className="space-y-3">
                        {completedTasks.map(task => (
                            <TaskItem key={task.id} task={task} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksPage;
            
