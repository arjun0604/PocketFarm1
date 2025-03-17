
export interface Crop {
  id: string;
  name: string;
  scientificName: string;
  image: string;
  sunlight: 'Full' | 'Partial';
  waterNeeds: 'Low' | 'Medium' | 'High';
  growthDuration: string;
  description: string;
  harvestTime: string;
  companionPlants?: string[];
}

export interface GrowingConditions {
  sunlight: 'Full' | 'Partial';
  waterNeeds: 'Low' | 'Medium' | 'High';
  area: number;
  wantCompanion: boolean;
  location: {
    latitude: number;
    longitude: number;
    city?: string;
  };
}

export interface Nursery {
  id: string;
  name: string;
  type: 'nursery' | 'store';
  address: string;
  distance: number;
  rating: number;
  phone?: string;
  website?: string;
  latitude: number;
  longitude: number;
}
