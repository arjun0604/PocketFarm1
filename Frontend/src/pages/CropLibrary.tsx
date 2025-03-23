import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Home, Search, MapPin, Droplets } from 'lucide-react';
import CropSearch from '@/components/CropSearch';
import { useGarden } from '@/context/GardenContext'; // Import useGarden
import BottomNavigation from '@/components/BottomNavigation';

const CropLibrary: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { userCrops, removeCropFromGarden } = useGarden(); // Use the garden context

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-lg font-medium">Crop Library</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {/* Pass the onRemoveFromGarden prop to CropSearch */}
        <CropSearch onRemoveFromGarden={removeCropFromGarden} />
      </main>
      
      {/* Replace the existing nav with BottomNavigation */}
      <BottomNavigation />
    </div>
  );
};

export default CropLibrary;