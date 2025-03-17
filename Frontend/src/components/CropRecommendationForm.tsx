
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserLocation } from '@/utils/locationUtils';
import { Sun, Droplets, Maximize, SproutIcon } from 'lucide-react';
import { GrowingConditions } from '@/utils/types/cropTypes';
import { toast } from 'sonner';

interface CropRecommendationFormProps {
  onSubmit: (conditions: GrowingConditions) => void;
}

const CropRecommendationForm: React.FC<CropRecommendationFormProps> = ({ onSubmit }) => {
  const navigate = useNavigate();
  const location = getUserLocation();
  
  const [sunlight, setSunlight] = useState<'Full' | 'Partial'>('Full');
  const [waterNeeds, setWaterNeeds] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [area, setArea] = useState<number>(10);
  const [wantCompanion, setWantCompanion] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!location) {
      toast.error('Location information is required for recommendations');
      setIsSubmitting(false);
      return;
    }
    
    const conditions: GrowingConditions = {
      sunlight,
      waterNeeds,
      area,
      wantCompanion,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city
      }
    };
    
    onSubmit(conditions);
  };

  return (
    <Card className="w-full border-pocketfarm-secondary/30">
      <CardHeader>
        <CardTitle className="text-xl text-pocketfarm-primary flex items-center gap-2">
          <SproutIcon className="h-5 w-5" />
          Find Your Perfect Crops
        </CardTitle>
        <CardDescription>
          Tell us about your growing conditions and we'll recommend crops that will thrive
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Sun className="h-4 w-4 text-pocketfarm-accent" />
              Sunlight Availability
            </Label>
            <RadioGroup defaultValue={sunlight} onValueChange={(value) => setSunlight(value as 'Full' | 'Partial')} className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Full" id="sunlight-full" />
                <Label htmlFor="sunlight-full" className="font-normal">Full Sun (6+ hours of direct sunlight)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Partial" id="sunlight-partial" />
                <Label htmlFor="sunlight-partial" className="font-normal">Partial Sun (3-6 hours of direct sunlight)</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              Water Availability
            </Label>
            <RadioGroup defaultValue={waterNeeds} onValueChange={(value) => setWaterNeeds(value as 'Low' | 'Medium' | 'High')} className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Low" id="water-low" />
                <Label htmlFor="water-low" className="font-normal">Low (Drought-tolerant plants)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Medium" id="water-medium" />
                <Label htmlFor="water-medium" className="font-normal">Medium (Regular watering)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="High" id="water-high" />
                <Label htmlFor="water-high" className="font-normal">High (Frequent watering)</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="area" className="text-base font-medium flex items-center gap-2">
              <Maximize className="h-4 w-4 text-pocketfarm-gray" />
              Growing Area (square feet)
            </Label>
            <Input
              id="area"
              type="number"
              min="1"
              value={area}
              onChange={(e) => setArea(Number(e.target.value))}
              className="pocketfarm-input"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="companion" 
              checked={wantCompanion}
              onCheckedChange={setWantCompanion}
            />
            <Label htmlFor="companion" className="text-base">I'm interested in companion planting</Label>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit}
          className="w-full bg-pocketfarm-primary hover:bg-pocketfarm-dark"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Finding crops...' : 'Get Crop Recommendations'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CropRecommendationForm;
