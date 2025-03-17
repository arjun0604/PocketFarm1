
import { Nursery } from '../types/cropTypes';
import { mockNurseries } from '../data/mockData';
import { getDistance } from '../locationUtils';

// Base URL constant for API calls
const API_BASE_URL = 'http://127.0.0.1:5000';

// Fetch nearby nurseries using Overpass API
export const fetchNearbyNurseries = async (latitude: number, longitude: number): Promise<Nursery[]> => {
  console.log('Fetching nurseries near:', { latitude, longitude });
  
  try {
    // First try our backend API
    console.log('Using API URL for nurseries:', API_BASE_URL);
    
    try {
      // Make a POST request to the nurseries endpoint
      const response = await fetch(`${API_BASE_URL}/nurseries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}: ${await response.text()}`);
      }

      // Parse the JSON response
      const data = await response.json();
      console.log('Received nurseries data from backend:', data);
      return data.nurseries || [];
    } catch (backendError) {
      console.warn('Backend nursery API failed, trying Overpass API:', backendError);
      
      // If backend fails, try Overpass API directly
      return await fetchFromOverpassAPI(latitude, longitude);
    }
  } catch (error) {
    console.error('All nursery API calls failed:', error);
    
    // Final fallback to mock data
    console.log('Using mock nursery data as last resort');
    return [...mockNurseries].map(nursery => {
      const distance = getDistance(latitude, longitude, nursery.latitude, nursery.longitude);
      return { ...nursery, distance: parseFloat(distance.toFixed(1)) };
    }).sort((a, b) => a.distance - b.distance);
  }
};

// Function to fetch from Overpass API
const fetchFromOverpassAPI = async (latitude: number, longitude: number): Promise<Nursery[]> => {
  try {
    console.log('Fetching from Overpass API');
    
    // Search radius in meters
    const radius = 50000; // 50km radius
    
    // Construct the Overpass API query
    // We search only for garden centers, plant nurseries, and fertilizer shops
    const overpassQuery = `
      [out:json];
      (
        node["shop"="garden_centre"](around:${radius},${latitude},${longitude});
        node["shop"="plant_nursery"](around:${radius},${latitude},${longitude});
        node["shop"="agricultural_supplies"](around:${radius},${latitude},${longitude});
        node["shop"="agrarian"](around:${radius},${latitude},${longitude});
        node["amenity"="marketplace"]["plant"](around:${radius},${latitude},${longitude});
      );
      out body;
    `;
    
    // URL encode the query
    const encodedQuery = encodeURIComponent(overpassQuery.trim());
    
    // Overpass API endpoint
    const overpassEndpoint = 'https://overpass-api.de/api/interpreter';
    
    // Make the request
    const response = await fetch(`${overpassEndpoint}?data=${encodedQuery}`);
    
    if (!response.ok) {
      throw new Error(`Overpass API returned status ${response.status}`);
    }
    
    // Parse the JSON response
    const data = await response.json();
    console.log('Overpass API response:', data);
    
    if (!data.elements || data.elements.length === 0) {
      console.log('No nurseries found in Overpass API response');
      return [];
    }
    
    // Transform Overpass results to our Nursery format
    const nurseries: Nursery[] = data.elements.map((place: any, index: number) => {
      // Calculate distance using our utility
      const distance = getDistance(latitude, longitude, place.lat, place.lon);
      
      // Determine if it's a nursery or agricultural store based on tags and name
      const tags = place.tags || {};
      const name = tags.name || tags['name:en'] || 'Garden Center';
      const lowerName = name.toLowerCase();
      
      // Check if it's a nursery based on name keywords or tags
      const isNursery = tags.shop === 'plant_nursery' || 
                      (tags.amenity === 'marketplace' && tags.plant) ||
                      lowerName.includes('nursery') ||
                      lowerName.includes('garden') ||
                      lowerName.includes('plant') ||
                      lowerName.includes('farm');
      
      // Skip florist shops
      if (tags.shop === 'florist') {
        return null;
      }
      
      // Get the address components
      const street = tags['addr:street'] || '';
      const housenumber = tags['addr:housenumber'] || '';
      const city = tags['addr:city'] || '';
      const address = [housenumber, street, city].filter(Boolean).join(', ') || 'Address unavailable';
      
      // Get the website - remove http/https if present for consistent formatting
      let website = tags.website || '';
      if (website && (website.startsWith('http://') || website.startsWith('https://'))) {
        website = website.replace(/^https?:\/\//, '');
      }
      
      // Use the literal type instead of a generic string
      const nurseryType: 'nursery' | 'store' = isNursery ? 'nursery' : 'store';
      
      return {
        id: `overpass-${place.id || index}`,
        name: name,
        type: nurseryType,
        address: address,
        distance: parseFloat(distance.toFixed(1)),
        rating: tags.rating ? parseFloat(tags.rating) : 0,
        phone: tags.phone || '',
        website: website,
        latitude: place.lat,
        longitude: place.lon
      };
    }).filter(Boolean); // Remove null entries (florists)
    
    // Sort by distance
    return nurseries.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error fetching from Overpass API:', error);
    throw error; // Re-throw to be caught by the outer try/catch
  }
};
