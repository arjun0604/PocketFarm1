import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Crop } from '@/utils/cropUtils';
import CropCard from '@/components/CropCard';
import { Link } from 'react-router-dom';
import { Home, Search, MapPin, Droplets } from 'lucide-react';

const UserCrops: React.FC = () => {
  const { user } = useAuth();
  const [userCrops, setUserCrops] = useState<Crop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserCrops = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://127.0.0.1:5000/get_user_crops', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user?.id}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user crops');
        }

        const cropNames = await response.json();

        const cropsWithDetails = await Promise.all(
          cropNames.map(async (cropName: string) => {
            const cropResponse = await fetch(`http://127.0.0.1:5000/crop/${cropName}`);
            if (!cropResponse.ok) {
              throw new Error(`Failed to fetch details for ${cropName}`);
            }
            return cropResponse.json();
          })
        );

        setUserCrops(cropsWithDetails);
      } catch (error) {
        console.error('Error fetching user crops:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      fetchUserCrops();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-20">
      <h1 className="text-2xl font-bold mb-6">My Garden</h1>
      {isLoading ? (
        <p>Loading crops...</p>
      ) : userCrops.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {userCrops.map((crop) => (
            <CropCard
              key={crop.id || crop.name}
              crop={{
                ...crop,
                imageURL: crop.image || crop.imageURL || 'https://via.placeholder.com/150', // Fallback image
                scientific_name: crop.scientificName || crop.scientific_name || 'N/A',
                waterNeeds: crop.waterNeeds || 'Moderate',
                sunlight: crop.sunlight || 'Full',
                growing_conditions: crop.growing_conditions || 'N/A',
                planting_info: crop.planting_info || 'N/A',
                description: crop.description || 'No description available',
                companionCrops: crop.companionCrops || [],
                origin: crop.origin || 'Unknown',
                care_instructions: crop.care_instructions || 'No specific instructions',
                storage_info: crop.storage_info || 'Store in a cool, dry place',
                nutritional_info: crop.nutritional_info || 'No nutritional info available',
                culinary_info: crop.culinary_info || 'No culinary info available',
              }}
            />
          ))}
        </div>
      ) : (
        <p>No crops found in your garden.</p>
      )}

      {/* Footer Navigation */}
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

export default UserCrops;