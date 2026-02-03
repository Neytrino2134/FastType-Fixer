declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
    NODE_ENV?: string;
  }
}

declare module 'react-markdown' {
    import React from 'react';
    export interface Options {
        children?: React.ReactNode;
        className?: string;
        components?: Record<string, React.ElementType>;
        remarkPlugins?: any[];
        rehypePlugins?: any[];
        [key: string]: any;
    }
    const ReactMarkdown: React.FC<Options>;
    export default ReactMarkdown;
}