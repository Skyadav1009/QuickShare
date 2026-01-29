import React, { useState, useEffect, useRef } from 'react';
import { Container, FileMeta, Message } from '../types';
import { updateContainerText, addFileToContainer, addFilesToContainer, addFileWithProgress, removeFileFromContainer, getFileDownloadUrl, sendMessage, uploadChatImage, getUploadedImageUrl } from '../services/storageService';
import Button from './Button';
import { FileText, Upload, Trash2, Download, Copy, Save, Check, RefreshCw, MessageCircle, Send, Image as ImageIcon, CloudUpload, File, FileVideo, FileAudio, FileArchive, FileCode, FileSpreadsheet, Presentation, FileType, Play, Eye } from 'lucide-react';

interface ContainerViewProps {
  container: Container;
  refreshContainer: () => void;
  onClose: () => void;
}

const ContainerView: React.FC<ContainerViewProps> = ({ container, refreshContainer, onClose }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'text' | 'chat'>('files');
  const [text, setText] = useState(container.textContent);
  const [isSavingText, setIsSavingText] = useState(false);
  const [textSaved, setTextSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileMeta | null>(null);
  
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

  // Sync text and messages when container changes
  useEffect(() => {
    setText(container.textContent);
    setMessages(container.messages || []);
  }, [container.textContent, container.messages]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Manual save text function
  const handleSaveText = async () => {
    setIsSavingText(true);
    try {
      await updateContainerText(container.id, text);
      setTextSaved(true);
      setTimeout(() => setTextSaved(false), 2000);
      refreshContainer();
    } catch (error) {
      alert('Failed to save text');
    } finally {
      setIsSavingText(false);
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
      alert(error.message || "Upload failed");
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
      await removeFileFromContainer(container.id, fileId);
      refreshContainer();
    }
  };

  const handleDownload = (file: FileMeta) => {
    // Use the API download URL
    const downloadUrl = getFileDownloadUrl(container.id, file.id);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
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
      alert('Failed to send message');
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
          <Button variant="secondary" onClick={onClose} size="sm" className="text-xs sm:text-sm ml-2 whitespace-nowrap">
            Close
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-700">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('files')}
              className={`w-1/3 py-2 sm:py-4 px-1 text-center border-b-2 font-medium text-xs sm:text-sm ${
                activeTab === 'files'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }`}
            >
              Files ({container.files.length})
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`w-1/3 py-2 sm:py-4 px-1 text-center border-b-2 font-medium text-xs sm:text-sm ${
                activeTab === 'text'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-1/3 py-2 sm:py-4 px-1 text-center border-b-2 font-medium text-xs sm:text-sm flex items-center justify-center gap-1 ${
                activeTab === 'chat'
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

              {/* Drag and drop zone when no files */}
              {container.files.length === 0 ? (
                <div 
                  className={`text-center py-8 sm:py-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDragging 
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
            <div className="h-full flex flex-col space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                 <div className="flex items-center space-x-2">
                    <h3 className="text-base sm:text-lg font-medium text-white">Shared Clipboard</h3>
                    {textSaved && (
                        <span className="text-xs text-emerald-400 flex items-center">
                          <Check className="h-3 w-3 mr-1" /> Saved!
                        </span>
                    )}
                 </div>
                 <div className="flex space-x-2">
                   <Button 
                     variant="primary" 
                     onClick={handleSaveText} 
                     disabled={isSavingText}
                     className="flex items-center text-sm flex-1 sm:flex-none justify-center"
                   >
                     {isSavingText ? (
                       <RefreshCw className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                     ) : (
                       <Save className="h-4 w-4 mr-1 sm:mr-2" />
                     )}
                     {isSavingText ? 'Saving...' : 'Save'}
                   </Button>
                   <Button variant="ghost" onClick={handleCopyText} title="Copy to local clipboard" className="flex-1 sm:flex-none justify-center">
                     <Copy className="h-4 w-4 mr-1 sm:mr-2" />
                     Copy
                   </Button>
                 </div>
              </div>
              
              <div className="flex-1 relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full h-full p-3 sm:p-4 border border-zinc-700 rounded-lg bg-zinc-800 text-white placeholder-zinc-500 focus:ring-amber-500 focus:border-amber-500 resize-none font-mono text-sm"
                  placeholder="Type or paste text here to share..."
                  style={{ minHeight: '250px' }}
                />
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
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium ${
                      chatRole === 'owner'
                        ? 'bg-amber-500 text-zinc-900'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    Owner
                  </button>
                  <button
                    onClick={() => setChatRole('visitor')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium ${
                      chatRole === 'visitor'
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
                        className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-3 sm:px-4 py-2 ${
                          msg.sender === 'owner'
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
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSendingMessage || (!chatMessage.trim() && !pastedImage)
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
    </div>
  );
};

export default ContainerView;