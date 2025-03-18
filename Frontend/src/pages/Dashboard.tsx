import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Search, MapPin, LogOut, Bell, ChevronRight, Droplets, CloudRain, Sun, RefreshCw, User } from 'lucide-react';
import { getUserLocation, requestLocationPermission, saveUserLocation, Location } from '@/utils/locationUtils';
import { getUserCropDetails, Crop } from '@/utils/cropUtils';
import { toast } from 'sonner';
import CropCard from '@/components/CropCard';

const Dashboard: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [userCrops, setUserCrops] = useState<Crop[]>([]);
  const [weatherInfo, setWeatherInfo] = useState<{ temp: number; condition: string; icon: string }>({ 
    temp: 0, 
    condition: '', 
    icon: '' 
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Fetch weather data from the backend
  const fetchWeatherData = async (location: string) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();
      setWeatherInfo({
        temp: data.temp,
        condition: data.condition,
        icon: data.icon, // Weather icon code
      });
    } catch (error) {
      console.error('Error fetching weather data:', error);
      toast.error('Failed to fetch weather data. Using default weather info.');
    }
  };

  // Function to refresh the user's location
  const refreshLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const location = await requestLocationPermission();
      setUserLocation(location);

      // Fetch weather data for the user's location
      if (location.city) {
        fetchWeatherData(location.city);
      }
    } catch (error) {
      console.error('[Dashboard] Error refreshing location:', error);
      toast.error('Failed to refresh location. Using cached location.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  useEffect(() => {
    const fetchUserCrops = async () => {
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
        toast.error('Failed to load your garden crops. Please try again.');
      }
    };

    if (isAuthenticated && user?.id) {
      fetchUserCrops();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const loadUserLocation = async () => {
      setIsLoadingLocation(true);
      try {
        const location = await requestLocationPermission();
        setUserLocation(location);

        // Fetch weather data for the user's location
        if (location.city) {
          fetchWeatherData(location.city);
        }
      } catch (error) {
        console.error('[Dashboard] Error getting location:', error);
        const fallbackLocation = {
          latitude: 0,
          longitude: 0,
          city: 'Kochi',
          state: 'Kerala',
          country: 'India',
        };
        saveUserLocation(fallbackLocation);
        setUserLocation(fallbackLocation);
        toast.info('Using default location (Kochi). Some features may be limited.');

        // Fetch weather data for the fallback location
        fetchWeatherData(fallbackLocation.city);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    loadUserLocation();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  const scheduleNotification = () => {
    toast.info('Notification scheduled', {
      description: 'You will be notified about watering times',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-pocketfarm-primary rounded-full p-1">
              <Home className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-medium">PocketFarm</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-pocketfarm-gray" onClick={scheduleNotification}>
              <Bell className="h-5 w-5" />
            </Button>
            <Link to="/profile" className="text-pocketfarm-primary">
              <User className="h-5 w-5" />
            </Link>
            <Button variant="ghost" size="icon" className="text-pocketfarm-gray" onClick={() => logout()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Greeting */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Hello, {user?.name || 'Gardener'}</h2>
            {userLocation ? (
              <div>
                <p className="text-pocketfarm-gray flex items-center mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {userLocation.city || 'Your Location'}{' '}
                  {userLocation.city && (
                    <span className="text-xs ml-1">
                      ({userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)})
                    </span>
                  )}
                </p>
                <Button
                  variant="link"
                  className="text-pocketfarm-gray flex items-center p-0 h-auto mt-1"
                  onClick={refreshLocation}
                  disabled={isLoadingLocation}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {isLoadingLocation ? 'Updating...' : 'Refresh location'}
                </Button>
              </div>
            ) : (
              <p>Loading location...</p>
            )}
          </div>
          <Card className="w-auto border-pocketfarm-secondary/30">
            <CardContent className="p-3 flex items-center gap-2">
              {weatherInfo.condition.includes('Rain') ? (
                <CloudRain className="h-5 w-5 text-blue-500" />
              ) : (
                <Sun className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className="text-sm font-medium">{weatherInfo.temp}°C</p>
                <p className="text-xs text-pocketfarm-gray">{weatherInfo.condition}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/recommendations">
            <Card className="border-pocketfarm-secondary/30 h-full hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="bg-pocketfarm-light rounded-full p-3 mb-3">
                  <Search className="h-6 w-6 text-pocketfarm-primary" />
                </div>
                <h3 className="font-medium">Find Crops</h3>
                <p className="text-sm text-pocketfarm-gray mt-1">Get personalized crop recommendations</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/nursery-finder">
            <Card className="border-pocketfarm-secondary/30 h-full hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="bg-pocketfarm-light rounded-full p-3 mb-3">
                  <MapPin className="h-6 w-6 text-pocketfarm-primary" />
                </div>
                <h3 className="font-medium">Nursery Finder</h3>
                <p className="text-sm text-pocketfarm-gray mt-1">Find nearby nurseries and shops</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* My Garden */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">My Garden</h2>
            <Link to="/user-crops">
              <Button variant="link" className="text-pocketfarm-primary p-0 h-auto">
                View all crops <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          {userCrops.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {userCrops.slice(0, 4).map((crop) => (
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
            <Card className="border-pocketfarm-secondary/30">
              <CardContent className="p-6 text-center">
                <p className="mb-4">You haven't added any crops to your garden yet</p>
                <Link to="/recommendations">
                  <Button className="bg-pocketfarm-primary hover:bg-pocketfarm-dark">
                    Find crops to grow
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick access to crop library */}
        <Link to="/crop-library">
          <Card className="border-pocketfarm-secondary/30 hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <h3 className="font-medium">Crop Library</h3>
                <p className="text-sm text-pocketfarm-gray">Search and browse all available crops</p>
              </div>
              <ChevronRight className="h-5 w-5 text-pocketfarm-gray" />
            </CardContent>
          </Card>
        </Link>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="container mx-auto flex items-center justify-around py-2">
          <Link to="/dashboard" className="flex flex-col items-center p-2 text-pocketfarm-primary">
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
          <Link to="/crop-library" className="flex flex-col items-center p-2 text-pocketfarm-gray">
            <Droplets className="h-5 w-5" />
            <span className="text-xs mt-1">Crops</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;