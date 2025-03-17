import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sun, Droplets, Clock, CalendarDays, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Crop } from '@/utils/types/cropTypes';
import { saveCropSelection } from '@/utils/storage/cropStorage';
import { toast } from 'sonner';

interface CropCardProps {
  crop: Crop;
  onSelect?: () => void;
  selected?: boolean;
}

const CropCard: React.FC<CropCardProps> = ({ crop, onSelect, selected = false }) => {
  const [showMore, setShowMore] = useState(false);

  const handleSelect = () => {
    saveCropSelection(crop.id);
    toast.success(`Added ${crop.name} to your garden`);
    if (onSelect) {
      onSelect();
    }
  };

  return (
    <Card className={`h-full border-pocketfarm-secondary/30 transition-all hover:shadow-md ${selected ? 'ring-2 ring-pocketfarm-primary' : ''}`}>
      {/* Crop Image */}
      <div className="aspect-video w-full overflow-hidden rounded-t-lg">
        <img 
          src={crop.imageURL}
          alt={crop.name}
          className="w-full h-full object-cover transition-transform hover:scale-105"
        />
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-pocketfarm-primary">{crop.name}</CardTitle>
        <CardDescription className="text-xs italic">{crop.scientific_name}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 pb-2">
        {/* Essential Crop Details */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1 bg-pocketfarm-light">
            <Sun className="h-3 w-3 text-pocketfarm-accent" />
            {crop.sunlight} Sun
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 bg-pocketfarm-light">
            <Droplets className="h-3 w-3 text-blue-500" />
            {crop.waterNeeds} Water
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 bg-pocketfarm-light">
            <Clock className="h-3 w-3 text-pocketfarm-gray" />
            {crop.growing_conditions}
          </Badge>
        </div>

        <p className="text-sm line-clamp-3">{crop.description}</p>

        <div className="flex items-center gap-1 text-xs text-pocketfarm-gray">
          <CalendarDays className="h-3 w-3" />
          <span>Harvest: {crop.planting_info}</span>
        </div>

        {crop.companionCrops && crop.companionCrops.length > 0 && (
          <div className="text-xs">
            <span className="font-medium">Companion plants: </span>
            {crop.companionCrops.join(', ')}
          </div>
        )}

        {/* Show More Details */}
        <Button
          variant="ghost"
          className="mt-2 text-pocketfarm-primary flex items-center gap-1 text-sm"
          onClick={() => setShowMore(!showMore)}
        >
          {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showMore ? "Show Less" : "Show More"}
        </Button>

        {showMore && (
          <div className="mt-3 p-2 bg-gray-100 rounded-lg text-xs space-y-2">
            <p><b>Origin:</b> {crop.origin}</p>
            <p><b>Care Instructions:</b> {crop.care_instructions}</p>
            <p><b>Storage Info:</b> {crop.storage_info}</p>
            <p><b>Nutritional Info:</b> {crop.nutritional_info}</p>
            <p><b>Culinary Uses:</b> {crop.culinary_info}</p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {!selected ? (
          <Button 
            className="w-full bg-pocketfarm-primary hover:bg-pocketfarm-dark"
            onClick={handleSelect}
          >
            Add to My Garden
          </Button>
        ) : (
          <Button 
            variant="outline"
            className="w-full border-pocketfarm-primary text-pocketfarm-primary"
            disabled
          >
            Added to Garden
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default CropCard;
