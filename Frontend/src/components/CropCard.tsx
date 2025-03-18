import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sun, Droplets, Clock, CalendarDays, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Crop } from '@/utils/types/cropTypes';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface CropCardProps {
  crop: Crop;
  onSelect?: () => void;
  selected?: boolean;
}

const CropCard: React.FC<CropCardProps> = ({ crop, onSelect, selected = false }) => {
  const [showMore, setShowMore] = useState(false);
  const [isInGarden, setIsInGarden] = useState(false); // Track if the crop is already in the garden
  const { user } = useAuth();

  // Fetch the user's garden crops when the component mounts
  useEffect(() => {
    const fetchUserCrops = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/get_user_crops', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user?.deviceToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user crops');
        }

        const userCrops = await response.json();
        // Check if the current crop is in the user's garden
        if (userCrops.includes(crop.name)) {
          setIsInGarden(true);
        }
      } catch (error) {
        console.error('Error fetching user crops:', error);
      }
    };

    if (user?.deviceToken) {
      fetchUserCrops();
    }
  }, [user, crop.name]);

  const handleAddToGarden = async () => {
    try {
      if (!user?.id) {
        toast.error('User not authenticated. Please log in again.');
        return;
      }
  
      const response = await fetch('http://127.0.0.1:5000/add_to_library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`, // Use user ID for authentication
        },
        body: JSON.stringify({
          user_id: user.id, // Ensure user_id is included
          crop_name: crop.name, // Ensure crop.name is correctly passed
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json(); // Parse the error response from the backend
        throw new Error(errorData.error || 'Failed to add crop to garden');
      }
  
      toast.success(`${crop.name} added to your garden!`);
      setIsInGarden(true); // Update state to reflect that the crop is now in the garden
      if (onSelect) {
        onSelect(); // Trigger any additional logic after adding the crop
      }
    } catch (error) {
      console.error('Error adding crop to garden:', error);
      toast.error(error.message || 'Failed to add crop to garden. Please try again.');
    }
  };

  return (
    <Card className={`h-full border-pocketfarm-secondary/30 transition-all hover:shadow-md ${selected ? 'ring-2 ring-pocketfarm-primary' : ''}`}>
      {/* Crop Image */}
      <div className="aspect-video w-full overflow-hidden rounded-t-lg">
        <img 
          src={crop.imageURL}
          alt={crop.name}
          className="w-full h-full object-cover transition-transform hover:scale-105"
        />
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-pocketfarm-primary">{crop.name}</CardTitle>
        <CardDescription className="text-xs italic">{crop.scientific_name}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 pb-2">
        {/* Essential Crop Details */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1 bg-pocketfarm-light">
            <Sun className="h-3 w-3 text-pocketfarm-accent" />
            {crop.sunlight} Sun
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 bg-pocketfarm-light">
            <Droplets className="h-3 w-3 text-blue-500" />
            {crop.waterNeeds} Water
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 bg-pocketfarm-light">
            <Clock className="h-3 w-3 text-pocketfarm-gray" />
            {crop.growing_conditions}
          </Badge>
        </div>

        <p className="text-sm line-clamp-3">{crop.description}</p>

        <div className="flex items-center gap-1 text-xs text-pocketfarm-gray">
          <CalendarDays className="h-3 w-3" />
          <span>Harvest: {crop.planting_info}</span>
        </div>

        {crop.companionCrops && crop.companionCrops.length > 0 && (
          <div className="text-xs">
            <span className="font-medium">Companion plants: </span>
            {crop.companionCrops.join(', ')}
          </div>
        )}

        {/* Show More Details */}
        <Button
          variant="ghost"
          className="mt-2 text-pocketfarm-primary flex items-center gap-1 text-sm"
          onClick={() => setShowMore(!showMore)}
        >
          {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showMore ? "Show Less" : "Show More"}
        </Button>

        {showMore && (
          <div className="mt-3 p-2 bg-gray-100 rounded-lg text-xs space-y-2">
            <p><b>Origin:</b> {crop.origin}</p>
            <p><b>Care Instructions:</b> {crop.care_instructions}</p>
            <p><b>Storage Info:</b> {crop.storage_info}</p>
            <p><b>Nutritional Info:</b> {crop.nutritional_info}</p>
            <p><b>Culinary Uses:</b> {crop.culinary_info}</p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {isInGarden ? (
          <Button 
            variant="outline"
            className="w-full border-pocketfarm-primary text-pocketfarm-primary"
            disabled
          >
            Already in Garden
          </Button>
        ) : (
          <Button 
            className="w-full bg-pocketfarm-primary hover:bg-pocketfarm-dark"
            onClick={handleAddToGarden}
          >
            Add to My Garden
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default CropCard;