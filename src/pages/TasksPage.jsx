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
                const isTelegram = task.target && task.target.startsWith('https://t.me/');
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
                return { text: 'Start', disabled: false };
        }
    };

    const handleAction = async () => {
        if (userTask.status === 'new' && task.target) {
            // Open the target URL first
            window.open(task.target, '_blank');
        }
        
        // Handle the task action
        await handleTaskAction(task);
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
                        {task.type && (
                            <p className="text-xs text-blue-500 capitalize">{task.type} verification</p>
                        )}
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
                console.log('Fetched tasks:', tasksData); // Debug log
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
                                {tasks.length === 0 ? (
                                    <>
                                        <Icons.FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                        <p>No tasks available yet.</p>
                                        <p className="text-sm">Check back later for new tasks!</p>
                                    </>
                                ) : (
                                    <>
                                        <Icons.CheckCircle className="mx-auto h-12 w-12 text-green-300 mb-4" />
                                        <p>All tasks completed!</p>
                                        <p className="text-sm">Great job! Check back later for new tasks.</p>
                                    </>
                                )}
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

            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                    <h3 className="font-bold mb-2">Debug Info:</h3>
                    <p>Total tasks: {tasks.length}</p>
                    <p>Pending tasks: {pendingTasks.length}</p>
                    <p>Completed tasks: {completedTasks.length}</p>
                    <p>User tasks: {Object.keys(gameData?.userTasks || {}).length}</p>
                </div>
            )}
        </div>
    );
};

export default TasksPage;
            
