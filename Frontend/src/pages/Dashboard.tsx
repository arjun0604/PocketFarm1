import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Search, MapPin, LogOut, Bell, ChevronRight, Droplets, CloudRain, Sun, RefreshCw } from 'lucide-react';
import { getUserLocation, requestLocationPermission, saveUserLocation, Location } from '@/utils/locationUtils';
import { getUserCropDetails, Crop } from '@/utils/cropUtils';
import { toast } from 'sonner';

const Dashboard: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [userCrops, setUserCrops] = useState<Crop[]>([]);
  const [weatherInfo, setWeatherInfo] = useState<{ temp: number; condition: string }>({ temp: 0, condition: '' });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    // Get user crops
    const crops = getUserCropDetails();
    setUserCrops(crops);

    // Mock weather data
    setWeatherInfo({
      temp: Math.floor(Math.random() * 15) + 15,
      condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
    });

    // Request notification permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    // Mock notification
    const timer = setTimeout(() => {
      if (crops.length > 0 && Notification.permission === 'granted') {
        toast.info(`Watering reminder for ${crops[0].name}`, {
          description: `${crops[0].name} needs water today! They have ${crops[0].waterNeeds.toLowerCase()} water needs.`,
        });
      }
    }, 5000);

    loadUserLocation();

    return () => clearTimeout(timer);
  }, []);

  const loadUserLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const location = await requestLocationPermission(); // Uses cached location if available
      setUserLocation(location);
    } catch (error) {
      console.error('[Dashboard] Error getting location:', error);
      // Use fallback if no location is retrieved
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
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const refreshLocation = async () => {
    setIsLoadingLocation(true);
    toast.info('Refreshing your location...');
    try {
      const location = await requestLocationPermission();
      setUserLocation(location);
      toast.success('Location refreshed successfully');
    } catch (error) {
      console.error('[Dashboard] Error refreshing location:', error);
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
    } finally {
      setIsLoadingLocation(false);
    }
  };

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
            <Link to="/crop-library">
              <Button variant="link" className="text-pocketfarm-primary p-0 h-auto">
                View all crops <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          {userCrops.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {userCrops.slice(0, 3).map((crop) => (
                <Card key={crop.id} className="border-pocketfarm-secondary/30">
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                    <img src={crop.image} alt={crop.name} className="w-full h-full object-cover" />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{crop.name}</CardTitle>
                    <CardDescription className="text-xs italic">{crop.scientificName}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="outline" className="flex items-center gap-1 bg-pocketfarm-light">
                        <Sun className="h-3 w-3 text-pocketfarm-accent" />
                        {crop.sunlight} Sun
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1 bg-pocketfarm-light">
                        <Droplets className="h-3 w-3 text-blue-500" />
                        {crop.waterNeeds} Water
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-pocketfarm-primary text-pocketfarm-primary mt-2"
                      onClick={scheduleNotification}
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      Set watering reminder
                    </Button>
                  </CardContent>
                </Card>
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