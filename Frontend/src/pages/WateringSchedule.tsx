import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useGarden } from '@/context/GardenContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sun, Droplets, Clock, CalendarDays, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Crop } from '@/utils/types/cropTypes';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Calendar } from '@/components/ui/calendar';
import BottomNavigation from '@/components/BottomNavigation';

interface UserCropSchedule {
  id: number;
  name: string;
  imageURL: string;
  last_watered: string | null;
  next_watering: string;
  growing_time: number;
  watering_frequency: number;
  fertilization_schedule: number;
}

interface Notification {
  id: number;
  message: string;
  timestamp: string;
  read: boolean;
}

const WateringSchedule: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { userCrops } = useGarden();
  const [selectedCrop, setSelectedCrop] = useState<UserCropSchedule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const queryClient = useQueryClient();

  // Fetch user's crop schedules
  const { data: cropSchedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['userCropSchedules', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await axios.get(`http://127.0.0.1:5000/user_schedule/${Number(user.id)}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching schedules:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch notifications
  const { data: userNotifications } = useQuery({
    queryKey: ['userNotifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await axios.get(`http://127.0.0.1:5000/notifications/${Number(user.id)}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Mutation for updating watering status
  const updateWateringMutation = useMutation({
    mutationFn: async ({ user_id, crop_name }: { user_id: number; crop_name: string }) => {
      const response = await axios.post('http://127.0.0.1:5000/update_watering', {
        user_id,
        crop_name,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCropSchedules', user?.id] });
      toast.success(
        `🎉 Great job! You've watered your ${selectedCrop?.name} today! Keep up the good work! 🌱`,
        {
          duration: 5000,
        }
      );
    },
    onError: (error) => {
      toast.error('Failed to update watering status');
      console.error('Error updating watering:', error);
    }
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (userNotifications) {
      setNotifications(userNotifications);
    }
  }, [userNotifications]);

  const hasBeenWateredToday = (crop: UserCropSchedule) => {
    if (!crop.last_watered) return false;
    return isSameDay(parseISO(crop.last_watered), new Date());
  };

  const getWateringDates = (crop: UserCropSchedule) => {
    const dates: Date[] = [];
    const startDate = crop.last_watered ? parseISO(crop.last_watered) : new Date();
    const endDate = addDays(startDate, crop.growing_time);

    let currentDate = startDate;
    while (currentDate <= endDate) {
      dates.push(currentDate);
      currentDate = addDays(currentDate, crop.watering_frequency);
    }
    return dates;
  };

  const getFertilizationDates = (crop: UserCropSchedule) => {
    const dates: Date[] = [];
    const startDate = crop.last_watered ? parseISO(crop.last_watered) : new Date();
    const endDate = addDays(startDate, crop.growing_time);

    let currentDate = startDate;
    while (currentDate <= endDate) {
      dates.push(currentDate);
      currentDate = addDays(currentDate, crop.fertilization_schedule);
    }
    return dates;
  };

  const handleWateringResponse = async () => {
    if (!selectedCrop || !user?.id) return;

    try {
      await updateWateringMutation.mutateAsync({
        user_id: Number(user.id),
        crop_name: selectedCrop.name,
      });
    } catch (error) {
      console.error('Error updating watering status:', error);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Watering Schedule" 
        showBackButton 
        onBackClick={() => navigate('/garden')}
        notifications={notifications}
      />
      
      <main className="container mx-auto px-4 py-8">
        {isLoadingSchedules ? (
          <div className="text-center py-12">
            <p>Loading your watering schedule...</p>
          </div>
        ) : cropSchedules && cropSchedules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {cropSchedules.map((crop: UserCropSchedule) => (
              <Card key={crop.id} className="border-pocketfarm-secondary/30">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-pocketfarm-primary">{crop.name}</CardTitle>
                  <CardDescription>
                    Last watered: {crop.last_watered ? format(parseISO(crop.last_watered), 'MMM dd, yyyy') : 'Never'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span>Next watering: {format(parseISO(crop.next_watering), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-green-500" />
                      <span>Growing time: {crop.growing_time} days</span>
                    </div>
                  </div>
                </CardContent>
                <div className="p-4 pt-0">
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedCrop(crop);
                      setIsDialogOpen(true);
                    }}
                  >
                    View Schedule
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="mb-4">No crops in your garden yet</p>
            <Button onClick={() => navigate('/recommendations')}>Find Crops to Grow</Button>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedCrop?.name} Schedule</DialogTitle>
              <DialogDescription>
                View and manage the watering schedule for {selectedCrop?.name}.
              </DialogDescription>
            </DialogHeader>
            
            {selectedCrop && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Growing Time</h4>
                    <p>{selectedCrop.growing_time} days</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Watering Frequency</h4>
                    <p>Every {selectedCrop.watering_frequency} days</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Fertilization Schedule</h4>
                    <p>Every {selectedCrop.fertilization_schedule} days</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Next Watering</h4>
                    <p>{format(parseISO(selectedCrop.next_watering), 'MMM dd, yyyy')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-4 bg-white">
                    <h4 className="font-semibold mb-4 text-center">Calendar</h4>
                    <Calendar
                      mode="single"
                      selected={parseISO(selectedCrop.next_watering)}
                      modifiers={{
                        watering: getWateringDates(selectedCrop),
                        fertilization: getFertilizationDates(selectedCrop),
                      }}
                      modifiersStyles={{
                        watering: { backgroundColor: '#e0f2fe', color: '#0369a1' },
                        fertilization: { backgroundColor: '#fae8ff', color: '#7e22ce' },
                      }}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Growing Timeline</h4>
                      <div className="space-y-2">
                        <p>• Plant started: {selectedCrop.last_watered ? format(parseISO(selectedCrop.last_watered), 'MMM dd, yyyy') : 'Not started'}</p>
                        <p>• Next watering: {format(parseISO(selectedCrop.next_watering), 'MMM dd, yyyy')}</p>
                        <p>• Expected harvest: {selectedCrop.last_watered ? format(addDays(parseISO(selectedCrop.last_watered), selectedCrop.growing_time), 'MMM dd, yyyy') : 'Not started'}</p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={handleWateringResponse} 
                        className="w-full"
                        disabled={updateWateringMutation.isPending || hasBeenWateredToday(selectedCrop)}
                      >
                        <Droplets className="h-4 w-4 mr-2" />
                        {updateWateringMutation.isPending 
                          ? 'Updating...' 
                          : hasBeenWateredToday(selectedCrop)
                            ? 'Already Watered Today'
                            : 'Mark as Watered'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default WateringSchedule; 