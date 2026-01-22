import React, { useState, useEffect, useRef } from 'react';
import { Container, FileMeta } from '../types';
import { updateContainerText, addFileToContainer, removeFileFromContainer } from '../services/storageService';
import { summarizeText, formatText } from '../services/geminiService';
import Button from './Button';
import { FileText, Upload, Trash2, Download, Copy, Wand2, RefreshCw } from 'lucide-react';

interface ContainerViewProps {
  container: Container;
  refreshContainer: () => void;
  onClose: () => void;
}

const ContainerView: React.FC<ContainerViewProps> = ({ container, refreshContainer, onClose }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'text'>('files');
  const [text, setText] = useState(container.textContent);
  const [isSavingText, setIsSavingText] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save text effect
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (text !== container.textContent) {
        setIsSavingText(true);
        await updateContainerText(container.id, text);
        setIsSavingText(false);
        refreshContainer(); // Sync state
      }
    }, 1000); // Debounce save 1s

    return () => clearTimeout(timeoutId);
  }, [text, container.id, container.textContent, refreshContainer]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      try {
        await addFileToContainer(container.id, e.target.files[0]);
        refreshContainer();
      } catch (error: any) {
        alert(error.message || "Upload failed");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      await removeFileFromContainer(container.id, fileId);
      refreshContainer();
    }
  };

  const handleDownload = (file: FileMeta) => {
    if (file.dataUrl) {
      const link = document.createElement('a');
      link.href = file.dataUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleAiAction = async (action: 'summarize' | 'professional' | 'casual') => {
    setAiLoading(true);
    try {
      if (action === 'summarize') {
        const result = await summarizeText(text);
        setAiSummary(result);
      } else {
        const result = await formatText(text, action);
        setText(result);
        await updateContainerText(container.id, result); // Force immediate save
        refreshContainer();
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden min-h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <span className="mr-2">📦</span> {container.name}
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              Container ID: {container.id.slice(0, 8)}...
            </p>
          </div>
          <Button variant="secondary" onClick={onClose} size="sm" className="text-sm">
            Close Container
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('files')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 'files'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Files ({container.files.length})
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 'text'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Shared Text
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 bg-gray-50">
          {activeTab === 'files' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Stored Files</h3>
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload File'}
                  </label>
                </div>
              </div>

              {container.files.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No files yet. Upload one to share.</p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {container.files.map((file) => (
                    <li key={file.id} className="col-span-1 bg-white rounded-lg shadow divide-y divide-gray-200">
                      <div className="w-full flex items-center justify-between p-6 space-x-6">
                        <div className="flex-1 truncate">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-gray-900 text-sm font-medium truncate" title={file.name}>{file.name}</h3>
                          </div>
                          <p className="mt-1 text-gray-500 text-xs truncate">{(file.size / 1024).toFixed(1)} KB</p>
                          <p className="text-gray-400 text-xs">{new Date(file.createdAt).toLocaleTimeString()}</p>
                        </div>
                        <div className="bg-indigo-100 p-2 rounded-full">
                           <FileText className="h-6 w-6 text-indigo-600" />
                        </div>
                      </div>
                      <div className="-mt-px flex divide-x divide-gray-200">
                        <div className="w-0 flex-1 flex">
                          <button
                            onClick={() => handleDownload(file)}
                            className="relative -mr-px w-0 flex-1 inline-flex items-center justify-center py-4 text-sm text-gray-700 font-medium border border-transparent rounded-bl-lg hover:text-gray-500"
                          >
                            <Download className="w-5 h-5 text-gray-400" aria-hidden="true" />
                            <span className="ml-3">Download</span>
                          </button>
                        </div>
                        <div className="-ml-px w-0 flex-1 flex">
                          <button
                            onClick={() => handleRemoveFile(file.id)}
                            className="relative w-0 flex-1 inline-flex items-center justify-center py-4 text-sm text-red-700 font-medium border border-transparent rounded-br-lg hover:text-red-500"
                          >
                            <Trash2 className="w-5 h-5 text-red-400" aria-hidden="true" />
                            <span className="ml-3">Delete</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="h-full flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                 <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900">Shared Clipboard</h3>
                    {isSavingText ? (
                        <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
                    ) : (
                        <span className="text-xs text-green-500">Synced</span>
                    )}
                 </div>
                 <Button variant="ghost" onClick={handleCopyText} title="Copy to local clipboard">
                   <Copy className="h-4 w-4 mr-2" />
                   Copy
                 </Button>
              </div>
              
              <div className="flex-1 relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full h-full p-4 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 resize-none font-mono text-sm"
                  placeholder="Type or paste text here to share between devices..."
                  style={{ minHeight: '300px' }}
                />
              </div>

              {/* AI Toolbar */}
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                 <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-indigo-900 flex items-center">
                        <Wand2 className="h-4 w-4 mr-2" />
                        AI Assistant
                    </h4>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleAiAction('summarize')}
                        isLoading={aiLoading}
                        disabled={!text}
                        className="text-xs"
                    >
                        Summarize
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleAiAction('professional')}
                        isLoading={aiLoading}
                        disabled={!text}
                        className="text-xs"
                    >
                        Make Professional
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleAiAction('casual')}
                        isLoading={aiLoading}
                        disabled={!text}
                        className="text-xs"
                    >
                        Make Casual
                    </Button>
                 </div>
                 {aiSummary && (
                    <div className="mt-4 p-3 bg-white rounded border border-indigo-100 text-sm text-gray-700">
                        <p className="font-semibold text-xs text-gray-500 uppercase mb-1">Summary</p>
                        {aiSummary}
                    </div>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContainerView;