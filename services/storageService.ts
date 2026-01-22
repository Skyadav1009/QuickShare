import { Container, ContainerSummary, FileMeta } from '../types';

const STORAGE_KEY = 'sharedrop_containers';

// Helper to get all containers
const getContainers = (): Record<string, Container> => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
};

// Helper to save containers
const saveContainers = (containers: Record<string, Container>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(containers));
};

export const createContainer = async (name: string, password: string): Promise<Container> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const containers = getContainers();
  
  // Check if name exists (simple unique constraint)
  const exists = Object.values(containers).some(c => c.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    throw new Error('Container name already exists. Please choose another.');
  }

  const newContainer: Container = {
    id: crypto.randomUUID(),
    name,
    passwordHash: password, // In production, use bcrypt. Here simple string for local demo.
    files: [],
    textContent: '',
    createdAt: Date.now(),
    lastAccessed: Date.now(),
  };

  containers[newContainer.id] = newContainer;
  saveContainers(containers);
  return newContainer;
};

export const searchContainers = async (query: string): Promise<ContainerSummary[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const containers = getContainers();
  
  return Object.values(containers)
    .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    .map(c => ({
      id: c.id,
      name: c.name,
      fileCount: c.files.length,
      hasText: !!c.textContent,
      createdAt: c.createdAt
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
};

export const getContainerById = async (id: string): Promise<Container | null> => {
  const containers = getContainers();
  return containers[id] || null;
};

export const verifyPassword = async (id: string, password: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  const container = await getContainerById(id);
  if (!container) return false;
  return container.passwordHash === password;
};

export const updateContainerText = async (id: string, text: string): Promise<void> => {
  const containers = getContainers();
  if (containers[id]) {
    containers[id].textContent = text;
    containers[id].lastAccessed = Date.now();
    saveContainers(containers);
  }
};

export const addFileToContainer = async (id: string, file: File): Promise<FileMeta> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const containers = getContainers();
      if (containers[id]) {
        const newFile: FileMeta = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result as string, // WARNING: LocalStorage has 5MB limit. This is for demo.
          createdAt: Date.now(),
        };
        containers[id].files.push(newFile);
        containers[id].lastAccessed = Date.now();
        saveContainers(containers);
        resolve(newFile);
      } else {
        reject(new Error("Container not found"));
      }
    };
    reader.onerror = reject;
    // Limit file size for demo to avoid crashing LocalStorage
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      reject(new Error("File too large for local demo storage (Max 2MB)"));
      return;
    }
    reader.readAsDataURL(file);
  });
};

export const removeFileFromContainer = async (containerId: string, fileId: string): Promise<void> => {
  const containers = getContainers();
  if (containers[containerId]) {
    containers[containerId].files = containers[containerId].files.filter(f => f.id !== fileId);
    containers[containerId].lastAccessed = Date.now();
    saveContainers(containers);
  }
};
