export interface TextPosition {
  x: number;       // percentage of width (center point)
  y: number;       // percentage of height (center point)
  fontSize: number; // percentage of canvas width (auto-scaled)
}

export interface QrPosition {
  x: number;       // percentage of width (center point)
  y: number;       // percentage of height (center point)
  width: number;   // percentage of width
  height: number;  // percentage of height
}

export interface TemplateOption {
  id: string;
  name: string;
  imageSrc: string;
  qrPosition: QrPosition;
  namePosition: TextPosition;
  urlPosition: TextPosition;
}

export interface QrTemplateSelectorProps {
  qrValue: string;
  qrColor: string;
  eventSlug: string;
  coupleName: string;
  onQrColorChange?: (color: string) => void;
}

export interface CanvasRendererProps {
  templateImage: HTMLImageElement;
  template: TemplateOption;
  qrDataUrl: string;
  coupleName: string;
  guestUrl: string;
  qrColor: string;
  onRendered: (dataUrl: string) => void;
  onError: (error: string) => void;
}
