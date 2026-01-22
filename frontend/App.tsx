import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import Navbar from './components/Navbar';
import Button from './components/Button';
import ContainerView from './components/ContainerView';
import { createContainer, searchContainers, getContainerById, unlockContainer, getRecentContainers } from './services/storageService';
import { Container, ContainerSummary, ViewState } from './types';
import { Search, Plus, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

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
      const newContainer = await createContainer(createName, createPassword);
      setActiveContainer(newContainer);
      setViewState(ViewState.CONTAINER);
      setCreateName('');
      setCreatePassword('');
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar onHome={() => setViewState(ViewState.HOME)} />

        <main className="flex-grow">
          
          {/* HOME VIEW */}
          {viewState === ViewState.HOME && (
            <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                  Share files instantly across devices
                </h1>
                <p className="mt-4 text-lg text-gray-500">
                  Secure, password-protected containers. No login required.
                </p>
                <div className="mt-8 flex justify-center">
                  <Button 
                    onClick={() => setViewState(ViewState.CREATE)}
                    className="flex items-center text-lg px-8 py-3"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create New Container
                  </Button>
                </div>
              </div>

              {/* Search Section */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Search for an existing container by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Results Grid */}
              {searchResults.length > 0 ? (
                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {searchResults.map((container) => (
                      <div 
                        key={container.id} 
                        onClick={() => openUnlockScreen(container.id)}
                        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                              <Lock className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="ml-4">
                              <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                {container.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                Created {new Date(container.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500" />
                        </div>
                        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                           <span className="flex items-center">
                             <ShieldCheck className="h-4 w-4 mr-1 text-green-500" /> Protected
                           </span>
                           <span>•</span>
                           <span>{container.fileCount} Files</span>
                           <span>•</span>
                           <span>{container.hasText ? 'Has Text' : 'No Text'}</span>
                        </div>
                      </div>
                    ))}
                 </div>
              ) : (
                searchQuery && !isSearching && (
                  <div className="text-center text-gray-500 py-8">
                    No containers found matching "{searchQuery}"
                  </div>
                )
              )}

              {/* All Containers Section */}
              {!searchQuery && (
                <div className="mt-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">All Containers</h2>
                  {isLoadingRecent ? (
                    <div className="text-center py-8">
                      <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-gray-500 mt-2">Loading containers...</p>
                    </div>
                  ) : recentContainers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {recentContainers.map((container) => (
                        <div 
                          key={container.id} 
                          onClick={() => openUnlockScreen(container.id)}
                          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                <Lock className="h-6 w-6 text-indigo-600" />
                              </div>
                              <div className="ml-4">
                                <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                  {container.name}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Created {new Date(container.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500" />
                          </div>
                          <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <ShieldCheck className="h-4 w-4 mr-1 text-green-500" /> Protected
                            </span>
                            <span>•</span>
                            <span>{container.fileCount} Files</span>
                            <span>•</span>
                            <span>{container.hasText ? 'Has Text' : 'No Text'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                      <Lock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>No containers yet. Create your first one!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CREATE VIEW */}
          {viewState === ViewState.CREATE && (
            <div className="max-w-md mx-auto px-4 py-12">
               <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
                 <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900">New Container</h2>
                    <p className="text-sm text-gray-500 mt-1">Set a name and password to secure your files.</p>
                 </div>
                 <form className="space-y-6" onSubmit={handleCreate}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Container Name</label>
                      <div className="mt-1">
                        <input
                          type="text"
                          required
                          value={createName}
                          onChange={(e) => setCreateName(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="e.g. MyVacationPhotos"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <div className="mt-1">
                        <input
                          type="password"
                          required
                          value={createPassword}
                          onChange={(e) => setCreatePassword(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                        Create
                      </Button>
                    </div>
                 </form>
               </div>
            </div>
          )}

          {/* UNLOCK VIEW */}
          {viewState === ViewState.UNLOCK && (
            <div className="max-w-md mx-auto px-4 py-12">
               <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10 border-t-4 border-indigo-600">
                 <div className="mb-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                      <Lock className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="mt-3 text-2xl font-bold text-gray-900">Unlock Container</h2>
                    <p className="text-sm text-gray-500 mt-1">Enter the password to access these files.</p>
                 </div>
                 <form className="space-y-6" onSubmit={handleUnlock}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <div className="mt-1">
                        <input
                          type="password"
                          required
                          autoFocus
                          value={unlockPassword}
                          onChange={(e) => setUnlockPassword(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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