declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.sass' {
  const content: { [className: string]: string };
  export default content;
}

interface Window {
  VdoPlayer: any; // Or a more specific type if known
  isPickingFile?: boolean;
  disableScreenProtection?: boolean;
  YT?: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    'vdocipher-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      playbackinfo?: string;
      otp?: string;
    };
  }
}
