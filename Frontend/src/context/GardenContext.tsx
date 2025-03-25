import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

interface GardenContextType {
  userCrops: string[];
  addCropToGarden: (cropName: string) => Promise<void>;
  removeCropFromGarden: (cropName: string) => Promise<void>;
}

const GardenContext = createContext<GardenContextType | undefined>(undefined);

export const GardenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userCrops, setUserCrops] = useState<string[]>([]);

  // Fetch the user's garden crops when the user changes
  useEffect(() => {
    const fetchUserCrops = async () => {
      if (user?.id) {
        try {
          const response = await axios.get('https://pocketfarm1.onrender.com/get_user_crops', {
            headers: {
              'Authorization': `Bearer ${user.id}`,
            },
          });

          const crops = response.data;
          setUserCrops(crops);
          
          // Create schedules for all crops
          for (const crop of crops) {
            try {
              await axios.post('https://pocketfarm1.onrender.com/user_schedule', {
                user_id: Number(user.id),
                crop_name: crop,
              });
            } catch (error) {
              console.error(`Error creating schedule for ${crop}:`, error);
              // Don't show error toast for schedule creation as it's not critical
            }
          }
        } catch (error) {
          console.error('Error fetching user crops:', error);
          toast.error('Failed to load your garden');
        }
      }
    };

    fetchUserCrops();
  }, [user?.id]);

  const addCropToGarden = async (cropName: string) => {
    if (!user?.id) {
      toast.error('Please log in to add crops to your garden');
      return;
    }

    try {
      // Add crop to garden
      const response = await axios.post('https://pocketfarm1.onrender.com/add_to_library', {
        user_id: Number(user.id),
        crop_name: cropName,
      });

      if (response.status === 200) {
        // Create schedule for the new crop
        try {
          await axios.post('https://pocketfarm1.onrender.com/user_schedule', {
            user_id: Number(user.id),
            crop_name: cropName,
          });
        } catch (error) {
          console.error(`Error creating schedule for ${cropName}:`, error);
          // Don't show error toast for schedule creation as it's not critical
        }

        // Update the local state
        setUserCrops((prev) => [...prev, cropName]);
        toast.success(`${cropName} added to your garden!`);
      }
    } catch (error: any) {
      console.error('Error adding crop to garden:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add crop to your garden';
      toast.error(errorMessage);
      throw error;
    }
  };

  const removeCropFromGarden = async (cropName: string) => {
    if (!user?.id) {
      toast.error('Please log in to remove crops from your garden');
      return;
    }

    try {
      // Remove crop from garden
      const response = await axios.post('https://pocketfarm1.onrender.com/remove_from_garden', {
        user_id: Number(user.id),
        crop_name: cropName,
      });

      if (response.status === 200) {
        // Try to delete schedule for the removed crop, but don't fail if it doesn't exist
        try {
          await axios.delete(`https://pocketfarm1.onrender.com/user_schedule/${Number(user.id)}/${cropName}`);
        } catch (error: any) {
          // Only log the error if it's not a 404 (schedule not found)
          if (error.response?.status !== 404) {
            console.error(`Error deleting schedule for ${cropName}:`, error);
          }
        }

        // Update the local state
        setUserCrops((prev) => prev.filter((crop) => crop !== cropName));
        toast.success(`${cropName} removed from your garden!`);
      }
    } catch (error: any) {
      console.error('Error removing crop from garden:', error);
      const errorMessage = error.response?.data?.error || 'Failed to remove crop from your garden';
      toast.error(errorMessage);
      throw error;
    }
  };

  return (
    <GardenContext.Provider value={{ userCrops, addCropToGarden, removeCropFromGarden }}>
      {children}
    </GardenContext.Provider>
  );
};

export const useGarden = () => {
  const context = useContext(GardenContext);
  if (!context) {
    throw new Error('useGarden must be used within a GardenProvider');
  }
  return context;
};