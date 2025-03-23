import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Search, MapPin, Droplets, User, Phone, Mail, MapPinIcon, History, Trophy } from 'lucide-react';
import { getUserLocation } from '@/utils/locationUtils';
import { toast } from 'sonner';
import { useGarden } from '@/context/GardenContext';
import BottomNavigation from '@/components/BottomNavigation';
import { Crop } from '@/utils/types/cropTypes';
import axios from 'axios';
import { format } from 'date-fns';
import Header from '@/components/Header';

interface CompletedCrop extends Crop {
  completedDate: string;
}

const UserProfile: React.FC = () => {
  const { user, isAuthenticated, updateUserProfile, logout } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { userCrops } = useGarden();
  const [cropDetails, setCropDetails] = useState<Crop[]>([]);
  const [completedCrops, setCompletedCrops] = useState<CompletedCrop[]>([]);
  const location = getUserLocation();
  
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    const fetchCropDetails = async () => {
      try {
        const cropDetailsPromises = userCrops.map(async (cropName) => {
          const response = await axios.get(`http://127.0.0.1:5000/crop/${encodeURIComponent(cropName)}`);
          return response.data;
        });

        const crops = await Promise.all(cropDetailsPromises);
        setCropDetails(crops);

        // Check for completed crops
        const completedCropsPromises = crops.map(async (crop) => {
          try {
            const scheduleResponse = await axios.get(`http://127.0.0.1:5000/user_schedule/${user?.id}/${crop.name}`);
            const schedule = scheduleResponse.data;
            
            if (schedule && schedule.last_watered) {
              const lastWateredDate = new Date(schedule.last_watered);
              const growingTime = crop.recommended_info['Avg Area'] * 7; // Convert area to days
              const completionDate = new Date(lastWateredDate.getTime() + growingTime * 24 * 60 * 60 * 1000);
              
              if (completionDate < new Date()) {
                return {
                  ...crop,
                  completedDate: completionDate.toISOString()
                };
              }
            }
            return null;
          } catch (error) {
            console.error(`Error checking completion for ${crop.name}:`, error);
            return null;
          }
        });

        const completed = (await Promise.all(completedCropsPromises)).filter((crop): crop is CompletedCrop => crop !== null);
        setCompletedCrops(completed);

        // Show celebration message for newly completed crops
        const newCompletedCrops = completed.filter(crop => {
          const completionDate = new Date(crop.completedDate);
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return completionDate > oneDayAgo;
        });

        if (newCompletedCrops.length > 0) {
          toast.success(
            `🎉 Congratulations! Your ${newCompletedCrops.map(crop => crop.name).join(', ')} ${newCompletedCrops.length === 1 ? 'has' : 'have'} finished growing!`,
            {
              duration: 5000,
            }
          );
        }
      } catch (error) {
        console.error('Error fetching crop details:', error);
        toast.error('Failed to load crop details. Please try again.');
      }
    };

    if (userCrops.length > 0) {
      fetchCropDetails();
    }
  }, [userCrops, user?.id]);
  
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }
  
  const handleSaveProfile = () => {
    updateUserProfile({
      name,
      email,
      phone
    });
    
    setIsEditing(false);
    toast.success('Profile updated successfully');
  };
  
  const handleLogout = () => {
    logout();
    toast.info('You have been logged out');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Header title="User Profile" />
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6">
          <Card className="border-pocketfarm-secondary/30">
            <CardHeader>
              <CardTitle className="text-xl text-pocketfarm-primary flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Profile
              </CardTitle>
              <CardDescription>
                Manage your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-pocketfarm-gray mt-0.5" />
                    <div>
                      <h3 className="font-medium">Name</h3>
                      <p>{user?.name || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-pocketfarm-gray mt-0.5" />
                    <div>
                      <h3 className="font-medium">Email</h3>
                      <p>{user?.email || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-pocketfarm-gray mt-0.5" />
                    <div>
                      <h3 className="font-medium">Phone</h3>
                      <p>{user?.phone || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="h-5 w-5 text-pocketfarm-gray mt-0.5" />
                    <div>
                      <h3 className="font-medium">Location</h3>
                      <p>
                        {location?.city ? (
                          `${location.city}, ${location.state}, ${location.country}`
                        ) : (
                          'Location not available'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {isEditing ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-pocketfarm-primary hover:bg-pocketfarm-dark"
                    onClick={handleSaveProfile}
                  >
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                  <Button 
                    className="bg-pocketfarm-primary hover:bg-pocketfarm-dark"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
          
          <Card className="border-pocketfarm-secondary/30">
            <CardHeader>
              <CardTitle className="text-xl text-pocketfarm-primary flex items-center gap-2">
                <History className="h-5 w-5" />
                Crop History
              </CardTitle>
              <CardDescription>
                Your successfully harvested crops
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedCrops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedCrops.map((crop) => (
                    <div key={crop.id} className="flex items-center gap-3 p-3 border rounded-md bg-green-50">
                      <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{crop.name}</h3>
                        <p className="text-sm text-green-600">
                          Harvested on {format(new Date(crop.completedDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="mb-2">No completed crops yet</p>
                  <p className="text-sm text-pocketfarm-gray mb-4">Your crops will appear here once they're ready to harvest</p>
                  <Button asChild>
                    <Link to="/crop-library">Browse Crops</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* My Garden */}
          <Card>
            <CardHeader>
              <CardTitle>My Garden</CardTitle>
              <CardDescription>Your current garden crops</CardDescription>
            </CardHeader>
            <CardContent>
              {cropDetails.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cropDetails.map((crop) => (
                    <div key={crop.id} className="flex items-center space-x-2">
                      <img
                        src={crop.imageURL}
                        alt={crop.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-medium">{crop.name}</h3>
                        <p className="text-sm text-pocketfarm-gray">
                          {crop.waterNeeds} water • {crop.sunlight} sun
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-pocketfarm-gray">No crops in your garden yet</p>
              )}
            </CardContent>
            <CardFooter>
              <Link to="/my-garden" className="w-full">
                <Button className="w-full">View Full Garden</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
};

export default UserProfile;