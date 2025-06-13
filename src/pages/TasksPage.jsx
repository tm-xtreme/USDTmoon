import React from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAdmin } from '@/hooks/useAdmin';
import { useGameData } from '@/hooks/useGameData';
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
                 return { text: 'Rejected', disabled: true, variant: 'destructive' };
            default:
                return { text: 'Error', disabled: true };
        }
    };

    const handleAction = () => {
        if (userTask.status === 'new') {
            window.open(task.target, '_blank');
        }
        
        handleTaskAction(task);

        if (userTask.status === 'pending_claim') {
             toast({
                title: "Task Submitted!",
                description: task.type === 'manual' ? "Pending admin approval." : "Reward claimed!",
            });
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
            <Button onClick={handleAction} disabled={disabled} className="bg-brand-yellow text-black font-bold w-32" variant={variant}>
                {icon || text}
            </Button>
        </CardContent>
    </Card>
)};

const TasksPage = () => {
    const { tasks } = useAdmin();
    const { data: gameData } = useGameData();

    if (!gameData) {
        return <div className="p-4 text-center">Loading tasks...</div>
    }

    const pendingTasks = tasks.filter(t => gameData.userTasks[t.id]?.status !== 'completed');
    const completedTasks = tasks.filter(t => gameData.userTasks[t.id]?.status === 'completed');
    
    return (
        <div className="p-4 space-y-6">
             <div>
                <h1 className="text-2xl font-bold mb-2 text-center">Tasks</h1>
                <p className="text-center text-gray-500 mb-4">Complete tasks to earn extra rewards!</p>
            </div>
            <div>
                <h2 className="text-xl font-bold mb-2">Available Tasks</h2>
                <div className="space-y-3">
                    {pendingTasks.length > 0 ? (
                        pendingTasks.map(task => <TaskItem key={task.id} task={task} />)
                    ) : (
                         <Card className="bg-white rounded-2xl shadow-md">
                            <CardContent className="p-4 text-center text-gray-500">
                                No new tasks available. Check back later!
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
             <div>
                <h2 className="text-xl font-bold mb-2">Completed Tasks</h2>
                 <div className="space-y-3">
                     {completedTasks.length > 0 ? (
                        completedTasks.map(task => <TaskItem key={task.id} task={task} />)
                     ) : (
                        <Card className="bg-white rounded-2xl shadow-md">
                            <CardContent className="p-4 text-center text-gray-500">
                                You haven't completed any tasks yet.
                            </CardContent>
                        </Card>
                     )}
                 </div>
            </div>
        </div>
    );
};

export default TasksPage;