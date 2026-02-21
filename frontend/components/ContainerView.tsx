import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Container, FileMeta, Message, Clipboard } from '../types';
import { updateContainerText, addFileToContainer, addFilesToContainer, addFileWithProgress, removeFileFromContainer, getFileDownloadUrl, getDownloadAllUrl, sendMessage, uploadChatImage, getUploadedImageUrl, createClipboard, updateClipboard, deleteClipboard } from '../services/storageService';
import Button from './Button';
import { useToast } from './Toast';
import ShareModal from './ShareModal';
import { FileText, Upload, Trash2, Download, Copy, Save, Check, RefreshCw, MessageCircle, Send, Image as ImageIcon, CloudUpload, File, FileVideo, FileAudio, FileArchive, FileCode, FileSpreadsheet, Presentation, FileType, Play, Eye, Share2, FolderDown, Search, Plus } from 'lucide-react';

// Socket.IO server URL (matches API_BASE without /api)
const SOCKET_URL = (import.meta as any).env.VITE_API_URL ? (import.meta as any).env.VITE_API_URL.replace('/api', '') : 'https://quickshare-1-9gjk.onrender.com';

interface ContainerViewProps {
  container: Container;
  refreshContainer: () => void;
  onClose: () => void;
}

const ContainerView: React.FC<ContainerViewProps> = ({ container, refreshContainer, onClose }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'files' | 'text' | 'chat'>('files');
  const [text, setText] = useState('');
  const [textSaved, setTextSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Clipboard states
  const [clipboards, setClipboards] = useState<Clipboard[]>([]);
  const [selectedClipboardId, setSelectedClipboardId] = useState<string | null>(null);
  const [clipboardSearchQuery, setClipboardSearchQuery] = useState('');
  const [newClipboardName, setNewClipboardName] = useState('');
  const [isCreatingClipboard, setIsCreatingClipboard] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileMeta | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [textCopied, setTextCopied] = useState(false);

  // Chat states
  const [messages, setMessages] = useState<Message[]>(container.messages || []);
  const [chatMessage, setChatMessage] = useState('');
  const [chatRole, setChatRole] = useState<'owner' | 'visitor'>('visitor');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [pastedImagePreview, setPastedImagePreview] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Sync text and messages when container changes
  useEffect(() => {
    let currentClipboards = container.clipboards || [];
    if (currentClipboards.length === 0 && container.textContent) {
      currentClipboards = [{
        id: 'legacy',
        name: 'Shared Clipboard',
        content: container.textContent,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }];
    }
    setClipboards(currentClipboards);
    setMessages(container.messages || []);

    // Auto-select first clipboard if none selected
    if (!selectedClipboardId && currentClipboards.length > 0) {
      setSelectedClipboardId(currentClipboards[0].id);
      setText(currentClipboards[0].content);
    } else if (selectedClipboardId) {
      // If the selected clipboard's content updated from another client, we might want to update local text,
      // but to avoid overwriting typed content randomly, we assume the user saves manually.
      // We will only update if somehow the container was completely refreshed.
      const cb = currentClipboards.find(c => c.id === selectedClipboardId);
      if (cb && !text) {
        setText(cb.content);
      }
    }
  }, [container.clipboards, container.textContent, container.messages]);

  const handleSelectClipboard = (id: string) => {
    setSelectedClipboardId(id);
    const cb = clipboards.find(c => c.id === id);
    if (cb) {
      setText(cb.content);
    } else {
      setText('');
    }
  };

  // Socket.IO connection for real-time chat
  useEffect(() => {
    // Connect to socket server
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    // Join the container room
    socketRef.current.emit('join-container', container.id);

    // Listen for new messages
    socketRef.current.on('new-message', (message: Message) => {
      setMessages((prev) => {
        // Avoid duplicate messages
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-container', container.id);
        socketRef.current.disconnect();
      }
    };
  }, [container.id]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);



  // Auto-save logic
  useEffect(() => {
    // We do not want to auto-save immediately on mount or on select.
    // Check if the current text actually differs from the selected clipboard.
    const cb = clipboards.find(c => c.id === selectedClipboardId);
    if (!selectedClipboardId || !cb || text === cb.content) {
      return;
    }

    setSaveStatus('saving');
    const autoSaveTimer = setTimeout(async () => {
      try {
        if (selectedClipboardId === 'legacy') {
          await updateContainerText(container.id, text);
        } else {
          // Update local clipboard array preemptively
          setClipboards(prev => prev.map(c =>
            c.id === selectedClipboardId ? { ...c, content: text } : c
          ));
          await updateClipboard(container.id, selectedClipboardId, { content: text });
        }
        setSaveStatus('saved');
        setTextSaved(true);
        setTimeout(() => {
          setTextSaved(false);
          setSaveStatus('idle');
        }, 2000);
      } catch (error) {
        setSaveStatus('error');
        console.error('Auto-save failed:', error);
      }
    }, 1000); // 1-second debounce

    return () => clearTimeout(autoSaveTimer);
  }, [text, selectedClipboardId, container.id]);

  const handleCreateClipboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClipboardName.trim()) return;

    setIsCreatingClipboard(true);
    try {
      const newCb = await createClipboard(container.id, newClipboardName);
      setNewClipboardName('');
      toast.success('Clipboard created');
      await refreshContainer();
      handleSelectClipboard(newCb.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create clipboard');
    } finally {
      setIsCreatingClipboard(false);
    }
  };

  const handleDeleteClipboard = async (clipboardId: string) => {
    if (clipboardId === 'legacy') {
      toast.error("Select save on the legacy clipboard to migrate it, or clear text and save.");
      return;
    }
    if (confirm('Are you sure you want to delete this clipboard?')) {
      try {
        await deleteClipboard(container.id, clipboardId);
        toast.success('Clipboard deleted');
        if (selectedClipboardId === clipboardId) {
          setSelectedClipboardId(null);
          setText('');
        }
        refreshContainer();
      } catch (error) {
        toast.error('Failed to delete clipboard');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      await uploadFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadPercent(0);
    const totalFiles = files.length;
    let completedFiles = 0;

    try {
      for (const file of files) {
        setUploadProgress(`Uploading ${file.name} (${completedFiles + 1}/${totalFiles})...`);

        // Use chunked upload for files > 5MB
        if (file.size > 5 * 1024 * 1024) {
          await addFileWithProgress(container.id, file, (percent) => {
            const overallPercent = ((completedFiles + percent / 100) / totalFiles) * 100;
            setUploadPercent(Math.round(overallPercent));
          });
        } else {
          await addFileToContainer(container.id, file);
          completedFiles++;
          setUploadPercent(Math.round((completedFiles / totalFiles) * 100));
        }
        completedFiles++;
      }
      refreshContainer();
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      setUploadPercent(0);
    }
  };

  // Get file icon based on type
  const getFileIcon = (file: FileMeta) => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    // Images
    if (type.startsWith('image/')) return null; // Will show thumbnail

    // Videos
    if (type.startsWith('video/') || ['.mp4', '.avi', '.mov', '.mkv', '.webm'].some(ext => name.endsWith(ext))) {
      return <FileVideo className="h-8 w-8 text-purple-400" />;
    }

    // Audio
    if (type.startsWith('audio/') || ['.mp3', '.wav', '.flac', '.aac', '.ogg'].some(ext => name.endsWith(ext))) {
      return <FileAudio className="h-8 w-8 text-pink-400" />;
    }

    // PDF
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return <FileType className="h-8 w-8 text-red-400" />;
    }

    // Word documents
    if (type.includes('word') || ['.doc', '.docx', '.odt'].some(ext => name.endsWith(ext))) {
      return <FileText className="h-8 w-8 text-blue-400" />;
    }

    // Excel/Spreadsheets
    if (type.includes('sheet') || type.includes('excel') || ['.xls', '.xlsx', '.csv'].some(ext => name.endsWith(ext))) {
      return <FileSpreadsheet className="h-8 w-8 text-green-400" />;
    }

    // PowerPoint
    if (type.includes('presentation') || ['.ppt', '.pptx'].some(ext => name.endsWith(ext))) {
      return <Presentation className="h-8 w-8 text-orange-400" />;
    }

    // Archives
    if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].some(ext => name.endsWith(ext))) {
      return <FileArchive className="h-8 w-8 text-yellow-400" />;
    }

    // Code files
    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.html', '.css', '.json', '.xml', '.yml', '.yaml', '.md'].some(ext => name.endsWith(ext))) {
      return <FileCode className="h-8 w-8 text-cyan-400" />;
    }

    // APK/Apps
    if (['.apk', '.exe', '.dmg', '.msi', '.deb', '.rpm'].some(ext => name.endsWith(ext))) {
      return <Play className="h-8 w-8 text-green-500" />;
    }

    // Default
    return <File className="h-8 w-8 text-zinc-400" />;
  };

  // Check if file can be previewed
  const canPreview = (file: FileMeta) => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    return type.startsWith('image/') ||
      type.startsWith('video/') ||
      type.startsWith('audio/') ||
      type === 'application/pdf' ||
      ['.mp4', '.webm', '.mp3', '.wav', '.pdf'].some(ext => name.endsWith(ext));
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeTab === 'files') {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (activeTab !== 'files') return;

    const droppedFiles: File[] = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await uploadFiles(droppedFiles);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        await removeFileFromContainer(container.id, fileId);
        toast.success('File deleted');
        refreshContainer();
      } catch {
        toast.error('Failed to delete file');
      }
    }
  };

  const handleDownload = (file: FileMeta) => {
    // Use the API download URL
    const downloadUrl = getFileDownloadUrl(container.id, file.id, true);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(text);
    setTextCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setTextCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    const url = getDownloadAllUrl(container.id);
    window.open(url, '_blank');
  };

  // Chat functions
  const handleSendMessage = async () => {
    if (!chatMessage.trim() && !pastedImage) return;

    setIsSendingMessage(true);
    try {
      let imageUrl = '';

      // Upload image if pasted
      if (pastedImage) {
        imageUrl = await uploadChatImage(container.id, pastedImage);
      }

      await sendMessage(container.id, chatRole, chatMessage, imageUrl);
      setChatMessage('');
      setPastedImage(null);
      setPastedImagePreview('');
      refreshContainer();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle paste for screenshots
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setPastedImage(file);
          const reader = new FileReader();
          reader.onload = (e) => {
            setPastedImagePreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPastedImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPastedImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPastedImage = () => {
    setPastedImage(null);
    setPastedImagePreview('');
  };

  // Check if file is an image
  const isImageFile = (file: FileMeta) => {
    return file.type.startsWith('image/');
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const filteredClipboards = clipboards.filter(cb =>
    cb.name.toLowerCase().includes(clipboardSearchQuery.toLowerCase())
  );
  const selectedClipboardInfo = clipboards.find(c => c.id === selectedClipboardId);

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="bg-zinc-900 rounded-lg shadow-xl shadow-black/30 border border-zinc-800 overflow-hidden min-h-[500px] sm:min-h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-zinc-900 flex items-center truncate">
              <span className="mr-2">📦</span> <span className="truncate">{container.name}</span>
            </h2>
            <p className="text-amber-900/70 text-xs sm:text-sm mt-1 truncate">
              ID: {container.id.slice(0, 8)}...
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-zinc-900/20 text-zinc-900 hover:bg-zinc-900/30 border border-zinc-900/20 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <Button variant="secondary" onClick={onClose} size="sm" className="text-xs sm:text-sm whitespace-nowrap">
              Close
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-700">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('files')}
              className={`w-1/3 py-2 sm:py-4 px-1 text-center border-b-2 font-medium text-xs sm:text-sm ${activeTab === 'files'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                }`}
            >
              Files ({container.files.length})
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`w-1/3 py-2 sm:py-4 px-1 text-center border-b-2 font-medium text-xs sm:text-sm ${activeTab === 'text'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                }`}
            >
              Text
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-1/3 py-2 sm:py-4 px-1 text-center border-b-2 font-medium text-xs sm:text-sm flex items-center justify-center gap-1 ${activeTab === 'chat'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                }`}
            >
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Chat</span> ({messages.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div
          className={`flex-1 p-3 sm:p-6 bg-zinc-950 transition-colors ${isDragging ? 'bg-amber-500/10' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="fixed inset-0 z-50 bg-zinc-950/90 flex items-center justify-center pointer-events-none">
              <div className="text-center p-8 border-4 border-dashed border-amber-500 rounded-2xl bg-zinc-900/50">
                <CloudUpload className="mx-auto h-16 w-16 text-amber-500 mb-4" />
                <p className="text-xl font-medium text-white">Drop files here to upload</p>
                <p className="text-sm text-zinc-400 mt-2">Release to upload your files</p>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-white">Stored Files</h3>
                  {uploadProgress && (
                    <div className="mt-2">
                      <p className="text-xs text-amber-400 mb-1">{uploadProgress}</p>
                      <div className="w-48 bg-zinc-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-yellow-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{uploadPercent}% complete</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {container.files.length > 1 && (
                    <button
                      onClick={handleDownloadAll}
                      className="inline-flex items-center px-3 sm:px-4 py-2 border border-zinc-700 text-sm font-medium rounded-md text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                      <FolderDown className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Download All</span>
                      <span className="sm:hidden">All</span>
                    </button>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      multiple
                    />
                    <label
                      htmlFor="file-upload"
                      className={`cursor-pointer inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-zinc-900 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 shadow-sm w-full sm:w-auto justify-center ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Upload Files'}
                    </label>
                  </div>
                </div>
              </div>

              {/* Drag and drop zone when no files */}
              {container.files.length === 0 ? (
                <div
                  className={`text-center py-8 sm:py-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/50'
                    }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CloudUpload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-zinc-600" />
                  <p className="mt-2 text-xs sm:text-sm text-zinc-500">
                    Drag & drop files here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Max 500MB per file • Any file type
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {container.files.map((file) => (
                    <li key={file.id} className="col-span-1 bg-zinc-800 rounded-lg shadow border border-zinc-700 hover:border-amber-500/50 transition-colors overflow-hidden group">
                      {/* Thumbnail/Icon Area */}
                      <div
                        className="relative aspect-square bg-zinc-900 flex items-center justify-center cursor-pointer"
                        onClick={() => canPreview(file) && setPreviewFile(file)}
                      >
                        {isImageFile(file) ? (
                          <img
                            src={getFileDownloadUrl(container.id, file.id)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4">
                            {getFileIcon(file)}
                            <span className="mt-2 text-xs text-zinc-500 uppercase font-medium">
                              {file.name.split('.').pop()}
                            </span>
                          </div>
                        )}
                        {/* Preview overlay for previewable files */}
                        {canPreview(file) && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="h-8 w-8 text-white" />
                          </div>
                        )}
                      </div>
                      {/* File info */}
                      <div className="p-3">
                        <h3 className="text-white text-xs font-medium truncate" title={file.name}>{file.name}</h3>
                        <p className="text-zinc-500 text-xs mt-1">{formatFileSize(file.size)}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex border-t border-zinc-700">
                        <button
                          onClick={() => handleDownload(file)}
                          className="flex-1 py-2 text-xs text-zinc-400 hover:text-amber-400 hover:bg-zinc-700/50 transition-colors flex items-center justify-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                        <button
                          onClick={() => handleRemoveFile(file.id)}
                          className="flex-1 py-2 text-xs text-zinc-400 hover:text-red-400 hover:bg-zinc-700/50 transition-colors flex items-center justify-center gap-1 border-l border-zinc-700"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Drag and drop hint */}
              <div className="mt-4 text-center text-xs text-zinc-600">
                💡 Tip: Drag & drop files anywhere to upload
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="h-full flex flex-col sm:flex-row gap-4">
              {/* Sidebar for Clipboards */}
              <div className="w-full sm:w-1/3 md:w-1/4 bg-zinc-900 border border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-inner h-[250px] sm:h-auto">
                <div className="p-3 border-b border-zinc-700 bg-zinc-800/50">
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search clipboards..."
                      value={clipboardSearchQuery}
                      onChange={(e) => setClipboardSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <form onSubmit={handleCreateClipboard} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New clipboard name"
                      value={newClipboardName}
                      onChange={(e) => setNewClipboardName(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isCreatingClipboard || !newClipboardName.trim()}
                      className="p-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-900 rounded-md hover:from-amber-500 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      title="Create Clipboard"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </form>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {filteredClipboards.length === 0 ? (
                    <div className="text-center p-4 text-zinc-500 text-sm">
                      {clipboardSearchQuery ? 'No clipboards found.' : 'No clipboards yet.'}
                    </div>
                  ) : (
                    filteredClipboards.map(clipboard => (
                      <div
                        key={clipboard.id}
                        onClick={() => handleSelectClipboard(clipboard.id)}
                        className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedClipboardId === clipboard.id
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'text-zinc-300 hover:bg-zinc-800 border border-transparent'
                          }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className={`h-4 w-4 flex-shrink-0 ${selectedClipboardId === clipboard.id ? 'text-amber-500' : 'text-zinc-500'}`} />
                          <span className="truncate text-sm font-medium">{clipboard.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClipboard(clipboard.id);
                          }}
                          className={`p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700/80 transition-colors ${selectedClipboardId === clipboard.id ? 'opacity-100' : 'opacity-0 xl:group-hover:opacity-100'
                            }`}
                          title="Delete clipboard"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col space-y-3 sm:space-y-4">
                {selectedClipboardId ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base sm:text-lg font-medium text-white flex items-center gap-2">
                          <span className="text-amber-500">📝</span>
                          {selectedClipboardInfo?.name || 'Clipboard'}
                        </h3>
                        {saveStatus === 'saving' && (
                          <span className="text-xs text-amber-400 font-medium flex items-center bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Saving...
                          </span>
                        )}
                        {saveStatus === 'saved' && (
                          <span className="text-xs text-emerald-400 font-medium flex items-center bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                            <Check className="h-3 w-3 mr-1" /> Saved
                          </span>
                        )}
                        {saveStatus === 'error' && (
                          <span className="text-xs text-red-400 font-medium flex items-center bg-red-400/10 px-2.5 py-1 rounded-full border border-red-400/20">
                            Error saving
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" onClick={handleCopyText} title="Copy to local clipboard" className="flex-1 sm:flex-none justify-center h-9 sm:h-10 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700">
                          {textCopied ? (
                            <Check className="h-4 w-4 mr-1 sm:mr-2 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1 sm:mr-2 text-zinc-300" />
                          )}
                          <span className={textCopied ? 'text-emerald-400' : 'text-zinc-300'}>{textCopied ? 'Copied!' : 'Copy'}</span>
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 relative">
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-full p-4 border border-zinc-700 rounded-lg bg-zinc-900/80 text-zinc-100 placeholder-zinc-500 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none font-mono text-sm shadow-inner"
                        placeholder="Type or paste text here to share..."
                        style={{ minHeight: '300px' }}
                      />
                      <div className="absolute bottom-3 right-3 flex justify-between text-xs text-zinc-400 bg-zinc-950/80 px-2 py-1 rounded backdrop-blur border border-zinc-800 shadow-sm pointer-events-none">
                        <span className="mr-3">{text.length} chars</span>
                        <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-700 rounded-lg bg-zinc-900/30">
                    <FileText className="h-16 w-16 text-zinc-600 mb-4" />
                    <h3 className="text-zinc-300 font-medium text-lg">No Clipboard Selected</h3>
                    <p className="text-zinc-500 text-sm mt-2 text-center max-w-sm">
                      Select a clipboard from the sidebar or create a new one to start saving text snippets.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-full flex flex-col" style={{ minHeight: '350px' }}>
              {/* Role selector */}
              <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-4">
                <span className="text-sm text-zinc-400">Chat as:</span>
                <div className="flex rounded-md overflow-hidden border border-zinc-700 w-full sm:w-auto">
                  <button
                    onClick={() => setChatRole('owner')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium ${chatRole === 'owner'
                      ? 'bg-amber-500 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                  >
                    Owner
                  </button>
                  <button
                    onClick={() => setChatRole('visitor')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium ${chatRole === 'visitor'
                      ? 'bg-amber-500 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                  >
                    Visitor
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg overflow-y-auto p-3 sm:p-4 space-y-3" style={{ maxHeight: '250px', minHeight: '150px' }}>
                {messages.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-zinc-500">
                    <MessageCircle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-zinc-600 mb-2" />
                    <p className="text-sm">No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'owner' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-3 sm:px-4 py-2 ${msg.sender === 'owner'
                          ? 'bg-zinc-700 text-zinc-200'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-900'
                          }`}
                      >
                        <div className="text-xs opacity-70 mb-1">
                          {msg.sender === 'owner' ? '👤 Owner' : '👋 Visitor'}
                        </div>
                        {msg.imageUrl && (
                          <img
                            src={getUploadedImageUrl(msg.imageUrl)}
                            alt="Shared image"
                            className="max-w-full rounded mb-2 cursor-pointer active:opacity-75"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = getUploadedImageUrl(msg.imageUrl);
                              link.download = `chat-image-${msg.id}.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            title="Click to download"
                          />
                        )}
                        {msg.text && <p className="text-sm break-words">{msg.text}</p>}
                        <div className="text-xs opacity-50 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Image preview */}
              {pastedImagePreview && (
                <div className="mt-2 relative inline-block">
                  <img
                    src={pastedImagePreview}
                    alt="To send"
                    className="max-h-20 sm:max-h-24 rounded border border-zinc-600"
                  />
                  <button
                    onClick={clearPastedImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 active:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Message input */}
              <div className="mt-3 sm:mt-4 flex space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={chatImageInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => chatImageInputRef.current?.click()}
                  className="px-3 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 active:bg-zinc-500 flex-shrink-0"
                  title="Attach image"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-zinc-700 rounded-lg bg-zinc-800 text-white placeholder-zinc-500 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSendingMessage || (!chatMessage.trim() && !pastedImage)}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center flex-shrink-0 ${isSendingMessage || (!chatMessage.trim() && !pastedImage)
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-900 hover:from-amber-500 hover:to-yellow-600 active:from-amber-600 active:to-yellow-700'
                    }`}
                >
                  {isSendingMessage ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-2 hidden sm:block">
                💡 Tip: Paste screenshots directly from clipboard (Ctrl+V)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute -top-12 right-0 text-white hover:text-amber-400 text-xl font-bold"
            >
              ✕ Close
            </button>

            {/* Preview content */}
            <div className="bg-zinc-900 rounded-lg overflow-hidden">
              {isImageFile(previewFile) && (
                <img
                  src={getFileDownloadUrl(container.id, previewFile.id)}
                  alt={previewFile.name}
                  className="max-w-full max-h-[80vh] mx-auto"
                />
              )}

              {previewFile.type.startsWith('video/') && (
                <video
                  src={getFileDownloadUrl(container.id, previewFile.id)}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh] mx-auto"
                />
              )}

              {previewFile.type.startsWith('audio/') && (
                <div className="p-8 flex flex-col items-center">
                  <FileAudio className="h-24 w-24 text-pink-400 mb-4" />
                  <p className="text-white mb-4">{previewFile.name}</p>
                  <audio
                    src={getFileDownloadUrl(container.id, previewFile.id)}
                    controls
                    autoPlay
                    className="w-full max-w-md"
                  />
                </div>
              )}

              {previewFile.type === 'application/pdf' && (
                <iframe
                  src={getFileDownloadUrl(container.id, previewFile.id)}
                  className="w-full h-[80vh]"
                  title={previewFile.name}
                />
              )}
            </div>

            {/* File info */}
            <div className="mt-4 text-center">
              <p className="text-white font-medium">{previewFile.name}</p>
              <p className="text-zinc-400 text-sm">{formatFileSize(previewFile.size)}</p>
              <button
                onClick={() => handleDownload(previewFile)}
                className="mt-3 px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-900 rounded-lg hover:from-amber-500 hover:to-yellow-600 inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          containerId={container.id}
          containerName={container.name}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default ContainerView;