import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
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

const Recommendations: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [visibleCrops, setVisibleCrops] = useState(4);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [companionCrops, setCompanionCrops] = useState<Crop[]>([]);
  const { userCrops, addCropToGarden, removeCropFromGarden } = useGarden();

  useEffect(() => {
    const location = getUserLocation();
    if (!location) {
      toast.info('Please allow location access on the Dashboard for better recommendations.');
    }
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (conditions: GrowingConditions) => {
    setIsLoading(true);
    try {
      const userLocation = getUserLocation() || { city: 'Kochi' };
      const response = await fetch('http://127.0.0.1:5000/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sunlight: conditions.sunlight,
          water_needs: conditions.waterNeeds,
          avg_area: conditions.area,
          include_companions: conditions.wantCompanion,
          location: conditions.location.city || userLocation.city || 'Unknown',
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setCrops(data);
      setShowForm(false);

      if (data.length > 0) {
        toast.success(`Found ${data.length} crops that match your criteria!`);
      } else {
        toast.info('No crops found matching your criteria. Try adjusting your preferences.');
      }
    } catch (error) {
      console.error('[Recommendations] Error fetching recommendations:', error);
      toast.error('Failed to get crop recommendations. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCrops([]);
    setShowForm(true);
    setVisibleCrops(4);
    setSelectedCrop(null);
    setCompanionCrops([]);
  };

  const loadMore = () => {
    setVisibleCrops((prev) => Math.min(prev + 4, crops.length));
  };

  const handleAddToGarden = async (crop: Crop) => {
    try {
      if (!isAuthenticated) {
        toast.error('User not authenticated. Please log in again.');
        return;
      }

      if (userCrops.includes(crop.name)) {
        toast.error('This crop is already in your garden.');
        return;
      }

      // Add the crop to the garden
      await addCropToGarden(crop.name);
      toast.success(`${crop.name} added to your garden!`);

      // Debug log for companion plants
      console.log('Selected crop:', crop);
      console.log('Companion plants:', crop.companion_crops);

      // Only fetch and show companion plants in the recommendations page
      if (crop.companion_crops && crop.companion_crops.length > 0) {
        try {
          // Take only the first 2 companion plants
          const companionPlantsToShow = crop.companion_crops.slice(0, 2);
          console.log('Companion plants to show:', companionPlantsToShow);

          const companionCropsDetails = await Promise.all(
            companionPlantsToShow.map(async (name) => {
              console.log('Fetching details for companion plant:', name);
              const response = await fetch(`http://127.0.0.1:5000/crop/${encodeURIComponent(name)}`);
              if (!response.ok) {
                throw new Error(`Failed to fetch details for companion plant: ${name}`);
              }
              const data = await response.json();
              console.log('Received companion plant data:', data);
              return data;
            })
          );
          console.log('All companion plants fetched:', companionCropsDetails);
          setCompanionCrops(companionCropsDetails);
          setSelectedCrop(crop); // Show the hovering window
        } catch (error) {
          console.error('Error fetching companion plant details:', error);
          toast.error('Failed to fetch companion plant details. Please try again later.');
        }
      } else {
        console.log('No companion plants found for this crop');
      }
    } catch (error) {
      console.error('Error adding crop to garden:', error);
      toast.error('Failed to add crop to garden. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {!showForm && (
              <Button variant="ghost" size="icon" onClick={handleReset} className="mr-1">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-lg font-medium">{showForm ? 'Find Crops to Grow' : 'Recommended Crops'}</h1>
          </div>
        </div>
      </header>

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
          <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4 relative">
            <button
              onClick={() => {
                setSelectedCrop(null);
                setCompanionCrops([]);
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-pocketfarm-primary">
                Companion Plants for {selectedCrop.name}
              </h3>
              <p className="text-sm text-pocketfarm-gray">
                {companionCrops.length} companion plant{companionCrops.length > 1 ? 's' : ''} available
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {companionCrops.map((companion) => (
                <CropCard
                  key={companion.id}
                  crop={companion}
                  onAddToGarden={() => handleAddToGarden(companion)}
                  onRemoveFromGarden={() => removeCropFromGarden(companion.name)}
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