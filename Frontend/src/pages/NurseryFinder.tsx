import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Home, Search, MapPin, Droplets, User } from 'lucide-react';
import NurseryMap from '@/components/NurseryMap';
import { requestLocationPermission, Location } from '@/utils/locationUtils';
import { toast } from 'sonner';
import BottomNavigation from '@/components/BottomNavigation';

const NurseryFinder: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  useEffect(() => {
    const loadLocation = async () => {
      try {
        const location = await requestLocationPermission(); // Uses cached location if available
        setUserLocation(location);
        toast.info('Finding plant nurseries and garden supplies near you...');
      } catch (error) {
        console.error('[NurseryFinder] Error getting location:', error);
        toast.error('Failed to get your location. Please enable location services or set a location manually.');
      }
    };
    loadLocation();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-medium">Plant Nurseries & Garden Centers</h1>
          <Link to="/profile" className="text-pocketfarm-primary">
            <User className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {userLocation ? (
          <NurseryMap location={userLocation} />
        ) : (
          <p>Loading nursery map...</p>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default NurseryFinder;