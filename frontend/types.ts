export interface FileMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string; // Storing small files as base64 for demo purposes
  createdAt: number;
}

export interface Message {
  id: string;
  sender: 'owner' | 'visitor';
  text: string;
  imageUrl: string;
  createdAt: number;
}

export interface Container {
  id: string;
  name: string;
  passwordHash: string; // In a real app, hash this. Here we simulate it.
  files: FileMeta[];
  messages: Message[];
  textContent: string;
  maxViews: number;
  currentViews: number;
  deleted?: boolean;
  message?: string;
  createdAt: number;
  lastAccessed: number;
}

export interface ContainerSummary {
  id: string;
  name: string;
  fileCount: number;
  hasText: boolean;
  maxViews: number;
  currentViews: number;
  createdAt: number;
}

export enum ViewState {
  HOME = 'HOME',
  CREATE = 'CREATE',
  UNLOCK = 'UNLOCK',
  CONTAINER = 'CONTAINER',
}
