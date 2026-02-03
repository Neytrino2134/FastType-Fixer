export {};

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: string;
  export default content;
}

declare module '*.css';

// Augment the global JSX namespace to include standard HTML elements and Three.js elements.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Three.js elements used in the project
      ambientLight: any;
      pointLight: any;
      directionalLight: any;
      group: any;
      mesh: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      instancedMesh: any;
      boxGeometry: any;
      
      // Catch-all for others
      [elemName: string]: any;
    }
  }

  // Also augment React.JSX for React 18+ support which strictly separates global JSX
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        ambientLight: any;
        pointLight: any;
        directionalLight: any;
        group: any;
        mesh: any;
        meshStandardMaterial: any;
        meshBasicMaterial: any;
        instancedMesh: any;
        boxGeometry: any;
        [elemName: string]: any;
      }
    }
  }
}
