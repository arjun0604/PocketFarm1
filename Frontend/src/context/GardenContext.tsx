import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface GardenContextType {
  userCrops: string[];
  addCropToGarden: (cropName: string) => Promise<void>;
  removeCropFromGarden: (cropName: string) => Promise<void>;
}

const GardenContext = createContext<GardenContextType | undefined>(undefined);

export const GardenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userCrops, setUserCrops] = useState<string[]>(() => {
    // Load crops from local storage on initialization
    const savedCrops = localStorage.getItem(`userCrops_${user?.id}`);
    return savedCrops ? JSON.parse(savedCrops) : [];
  });

  // Fetch the user's garden crops when the user changes
  useEffect(() => {
    const fetchUserCrops = async () => {
      if (user?.id) {
        try {
          const response = await fetch('http://127.0.0.1:5000/get_user_crops', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${user?.id}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch user crops');
          }

          const crops = await response.json();
          setUserCrops(crops);
        } catch (error) {
          console.error('Error fetching user crops:', error);
        }
      }
    };

    fetchUserCrops();
  }, [user?.id]);

  // Save crops to local storage whenever they change
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`userCrops_${user?.id}`, JSON.stringify(userCrops));
    }
  }, [userCrops, user?.id]);

  // Clear crops when user logs out
  useEffect(() => {
    if (!user) {
      setUserCrops([]);
      localStorage.removeItem(`userCrops_${user?.id}`);
    }
  }, [user]);

  const addCropToGarden = async (cropName: string) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/add_to_library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`,
        },
        body: JSON.stringify({
          user_id: user?.id,
          crop_name: cropName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add crop to garden');
      }

      setUserCrops((prev) => [...prev, cropName]);
    } catch (error) {
      console.error('Error adding crop to garden:', error);
      throw error;
    }
  };

  const removeCropFromGarden = async (cropName: string) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/remove_from_garden', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`,
        },
        body: JSON.stringify({
          user_id: user?.id,
          crop_name: cropName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove crop from garden');
      }

      setUserCrops((prev) => prev.filter((crop) => crop !== cropName));
    } catch (error) {
      console.error('Error removing crop from garden:', error);
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