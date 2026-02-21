import React, { useState } from 'react';
import { Shield, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { adminLogin } from '../services/storageService';
import { useToast } from './Toast';

interface AdminLoginProps {
    onLoginSuccess: (token: string) => void;
    onClose: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onClose }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await adminLogin(username, password);
            if (response.success && response.token) {
                toast.success('Admin access granted');
                onLoginSuccess(response.token);
            }
        } catch (err: any) {
            toast.error(err.message || 'Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col pt-20 px-4 sm:px-6 items-center overflow-y-auto">
            <div
                className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl relative"
                style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 rounded-full" />
                            <div className="relative bg-zinc-800 border-2 border-zinc-700 p-4 rounded-2xl shadow-lg">
                                <ShieldAlert className="h-8 w-8 text-red-500" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">Super Admin</h1>
                        <p className="text-zinc-400">Restricted access area.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !username || !password}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Shield className="h-5 w-5" />
                                    Authenticate
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
