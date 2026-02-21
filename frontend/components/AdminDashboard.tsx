import React, { useState, useEffect } from 'react';
import { ContainerSummary } from '../types';
import { getAdminContainers, deleteContainerAdmin } from '../services/storageService';
import { useToast } from './Toast';
import { Shield, Trash2, Search, Calendar, FileType, Eye, AlertTriangle, LogOut } from 'lucide-react';

interface AdminDashboardProps {
    token: string;
    onLogout: () => void;
    onSelectContainer: (id: string, name: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onLogout, onSelectContainer }) => {
    const [containers, setContainers] = useState<ContainerSummary[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const toast = useToast();

    useEffect(() => {
        loadContainers();
    }, [token]);

    const loadContainers = async () => {
        setIsLoading(true);
        try {
            const data = await getAdminContainers(token);
            setContainers(data);
        } catch (err) {
            toast.error('Failed to load containers');
            if ((err as Error).message.includes('Unauthorized')) {
                onLogout();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();

        if (!window.confirm(`Are you absolutely sure you want to delete container "${name}" and all of its files?`)) {
            return;
        }

        setIsDeleting(id);
        try {
            await deleteContainerAdmin(id, token);
            toast.success('Container deleted globally');
            setContainers(containers.filter(c => c.id !== id));
        } catch (err) {
            toast.error('Failed to delete container');
        } finally {
            setIsDeleting(null);
        }
    };

    const filteredContainers = containers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                        <Shield className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Super Admin</h1>
                        <p className="text-zinc-400 text-sm">Manage all system containers</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700"
                >
                    <LogOut className="h-4 w-4" />
                    Exit Admin
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-zinc-900 border-2 border-zinc-800 rounded-2xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/50 focus:bg-zinc-800/50 transition-all text-lg shadow-inner"
                    placeholder="Filter containers..."
                />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-medium text-zinc-400 px-4">
                    <span>All Containers ({filteredContainers.length})</span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                    </div>
                ) : filteredContainers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredContainers.map((container) => (
                            <div
                                key={container.id}
                                onClick={() => onSelectContainer(container.id, container.name)}
                                className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-red-500/50 hover:bg-zinc-800/80 transition-all cursor-pointer overflow-hidden shadow-lg hover:shadow-red-900/20"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors truncate pr-8">
                                        {container.name}
                                    </h3>

                                    <button
                                        onClick={(e) => handleDelete(e, container.id, container.name)}
                                        disabled={isDeleting === container.id}
                                        className="absolute top-4 right-4 p-2 bg-zinc-950/50 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Delete Container globally"
                                    >
                                        {isDeleting === container.id ? (
                                            <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-3 mt-4">
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950/50 px-2 py-1.5 rounded-md border border-zinc-800/50">
                                        <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                                        {new Date(container.createdAt).toLocaleDateString()}
                                    </div>
                                    {(container as any).fileCount !== undefined && (
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950/50 px-2 py-1.5 rounded-md border border-zinc-800/50">
                                            <FileType className="h-3.5 w-3.5 text-blue-400" />
                                            {(container as any).fileCount} files
                                        </div>
                                    )}
                                    {(container as any).viewCount !== undefined && (
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950/50 px-2 py-1.5 rounded-md border border-zinc-800/50">
                                            <Eye className="h-3.5 w-3.5 text-amber-400" />
                                            {(container as any).viewCount} views
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl border-dashed">
                        <AlertTriangle className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No containers found</h3>
                        <p className="text-zinc-500">The database is currently empty or no results match.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
