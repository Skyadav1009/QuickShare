import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import Navbar from './components/Navbar';
import Button from './components/Button';
import ContainerView from './components/ContainerView';
import { createContainer, searchContainers, getContainerById, unlockContainer, getRecentContainers } from './services/storageService';
import { Container, ContainerSummary, ViewState } from './types';
import { Search, Plus, Lock, ArrowRight, ShieldCheck, Eye } from 'lucide-react';

const App: React.FC = () => {
  // Diagnostic message to confirm component render
  // eslint-disable-next-line no-console
  useEffect(() => { console.log('App component rendered'); }, []);
  const [viewState, setViewState] = useState<ViewState>(ViewState.HOME);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContainerSummary[]>([]);
  const [recentContainers, setRecentContainers] = useState<ContainerSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  
  // Selection State
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [activeContainer, setActiveContainer] = useState<Container | null>(null);
  
  // Form States
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createMaxViews, setCreateMaxViews] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load recent containers on mount and when returning to home
  useEffect(() => {
    if (viewState === ViewState.HOME) {
      loadRecentContainers();
    }
  }, [viewState]);

  const loadRecentContainers = async () => {
    setIsLoadingRecent(true);
    try {
      const containers = await getRecentContainers();
      setRecentContainers(containers);
    } catch (error) {
      console.error('Failed to load recent containers:', error);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  // Handle Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        const results = await searchContainers(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createPassword) {
      setErrorMsg("Name and password are required.");
      return;
    }
    try {
      const maxViews = createMaxViews ? parseInt(createMaxViews, 10) : 0;
      const newContainer = await createContainer(createName, createPassword, maxViews);
      setActiveContainer(newContainer);
      setViewState(ViewState.CONTAINER);
      setCreateName('');
      setCreatePassword('');
      setCreateMaxViews('');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContainerId || !unlockPassword) return;

    try {
      const container = await unlockContainer(selectedContainerId, unlockPassword);
      if (container) {
        setActiveContainer(container);
        setViewState(ViewState.CONTAINER);
        setUnlockPassword('');
        setErrorMsg('');
      } else {
        setErrorMsg("Incorrect password.");
      }
    } catch (err) {
      setErrorMsg("Error unlocking container.");
    }
  };

  const openUnlockScreen = (id: string) => {
    setSelectedContainerId(id);
    setViewState(ViewState.UNLOCK);
    setErrorMsg('');
  };

  const refreshActiveContainer = async () => {
    if (activeContainer) {
        const updated = await getContainerById(activeContainer.id);
        setActiveContainer(updated);
    }
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <Navbar onHome={() => setViewState(ViewState.HOME)} />

        <main className="flex-grow">
          
          {/* HOME VIEW */}
          {viewState === ViewState.HOME && (
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-12 lg:px-8">
              <div className="text-center mb-8 sm:mb-12">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                  Share files instantly across devices
                </h1>
                <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-zinc-400 px-2">
                  Secure, password-protected containers. No login required.
                </p>
                <div className="mt-6 sm:mt-8 flex justify-center px-4">
                  <Button 
                    onClick={() => setViewState(ViewState.CREATE)}
                    className="flex items-center text-sm sm:text-lg px-4 sm:px-8 py-2 sm:py-3 w-full sm:w-auto justify-center"
                  >
                    <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Create Container
                  </Button>
                </div>
              </div>

              {/* Search Section */}
              <div className="bg-zinc-900 rounded-xl shadow-lg shadow-black/20 border border-zinc-800 p-4 sm:p-6 mb-6 sm:mb-8">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 sm:py-4 border border-zinc-700 rounded-lg leading-5 bg-zinc-800 placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    placeholder="Search containers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <svg className="animate-spin h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Results Grid */}
              {searchResults.length > 0 ? (
                 <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                    {searchResults.map((container) => (
                      <div 
                        key={container.id} 
                        onClick={() => openUnlockScreen(container.id)}
                        className="bg-zinc-900 p-4 sm:p-6 rounded-lg shadow-sm border border-zinc-800 hover:shadow-lg hover:shadow-amber-500/10 hover:border-amber-500/50 transition-all cursor-pointer group active:bg-zinc-800 relative"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center min-w-0 flex-1">
                            <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors flex-shrink-0">
                              <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                            </div>
                            <div className="ml-3 sm:ml-4 min-w-0">
                              <h3 className="text-base sm:text-lg font-medium text-white group-hover:text-amber-400 transition-colors truncate">
                                {container.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-zinc-500">
                                {new Date(container.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-zinc-600 group-hover:text-amber-500 flex-shrink-0 ml-2" />
                        </div>
                        <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:space-x-4 text-xs sm:text-sm text-zinc-500">
                           <span className="flex items-center">
                             <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-emerald-500" /> Protected
                           </span>
                           <span className="hidden sm:inline">•</span>
                           <span>{container.fileCount} Files</span>
                           <span className="hidden sm:inline">•</span>
                           <span>{container.hasText ? 'Has Text' : 'No Text'}</span>
                        </div>
                        {/* Views counter in bottom-right */}
                        {container.maxViews > 0 && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-full text-xs border border-amber-500/30">
                            <Eye className="h-3 w-3 text-amber-400" />
                            <span className="text-amber-400 font-medium">
                              {container.currentViews}/{container.maxViews}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                 </div>
              ) : (
                searchQuery && !isSearching && (
                  <div className="text-center text-zinc-500 py-8">
                    No containers found matching "{searchQuery}"
                  </div>
                )
              )}

              {/* All Containers Section */}
              {!searchQuery && (
                <div className="mt-6 sm:mt-8">
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">All Containers</h2>
                  {isLoadingRecent ? (
                    <div className="text-center py-6 sm:py-8">
                      <svg className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-amber-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-zinc-500 mt-2 text-sm">Loading containers...</p>
                    </div>
                  ) : recentContainers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                      {recentContainers.map((container) => (
                        <div 
                          key={container.id} 
                          onClick={() => openUnlockScreen(container.id)}
                          className="bg-zinc-900 p-4 sm:p-6 rounded-lg shadow-sm border border-zinc-800 hover:shadow-lg hover:shadow-amber-500/10 hover:border-amber-500/50 transition-all cursor-pointer group active:bg-zinc-800 relative"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center min-w-0 flex-1">
                              <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors flex-shrink-0">
                                <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                              </div>
                              <div className="ml-3 sm:ml-4 min-w-0">
                                <h3 className="text-base sm:text-lg font-medium text-white group-hover:text-amber-400 transition-colors truncate">
                                  {container.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-zinc-500">
                                  {new Date(container.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-zinc-600 group-hover:text-amber-500 flex-shrink-0 ml-2" />
                          </div>
                          <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:space-x-4 text-xs sm:text-sm text-zinc-500">
                            <span className="flex items-center">
                              <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-emerald-500" /> Protected
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span>{container.fileCount} Files</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{container.hasText ? 'Has Text' : 'No Text'}</span>
                          </div>
                          {/* Views counter in bottom-right */}
                          {container.maxViews > 0 && (
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-full text-xs border border-amber-500/30">
                              <Eye className="h-3 w-3 text-amber-400" />
                              <span className="text-amber-400 font-medium">
                                {container.currentViews}/{container.maxViews}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-zinc-500 py-6 sm:py-8 bg-zinc-900 rounded-lg border-2 border-dashed border-zinc-700">
                      <Lock className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-600 mx-auto mb-2" />
                      <p className="text-sm">No containers yet. Create your first one!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CREATE VIEW */}
          {viewState === ViewState.CREATE && (
            <div className="max-w-md mx-auto px-3 sm:px-4 py-6 sm:py-12">
               <div className="bg-zinc-900 py-6 sm:py-8 px-4 sm:px-6 shadow-lg shadow-black/20 rounded-lg border border-zinc-800">
                 <div className="mb-4 sm:mb-6 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">New Container</h2>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">Set a name and password to secure your files.</p>
                 </div>
                 <form className="space-y-6" onSubmit={handleCreate}>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300">Container Name</label>
                      <div className="mt-1">
                        <input
                          type="text"
                          required
                          value={createName}
                          onChange={(e) => setCreateName(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-zinc-700 rounded-md shadow-sm bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                          placeholder="e.g. MyVacationPhotos"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-300">Password</label>
                      <div className="mt-1">
                        <input
                          type="password"
                          required
                          value={createPassword}
                          onChange={(e) => setCreatePassword(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-zinc-700 rounded-md shadow-sm bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-300">View Limit (Optional)</label>
                      <div className="mt-1">
                        <input
                          type="number"
                          min="0"
                          value={createMaxViews}
                          onChange={(e) => setCreateMaxViews(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-zinc-700 rounded-md shadow-sm bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                          placeholder="0 = Unlimited views"
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">Container will be deleted after this many views. Leave empty or 0 for unlimited.</p>
                    </div>

                    {errorMsg && (
                      <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                        {errorMsg}
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button type="button" variant="secondary" onClick={() => setViewState(ViewState.HOME)} className="w-full">
                        Cancel
                      </Button>
                      <Button type="submit" className="w-full">
                        Create
                      </Button>
                    </div>
                 </form>
               </div>
            </div>
          )}

          {/* UNLOCK VIEW */}
          {viewState === ViewState.UNLOCK && (
            <div className="max-w-md mx-auto px-3 sm:px-4 py-6 sm:py-12">
               <div className="bg-zinc-900 py-6 sm:py-8 px-4 sm:px-6 shadow-lg shadow-black/20 rounded-lg border border-zinc-800 border-t-4 border-t-amber-500">
                 <div className="mb-4 sm:mb-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-amber-500/20">
                      <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                    </div>
                    <h2 className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-white">Unlock Container</h2>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">Enter the password to access these files.</p>
                 </div>
                 <form className="space-y-6" onSubmit={handleUnlock}>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300">Password</label>
                      <div className="mt-1">
                        <input
                          type="password"
                          required
                          autoFocus
                          value={unlockPassword}
                          onChange={(e) => setUnlockPassword(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-zinc-700 rounded-md shadow-sm bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                        {errorMsg}
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button type="button" variant="secondary" onClick={() => setViewState(ViewState.HOME)} className="w-full">
                        Cancel
                      </Button>
                      <Button type="submit" className="w-full">
                        Unlock
                      </Button>
                    </div>
                 </form>
               </div>
            </div>
          )}

          {/* CONTAINER VIEW */}
          {viewState === ViewState.CONTAINER && activeContainer && (
            <ContainerView 
              container={activeContainer} 
              refreshContainer={refreshActiveContainer}
              onClose={() => {
                setActiveContainer(null);
                setViewState(ViewState.HOME);
              }}
            />
          )}

        </main>
      </div>
    </HashRouter>
  );
};

export default App;