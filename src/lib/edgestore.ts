// This is a mock implementation of the EdgeStore client
// In a real application, you would import the actual client library

import { createContext, useContext } from 'react';

type EdgeStoreOptions = {
  path?: string;
  generateId?: boolean;
};

type EdgeStoreType = {
  publicFiles: {
    upload: (options: { file: File; options?: EdgeStoreOptions }) => Promise<{ url: string }>;
  };
};

const EdgeStoreContext = createContext<{ edgestore: EdgeStoreType } | null>(null);

export const useEdgeStore = () => {
  const context = useContext(EdgeStoreContext);

  // If not using the actual EdgeStore, provide a mock implementation
  if (!context) {
    return {
      edgestore: {
        publicFiles: {
          upload: async ({ file, options = {} as EdgeStoreOptions }) => {
            console.log('Mock file upload:', file.name, options);

            // Create a mock file URL using a data URL if it's an image
            if (file.type.startsWith('image/')) {
              return new Promise<{ url: string }>(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  resolve({ url: reader.result as string });
                };
                reader.readAsDataURL(file);
              });
            }

            // Return a mock URL for non-image files
            return { url: `https://mock-cdn.example.com/${options.path || ''}/${file.name}` };
          },
        },
      },
    };
  }

  return context;
};

export const EdgeStoreProvider = EdgeStoreContext.Provider;
