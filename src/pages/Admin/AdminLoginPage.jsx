import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

const AdminLoginPage = ({ onLogin, error, onResetPassword, adminEmail }) => {
    const [email, setEmail] = useState(adminEmail || 'admin@moonusdt.com');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await onLogin(email, password);
            if (!result.success) {
                // Error is handled by parent component
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email.trim()) {
            toast({
                title: "Error",
                description: "Please enter your email address first.",
                variant: "destructive"
            });
            return;
        }

        setResetLoading(true);
        try {
            const result = await onResetPassword(email);
            if (result.success) {
                toast({
                    title: "Success",
                    description: result.message,
                });
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive"
                });
            }
        } finally {
            setResetLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
                        <CardDescription>
                            Enter your credentials to access the admin dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input 
                                    id="email" 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@moonusdt.com"
                                    className="pl-10"
                                    required 
                                    disabled={loading || resetLoading}
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="pl-10 pr-10"
                                    required 
                                    disabled={loading || resetLoading}
                                />
                                <button
                                    type="button"
                                    onClick={togglePasswordVisibility}
                                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                                    disabled={loading || resetLoading}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-3">
                        <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={loading || resetLoading}
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </Button>
                        
                        <div className="w-full text-center">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                className="text-sm text-gray-600 hover:text-gray-800" 
                                onClick={handleResetPassword}
                                disabled={loading || resetLoading}
                            >
                                {resetLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                                        Sending reset email...
                                    </>
                                ) : (
                                    'Forgot your password?'
                                )}
                            </Button>
                        </div>
                    </CardFooter>
                </form>
                
                <div className="px-6 pb-6">
                    <div className="text-center text-xs text-gray-500 border-t pt-4">
                        <p>🔒 Secure admin access only</p>
                        <p className="mt-1">Session will be remembered for 24 hours</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AdminLoginPage;
