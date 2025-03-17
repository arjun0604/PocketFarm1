import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, Search, MapPin, ChevronLeft, Droplets } from 'lucide-react';
import CropRecommendationForm from '@/components/CropRecommendationForm';
import CropCard from '@/components/CropCard';
import { GrowingConditions, Crop } from '@/utils/types/cropTypes';
import { getUserLocation } from '@/utils/locationUtils'; // Import to get cached location
import { toast } from 'sonner';

const Recommendations: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [visibleCrops, setVisibleCrops] = useState(4);

  useEffect(() => {
    // Ensure location is available for initial load
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
      const userLocation = getUserLocation() || { city: 'Kochi' }; // Use cached location or fallback
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
      setCrops(data); // Assuming backend returns an array of crops directly
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
  };

  const loadMore = () => {
    setVisibleCrops((prev) => Math.min(prev + 4, crops.length));
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
                    <CropCard key={crop.id} crop={crop} />
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

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="container mx-auto flex items-center justify-around py-2">
          <Link to="/dashboard" className="flex flex-col items-center p-2 text-pocketfarm-gray">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link to="/recommendations" className="flex flex-col items-center p-2 text-pocketfarm-primary">
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">Find Crops</span>
          </Link>
          <Link to="/nursery-finder" className="flex flex-col items-center p-2 text-pocketfarm-gray">
            <MapPin className="h-5 w-5" />
            <span className="text-xs mt-1">Nurseries</span>
          </Link>
          <Link to="/crop-library" className="flex flex-col items-center p-2 text-pocketfarm-gray">
            <Droplets className="h-5 w-5" />
            <span className="text-xs mt-1">Crops</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Recommendations;