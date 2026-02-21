import React, { useState } from 'react';
import { useToast } from './Toast';
import { updateWebhookUrl } from '../services/storageService';
import { Settings, X, Save, Bell } from 'lucide-react';

interface SettingsModalProps {
    containerId: string;
    containerName: string;
    currentWebhookUrl: string;
    adminPassword?: string;
    onClose: () => void;
    onRefresh: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    containerId,
    containerName,
    currentWebhookUrl,
    adminPassword,
    onClose,
    onRefresh
}) => {
    const toast = useToast();
    const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateWebhookUrl(containerId, webhookUrl, adminPassword);
            toast.success('Settings saved successfully!');
            onRefresh();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'fadeInScale 0.2s ease-out' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Settings className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Container Settings</h3>
                            <p className="text-xs text-zinc-400">{containerName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSave}>
                    {/* Webhook URL */}
                    <div className="mb-6">
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                            <Bell className="h-4 w-4" /> Discord Webhook URL
                        </label>
                        <input
                            type="url"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://discord.com/api/webhooks/..."
                            className="w-full px-3 py-2.5 border border-zinc-700 rounded-lg bg-zinc-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <p className="text-xs text-zinc-500 mt-2">
                            Get pinged in your Discord server whenever someone uploads a new file to this container. Leave empty to disable.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-900 hover:from-amber-500 hover:to-yellow-600 disabled:opacity-50 transition-all"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </div>
    );
};

export default SettingsModal;
