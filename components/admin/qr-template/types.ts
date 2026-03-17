
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
}

export interface QrTemplateSelectorProps {
  qrValue: string;
  qrColor: string;
  eventSlug: string;
  onQrColorChange?: (color: string) => void;
}

export interface CanvasRendererProps {
  templateImage: HTMLImageElement;
  template: TemplateOption;
  qrDataUrl: string;
  qrColor: string;
  onRendered: (dataUrl: string) => void;
  onError: (error: string) => void;
}
