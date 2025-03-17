
import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Home, Search, MapPin, Droplets } from 'lucide-react';
import CropSearch from '@/components/CropSearch';

const CropLibrary: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
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
        <CropSearch />
      </main>
      
      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="container mx-auto flex items-center justify-around py-2">
          <Link to="/dashboard" className="flex flex-col items-center p-2 text-pocketfarm-gray">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link to="/recommendations" className="flex flex-col items-center p-2 text-pocketfarm-gray">
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">Find Crops</span>
          </Link>
          <Link to="/nursery-finder" className="flex flex-col items-center p-2 text-pocketfarm-gray">
            <MapPin className="h-5 w-5" />
            <span className="text-xs mt-1">Nurseries</span>
          </Link>
          <Link to="/crop-library" className="flex flex-col items-center p-2 text-pocketfarm-primary">
            <Droplets className="h-5 w-5" />
            <span className="text-xs mt-1">Crops</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default CropLibrary;
