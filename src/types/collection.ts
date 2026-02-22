/**
 * Collection and environment type definitions
 */

import type { HttpRequest } from './request';

export interface Collection {
    id: string;
    name: string;
    description?: string;
    folders: Folder[];
    requests: HttpRequest[];
    variables: CollectionVariable[];
    environments?: Environment[];  // Collection-scoped environments
    createdAt: number;
    updatedAt: number;
    /** If set, this collection is linked — reads and writes go to this file path */
    sourcePath?: string;
}

export interface Folder {
    id: string;
    name: string;
    description?: string;
    folders: Folder[];
    requests: HttpRequest[];
    parentId?: string;
}

export interface CollectionVariable {
    key: string;
    value: string;
    type: 'string' | 'secret';
    enabled: boolean;
}

export interface Environment {
    id: string;
    name: string;
    variables: EnvironmentVariable[];
    isActive: boolean;
}

export interface EnvironmentVariable {
    key: string;
    value: string;
    type: 'default' | 'secret';
    enabled: boolean;
}

/**
 * Create an empty collection with default values
 */
export function createEmptyCollection(name: string): Collection {
    return {
        id: generateCollectionId(),
        name,
        description: '',
        folders: [],
        requests: [],
        variables: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

/**
 * Create an empty folder
 */
export function createEmptyFolder(name: string, parentId?: string): Folder {
    return {
        id: generateFolderId(),
        name,
        description: '',
        folders: [],
        requests: [],
        parentId
    };
}

/**
 * Create an empty environment
 */
export function createEmptyEnvironment(name: string): Environment {
    return {
        id: generateEnvironmentId(),
        name,
        variables: [],
        isActive: false
    };
}

export function generateCollectionId(): string {
    return `col_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function generateFolderId(): string {
    return `fld_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function generateEnvironmentId(): string {
    return `env_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
