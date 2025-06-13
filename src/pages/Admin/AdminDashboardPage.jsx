
import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2, Check, X } from 'lucide-react';

const AdminDashboardPage = ({ onLogout }) => {
    const { tasks, addTask, updateTask, removeTask, getPendingTasks } = useAdmin();
    const { toast } = useToast();
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    
    const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
    const [pendingDeposits, setPendingDeposits] = useState([]);

    useEffect(() => {
        // Mock fetching from localStorage, in real app this would be API call
        const withdrawals = JSON.parse(localStorage.getItem('admin-pending-withdrawals') || '[]');
        const deposits = JSON.parse(localStorage.getItem('admin-pending-deposits') || '[]');
        setPendingWithdrawals(withdrawals.filter(w => w.status === 'pending'));
        setPendingDeposits(deposits.filter(d => d.status === 'pending'));
    }, []);

    const handleOpenTaskDialog = (task = null) => {
        setCurrentTask(task);
        setIsTaskDialogOpen(true);
    };

    const handleSaveTask = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const taskData = {
            name: formData.get('name'),
            description: formData.get('description'),
            reward: formData.get('reward'),
            type: formData.get('type'),
            icon: formData.get('icon'),
            target: formData.get('target'),
        };

        if (currentTask) {
            updateTask({ ...currentTask, ...taskData });
            toast({ title: "Task Updated Successfully!" });
        } else {
            addTask(taskData);
            toast({ title: "Task Added Successfully!" });
        }
        setIsTaskDialogOpen(false);
        setCurrentTask(null);
    };

    const handleTransactionApproval = (type, id, approve) => {
        // Mock approval/rejection
        toast({ title: `Mock ${type} ${approve ? 'Approved' : 'Rejected'}`, description: `ID: ${id}. Backend needed for real action.`});
        if (type === 'Withdrawal') {
            const updated = pendingWithdrawals.filter(w => w.id !== id);
            setPendingWithdrawals(updated);
            localStorage.setItem('admin-pending-withdrawals', JSON.stringify(updated)); // Update mock storage
        } else if (type === 'Deposit') {
            const updated = pendingDeposits.filter(d => d.id !== id);
            setPendingDeposits(updated);
            localStorage.setItem('admin-pending-deposits', JSON.stringify(updated)); // Update mock storage
        }
    };


    return (
        <div className="p-4 bg-gray-100 min-h-screen">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle>Admin Dashboard</CardTitle><CardDescription>Manage tasks, users, and transactions.</CardDescription></div>
                    <Button onClick={onLogout}>Logout</Button>
                </CardHeader>
            </Card>

            <Card className="mt-6">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Task Management</CardTitle>
                    <Button onClick={() => handleOpenTaskDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Add Task</Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {tasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                                <div><p className="font-semibold">{task.name} <span className="text-xs font-normal text-gray-500">({task.type})</span></p><p className="text-sm text-green-600">{task.reward} USDT</p></div>
                                <div className="flex items-center space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenTaskDialog(task)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="destructive" size="icon" onClick={() => removeTask(task.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{currentTask ? 'Edit Task' : 'Add New Task'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSaveTask} className="space-y-4">
                        <div><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={currentTask?.name || ''} required /></div>
                        <div><Label htmlFor="description">Description</Label><Input id="description" name="description" defaultValue={currentTask?.description || ''} required /></div>
                        <div><Label htmlFor="reward">Reward (USDT)</Label><Input id="reward" name="reward" type="number" step="any" defaultValue={currentTask?.reward || ''} required /></div>
                        <div><Label htmlFor="target">Target (URL or keyword)</Label><Input id="target" name="target" defaultValue={currentTask?.target || ''} required /></div>
                        <div>
                            <Label htmlFor="type">Type</Label>
                            <select id="type" name="type" defaultValue={currentTask?.type || 'manual'} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                <option value="manual">Manual</option><option value="auto">Auto</option>
                            </select>
                        </div>
                        <div><Label htmlFor="icon">Icon (Lucide Name)</Label><Input id="icon" name="icon" defaultValue={currentTask?.icon || 'Gift'} placeholder="e.g., Gift, Send, Users" required /></div>
                        <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose><Button type="submit">Save Task</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Card className="mt-6">
                <CardHeader><CardTitle>Pending Withdrawals</CardTitle></CardHeader>
                <CardContent>
                    {pendingWithdrawals.length === 0 ? <p className="text-gray-500">No pending withdrawals.</p> : 
                        pendingWithdrawals.map(w => (
                            <div key={w.id} className="p-3 bg-white rounded-lg shadow-sm mb-2 flex justify-between items-center">
                                <div>
                                    <p>User: {w.username} ({w.userId})</p>
                                    <p>Amount: {w.amount} USDT</p>
                                    <p className="text-xs">Address: {w.address}</p>
                                </div>
                                <div className="space-x-2">
                                    <Button size="icon" variant="outline" className="text-green-500 border-green-500 hover:bg-green-50" onClick={() => handleTransactionApproval('Withdrawal', w.id, true)}><Check className="h-4 w-4"/></Button>
                                    <Button size="icon" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50" onClick={() => handleTransactionApproval('Withdrawal', w.id, false)}><X className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        ))
                    }
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader><CardTitle>Pending Deposits</CardTitle></CardHeader>
                <CardContent>
                    {pendingDeposits.length === 0 ? <p className="text-gray-500">No pending deposits.</p> : 
                        pendingDeposits.map(d => (
                            <div key={d.id} className="p-3 bg-white rounded-lg shadow-sm mb-2 flex justify-between items-center">
                                <div>
                                    <p>User: {d.username} ({d.userId})</p>
                                    <p>Amount: {d.amount} USDT</p>
                                    <p className="text-xs">TxHash: {d.transactionHash}</p>
                                </div>
                                <div className="space-x-2">
                                    <Button size="icon" variant="outline" className="text-green-500 border-green-500 hover:bg-green-50" onClick={() => handleTransactionApproval('Deposit', d.id, true)}><Check className="h-4 w-4"/></Button>
                                    <Button size="icon" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50" onClick={() => handleTransactionApproval('Deposit', d.id, false)}><X className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        ))
                    }
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminDashboardPage;
