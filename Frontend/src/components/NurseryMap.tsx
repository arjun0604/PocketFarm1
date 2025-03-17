import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Globe, Star, Navigation, AlertCircle, RefreshCw } from 'lucide-react';
import { requestLocationPermission, saveUserLocation, clearStoredLocation } from '@/utils/locationUtils';
import { Nursery } from '@/utils/types/cropTypes';
import { fetchNearbyNurseries } from '@/utils/api/nurseryApi';
import { toast } from 'sonner';

interface NurseryMapProps {
  location?: { latitude: number, longitude: number } | null;
}

const NurseryMap: React.FC<NurseryMapProps> = ({ location }) => {
  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'nursery' | 'store'>('all');
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(location || null);

  const fetchNurseries = useCallback(async (latitude: number, longitude: number) => {
    setIsLoading(true);
    try {
      toast.info('Finding nearby nurseries and garden supplies...');
      const nearbyNurseries = await fetchNearbyNurseries(latitude, longitude);

      // Process nurseries to ensure proper categorization
      const processedNurseries = nearbyNurseries.map(nursery => {
        const name = nursery.name.toLowerCase();
        const isNurseryByName = name.includes('nursery') || name.includes('garden') || name.includes('plant') || name.includes('farm');
        const nurseryType: 'nursery' | 'store' = isNurseryByName ? 'nursery' : 'store';

        return {
          ...nursery,
          type: nurseryType
        };
      });

      if (processedNurseries.length === 0) {
        toast.warning('No nearby nurseries found. Try expanding your search area.');
      } else {
        toast.success(`Found ${processedNurseries.length} plant nurseries and supply stores near you!`);
      }

      setNurseries(processedNurseries);
      console.log('Updated nurseries list:', processedNurseries);
    } catch (error) {
      console.error('Error fetching nurseries:', error);
      toast.error('Failed to load nearby nurseries');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    setIsLoading(true);
    try {
      clearStoredLocation();
      toast.info('Updating your location...');

      const newLocation = await requestLocationPermission();
      console.log('New location obtained:', newLocation);

      setUserLocation({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude
      });

      saveUserLocation(newLocation);
      await fetchNurseries(newLocation.latitude, newLocation.longitude);

      toast.success(`Location updated to ${newLocation.city || 'your current location'}`);
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Failed to update location');
      setIsLoading(false);
    }
  }, [fetchNurseries]);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        if (!location) {
          const newLocation = await requestLocationPermission();
          setUserLocation({
            latitude: newLocation.latitude,
            longitude: newLocation.longitude
          });
          saveUserLocation(newLocation);
          fetchNurseries(newLocation.latitude, newLocation.longitude);
        } else {
          fetchNurseries(location.latitude, location.longitude);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        toast.error('Location access is required to find nearby nurseries');
        setIsLoading(false);
      }
    };

    fetchLocation();
  }, [location, fetchNurseries]);

  const filteredNurseries = filterType === 'all'
    ? nurseries
    : nurseries.filter(nursery => nursery.type === filterType);

  const openDirections = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const FilterButton: React.FC<{ type: 'all' | 'nursery' | 'store', currentFilter: string, onClick: () => void }> = ({ type, currentFilter, onClick }) => (
    <Button
      variant={currentFilter === type ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className={currentFilter === type ? 'bg-pocketfarm-primary hover:bg-pocketfarm-dark' : ''}
    >
      {type === 'all' ? 'All' : type === 'nursery' ? 'Nurseries' : 'Supplies'}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-pocketfarm-primary">Nearby Plant Nurseries & Supplies</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshLocation}
          className="flex items-center gap-1"
          disabled={isLoading}
          aria-label="Update Location"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Update Location
        </Button>
      </div>

      {userLocation && (
        <div className="bg-gray-100 rounded-md p-3 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-pocketfarm-primary" />
            <span className="text-sm">
              {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
            </span>
          </div>
          <div className="flex gap-2">
            <FilterButton type="all" currentFilter={filterType} onClick={() => setFilterType('all')} />
            <FilterButton type="nursery" currentFilter={filterType} onClick={() => setFilterType('nursery')} />
            <FilterButton type="store" currentFilter={filterType} onClick={() => setFilterType('store')} />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-pocketfarm-primary" />
          <p>Loading nearby nurseries...</p>
        </div>
      ) : !userLocation ? (
        <div className="py-12 text-center bg-yellow-50 rounded-lg">
          <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
          <p className="text-lg font-medium">Location access required</p>
          <p className="mb-4">We need your location to find nurseries near you</p>
          <Button
            onClick={refreshLocation}
            className="bg-pocketfarm-primary hover:bg-pocketfarm-dark"
          >
            Allow Location Access
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNurseries.length > 0 ? (
            filteredNurseries.map((nursery) => (
              <Card key={nursery.id} className="border-pocketfarm-secondary/30 h-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{nursery.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {nursery.address}
                      </CardDescription>
                    </div>
                    <Badge className={nursery.type === 'nursery' ? 'bg-pocketfarm-primary' : 'bg-pocketfarm-accent text-black'}>
                      {nursery.type === 'nursery' ? 'Nursery' : 'Supplies'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">Rating:</span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="ml-1 text-sm">{nursery.rating}</span>
                        </div>
                      </div>
                      <span className="text-sm">{nursery.distance} km away</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {nursery.phone && (
                        <Button variant="outline" size="sm" className="h-8" asChild>
                          <a href={`tel:${nursery.phone}`} className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Call
                          </a>
                        </Button>
                      )}

                      {nursery.website && (
                        <Button variant="outline" size="sm" className="h-8" asChild>
                          <a href={`https://${nursery.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Website
                          </a>
                        </Button>
                      )}

                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 bg-pocketfarm-primary hover:bg-pocketfarm-dark ml-auto"
                        onClick={() => openDirections(nursery.latitude, nursery.longitude)}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Directions
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <p>No {filterType === 'all' ? '' : filterType} locations found nearby.</p>
              <Button
                variant="link"
                onClick={() => setFilterType('all')}
                className="text-pocketfarm-primary"
              >
                Show all locations
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NurseryMap;