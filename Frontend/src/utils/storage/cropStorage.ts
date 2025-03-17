
import { Crop } from '../types/cropTypes';
import { mockCrops } from '../data/mockData';

export const saveCropSelection = (cropId: string) => {
  const currentSelections = getUserCrops();
  if (!currentSelections.includes(cropId)) {
    currentSelections.push(cropId);
    localStorage.setItem('pocketfarm_selected_crops', JSON.stringify(currentSelections));
  }
};

export const getUserCrops = (): string[] => {
  const stored = localStorage.getItem('pocketfarm_selected_crops');
  return stored ? JSON.parse(stored) : [];
};

export const getUserCropDetails = (): Crop[] => {
  const cropIds = getUserCrops();
  return mockCrops.filter(crop => cropIds.includes(crop.id));
};
