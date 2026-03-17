import { TemplateOption } from './types';

export const templates: TemplateOption[] = [
  {
    id: 'template1',
    name: 'template1',
    imageSrc: '/templates/wedding-template-1.jpg',
    qrPosition: { x: 50, y: 86, width: 35, height: 25 },
    namePosition: { x: 50, y: 72, fontSize: 4 },
    urlPosition: { x: 50, y: 97, fontSize: 1.8 },
  },
  {
    id: 'template2',
    name: 'template2',
    imageSrc: '/templates/wedding-template-2.jpg',
    qrPosition: { x: 49, y: 52, width: 45, height: 33 },
    namePosition: { x: 49, y: 30, fontSize: 4 },
    urlPosition: { x: 49, y: 72, fontSize: 1.8 },
  },
  {
    id: 'template3',
    name: 'template3',
    imageSrc: '/templates/wedding-template-3.jpg',
    qrPosition: { x: 49, y: 27, width: 35, height: 23 },
    namePosition: { x: 49, y: 10, fontSize: 4 },
    urlPosition: { x: 49, y: 42, fontSize: 1.8 },
  },
  {
    id: 'template4',
    name: 'template4',
    imageSrc: '/templates/wedding-template-4.jpg',
    qrPosition: { x: 49, y: 45, width: 35, height: 23 },
    namePosition: { x: 49, y: 28, fontSize: 4 },
    urlPosition: { x: 49, y: 60, fontSize: 1.8 },
  },
];

export const predefinedColors = [
  "#000000", "#0047AB", "#6B8E23", "#800020", "#4B0082",
  "#228B22", "#8B4513", "#4682B4", "#708090", "#CD5C5C",
];
