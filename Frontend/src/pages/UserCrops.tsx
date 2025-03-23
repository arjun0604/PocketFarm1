import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useGarden } from '@/context/GardenContext';
import { Button } from '@/components/ui/button';
import { Home, Search, MapPin, Droplets, User, Bell, LogOut, ChevronLeft } from 'lucide-react';
import CropCard from '@/components/CropCard';
import { Crop } from '@/utils/types/cropTypes';
import { toast } from 'sonner';
import BottomNavigation from '@/components/BottomNavigation';

const UserCrops: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const { userCrops, removeCropFromGarden } = useGarden();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<number>(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    const fetchCropDetails = async () => {
      try {
        const cropDetails = await Promise.all(
          userCrops.map(async (cropName) => {
            const response = await fetch(`http://127.0.0.1:5000/crop/${encodeURIComponent(cropName)}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch details for ${cropName}`);
            }
            return response.json();
          })
        );
        setCrops(cropDetails);
      } catch (error) {
        console.error('Error fetching crop details:', error);
        toast.error('Failed to load your garden. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCropDetails();
  }, [isAuthenticated, navigate, userCrops]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-1">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-medium">My Garden</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p>Loading your garden...</p>
          </div>
        ) : crops.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {crops.map((crop) => (
              <CropCard
                key={crop.id}
                crop={crop}
                onRemoveFromGarden={() => removeCropFromGarden(crop.name)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="mb-4">Your garden is empty</p>
            <Button onClick={() => navigate('/recommendations')}>Find Crops to Grow</Button>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default UserCrops;