
import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Search, MapPin, Droplets, User, Phone, Mail, MapPinIcon, History } from 'lucide-react';
import { getUserLocation } from '@/utils/locationUtils';
import { getUserCropDetails } from '@/utils/storage/cropStorage';
import { toast } from 'sonner';

const UserProfile: React.FC = () => {
  const { user, isAuthenticated, updateUserProfile, logout } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCrops, setSelectedCrops] = useState(getUserCropDetails());
  const location = getUserLocation();
  
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
    }
  }, [user]);
  
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
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-lg font-medium">User Profile</h1>
        </div>
      </header>
      
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
                Crops you've selected or are growing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCrops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCrops.map(crop => (
                    <div key={crop.id} className="flex items-center gap-3 p-3 border rounded-md">
                      <div className="h-10 w-10 bg-pocketfarm-light rounded-full flex items-center justify-center">
                        <Droplets className="h-5 w-5 text-pocketfarm-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{crop.name}</h3>
                        <p className="text-sm text-pocketfarm-gray">{crop.waterNeeds} water needs, {crop.sunlight} sun</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="mb-2">You haven't selected any crops yet</p>
                  <Button asChild>
                    <Link to="/crop-library">Browse Crops</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Bottom nav */}
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
          <Link to="/crop-library" className="flex flex-col items-center p-2 text-pocketfarm-gray">
            <Droplets className="h-5 w-5" />
            <span className="text-xs mt-1">Crops</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default UserProfile;
