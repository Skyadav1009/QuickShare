import { Container, ContainerSummary, FileMeta } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper for API calls
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Create a new container
export const createContainer = async (name: string, password: string): Promise<Container> => {
  const data = await apiRequest<Container>('/containers', {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  });
  
  return data;
};

// Search containers by name
export const searchContainers = async (query: string): Promise<ContainerSummary[]> => {
  if (!query.trim()) return [];
  
  const data = await apiRequest<ContainerSummary[]>(
    `/containers/search?q=${encodeURIComponent(query)}`
  );
  
  return data;
};

// Get all recent containers (for homepage listing)
export const getRecentContainers = async (): Promise<ContainerSummary[]> => {
  const data = await apiRequest<ContainerSummary[]>('/containers/recent');
  return data;
};

// Verify password and get container
export const verifyPassword = async (id: string, password: string): Promise<boolean> => {
  try {
    await apiRequest<Container>(`/containers/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    return true;
  } catch {
    return false;
  }
};

// Get container by ID (after password verification)
export const getContainerById = async (id: string): Promise<Container | null> => {
  try {
    const data = await apiRequest<Container>(`/containers/${id}`);
    return data;
  } catch {
    return null;
  }
};

// Unlock container (verify + get)
export const unlockContainer = async (id: string, password: string): Promise<Container | null> => {
  try {
    const data = await apiRequest<Container>(`/containers/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    return data;
  } catch {
    return null;
  }
};

// Update text content
export const updateContainerText = async (id: string, text: string): Promise<void> => {
  await apiRequest<{ success: boolean }>(`/containers/${id}/text`, {
    method: 'PUT',
    body: JSON.stringify({ text }),
  });
};

// Add file to container
export const addFileToContainer = async (id: string, file: File): Promise<FileMeta> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/containers/${id}/files`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
};

// Remove file from container
export const removeFileFromContainer = async (containerId: string, fileId: string): Promise<void> => {
  await apiRequest<{ success: boolean }>(`/containers/${containerId}/files/${fileId}`, {
    method: 'DELETE',
  });
};

// Get download URL for a file
export const getFileDownloadUrl = (containerId: string, fileId: string): string => {
  return `${API_BASE}/containers/${containerId}/files/${fileId}/download`;
};
