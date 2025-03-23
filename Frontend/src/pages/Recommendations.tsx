import React, { useState, useEffect } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, Search, MapPin, ChevronLeft, Droplets, X, User, LogOut } from 'lucide-react'; // Added User and LogOut icons
import CropRecommendationForm from '@/components/CropRecommendationForm';
import CropCard from '@/components/CropCard';
import { GrowingConditions, Crop } from '@/utils/types/cropTypes';
import { getUserLocation } from '@/utils/locationUtils';
import { toast } from 'sonner';
import { useGarden } from '@/context/GardenContext';
import BottomNavigation from '@/components/BottomNavigation';
import Header from '@/components/Header';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Notification {
  id: number;
  message: string;
  timestamp: string;
  read: boolean;
}

const Recommendations: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [visibleCrops, setVisibleCrops] = useState(4);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [companionCrops, setCompanionCrops] = useState<Crop[]>([]);
  const { userCrops, addCropToGarden, removeCropFromGarden } = useGarden();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const location = getUserLocation();
    if (!location) {
      toast.info('Please allow location access on the Dashboard for better recommendations.');
    }
  }, []);

  const handleSubmit = async (conditions: GrowingConditions) => {
    setIsLoading(true);
    setShowForm(false);
    try {
      const response = await fetch('http://127.0.0.1:5000/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conditions),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setCrops(data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast.error('Failed to get recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToGarden = async (crop: Crop) => {
    try {
      await addCropToGarden(crop.name);
      toast.success(`${crop.name} added to your garden!`);
    } catch (error) {
      console.error('Error adding crop to garden:', error);
      toast.error('Failed to add crop to garden. Please try again.');
    }
  };

  const handleReset = () => {
    setShowForm(true);
    setCrops([]);
    setVisibleCrops(4);
  };

  const loadMore = () => {
    setVisibleCrops((prev) => prev + 4);
  };

  // Fetch notifications
  const { data: userNotifications } = useQuery({
    queryKey: ['userNotifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await axios.get(`http://127.0.0.1:5000/notifications/${Number(user.id)}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (userNotifications) {
      setNotifications(userNotifications);
    }
  }, [userNotifications]);

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Header 
        title="Crop Recommendations" 
        showBackButton 
        onBackClick={() => navigate(-1)}
        notifications={notifications}
      />
      
      <main className="container mx-auto px-4 py-6">
        {showForm ? (
          <CropRecommendationForm onSubmit={handleSubmit} />
        ) : (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p>Finding the perfect crops for you...</p>
              </div>
            ) : crops.length > 0 ? (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-pocketfarm-primary mb-2">
                    Your Personalized Recommendations
                  </h2>
                  <p className="text-sm text-pocketfarm-gray">
                    These crops are suited to your growing conditions and location
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {crops.slice(0, visibleCrops).map((crop) => (
                    <CropCard
                      key={crop.id}
                      crop={crop}
                      onAddToGarden={() => handleAddToGarden(crop)}
                      onRemoveFromGarden={() => removeCropFromGarden(crop.name)}
                    />
                  ))}
                </div>
                {visibleCrops < crops.length && (
                  <div className="text-center mt-8">
                    <Button
                      onClick={loadMore}
                      className="bg-pocketfarm-primary hover:bg-pocketfarm-dark"
                    >
                      Load More Recommendations
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="mb-4">No crops match your criteria</p>
                <Button onClick={handleReset}>Try Different Conditions</Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Hovering Window for Companion Crops */}
      {selectedCrop && companionCrops.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Companion Plants for {selectedCrop.name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedCrop(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {companionCrops.map((crop) => (
                <CropCard
                  key={crop.id}
                  crop={crop}
                  onAddToGarden={() => handleAddToGarden(crop)}
                  onRemoveFromGarden={() => removeCropFromGarden(crop.name)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};

export default Recommendations;