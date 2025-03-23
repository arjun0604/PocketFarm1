import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sprout, 
  Droplets, 
  Sun, 
  Thermometer, 
  Shield, 
  Leaf, 
  Info,
  ShoppingCart,
  MapPin,
  Clock,
  Phone,
  Globe,
  Star,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

interface Nursery {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  rating: number;
  total_ratings: number;
  phone: string;
  website: string;
  hours: string[];
  reviews: any[];
}

const Nursery = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNearbyNurseries = async () => {
      if (!user?.location?.latitude || !user?.location?.longitude) {
        setError('Location information not available');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('http://127.0.0.1:5000/nearby-nurseries', {
          params: {
            latitude: user.location.latitude,
            longitude: user.location.longitude,
            radius: 10000 // 10km radius
          }
        });
        setNurseries(response.data);
      } catch (err) {
        setError('Failed to fetch nearby nurseries');
        console.error('Error fetching nurseries:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyNurseries();
  }, [user]);

  const nurseryTips = [
    {
      title: "Seed Starting",
      description: "Learn how to start seeds indoors for better germination rates and earlier harvests.",
      icon: Sprout,
      tips: [
        "Use sterile seed starting mix",
        "Maintain consistent moisture",
        "Provide adequate light",
        "Keep temperature between 65-75°F"
      ]
    },
    {
      title: "Watering",
      description: "Proper watering techniques for young plants and seedlings.",
      icon: Droplets,
      tips: [
        "Water from the bottom",
        "Use room temperature water",
        "Avoid overwatering",
        "Check soil moisture daily"
      ]
    },
    {
      title: "Light Requirements",
      description: "Understanding light needs for different plant stages.",
      icon: Sun,
      tips: [
        "Provide 14-16 hours of light",
        "Use grow lights if needed",
        "Rotate plants regularly",
        "Monitor for leggy growth"
      ]
    },
    {
      title: "Temperature Control",
      description: "Maintaining optimal temperatures for plant growth.",
      icon: Thermometer,
      tips: [
        "Use heat mats for germination",
        "Monitor room temperature",
        "Protect from drafts",
        "Ventilate when needed"
      ]
    },
    {
      title: "Disease Prevention",
      description: "Keeping your nursery plants healthy and disease-free.",
      icon: Shield,
      tips: [
        "Use clean containers",
        "Practice good hygiene",
        "Monitor for pests",
        "Provide good air circulation"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Nursery Guide" 
        showBackButton 
        onBackClick={() => navigate(-1)}
      />
      
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="tips" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="tips">Care Tips</TabsTrigger>
            <TabsTrigger value="nurseries">Nearby Nurseries</TabsTrigger>
          </TabsList>

          <TabsContent value="tips" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5" />
                  Essential Nursery Care Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {nurseryTips.map((tip, index) => (
                    <Card key={index} className="bg-white">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <tip.icon className="h-5 w-5 text-pocketfarm-primary" />
                          {tip.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">{tip.description}</p>
                        <ul className="space-y-2">
                          {tip.tips.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-pocketfarm-primary">•</span>
                              <span className="text-sm">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nurseries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Nurseries Near You
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-pocketfarm-primary" />
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-red-500">
                    {error}
                  </div>
                ) : nurseries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No nurseries found in your area
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {nurseries.map((nursery) => (
                      <Card key={nursery.id} className="bg-white">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{nursery.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1 text-yellow-500">
                                  <Star className="h-4 w-4 fill-current" />
                                  <span className="text-sm">{nursery.rating.toFixed(1)}</span>
                                </div>
                                <span className="text-sm text-gray-600">
                                  ({nursery.total_ratings} reviews)
                                </span>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(nursery.website, '_blank')}
                            >
                              <Globe className="h-4 w-4 mr-2" />
                              Visit
                            </Button>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {nursery.address}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {nursery.hours[0] || 'Hours not available'}
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {nursery.phone}
                            </div>
                          </div>

                          {nursery.reviews.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium mb-2">Recent Reviews:</h4>
                              <div className="space-y-2">
                                {nursery.reviews.slice(0, 2).map((review, index) => (
                                  <div key={index} className="text-sm">
                                    <div className="flex items-center gap-1 text-yellow-500 mb-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star 
                                          key={i} 
                                          className={`h-3 w-3 ${i < review.rating ? 'fill-current' : ''}`}
                                        />
                                      ))}
                                    </div>
                                    <p className="text-gray-600">{review.text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Additional Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/recommendations')}
              >
                Get Personalized Plant Recommendations
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/watering-schedule')}
              >
                View Watering Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Nursery; 