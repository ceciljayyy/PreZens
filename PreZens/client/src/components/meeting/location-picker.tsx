import { useState, useEffect } from "react";
import { useLocation as useGeoLocation } from "@/hooks/use-location";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocationPickerProps {
  locationType: "current" | "address" | "map";
  onLocationSelected: (location: { lat: number; lng: number; name: string }) => void;
}

export default function LocationPicker({ locationType, onLocationSelected }: LocationPickerProps) {
  const [address, setAddress] = useState("");
  const [locationName, setLocationName] = useState("");
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const { toast } = useToast();
  
  // Geo location hook
  const {
    latitude,
    longitude,
    error: locationError,
    isLoading: locationLoading,
    requestPermission,
    geolocationAvailable,
  } = useGeoLocation();
  
  // Effect to get current location when locationType is "current"
  useEffect(() => {
    if (locationType === "current" && geolocationAvailable) {
      requestPermission();
      
      // Set a default location name for current location
      if (latitude && longitude) {
        setLocationName("Current Location");
        onLocationSelected({
          lat: latitude,
          lng: longitude,
          name: "Current Location",
        });
      }
    }
  }, [locationType, geolocationAvailable, latitude, longitude, requestPermission, onLocationSelected]);
  
  // Handle geocoding address to coordinates
  const handleGeocodeAddress = async () => {
    if (!address.trim()) {
      toast({
        title: "Address required",
        description: "Please enter an address to search",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeocodingAddress(true);
    
    try {
      // This would use the Google Maps Geocoding API in a real implementation
      // For this demo, we'll simulate a successful geocode
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock geocoding result
      const location = {
        lat: 37.7749,
        lng: -122.4194,
        name: address,
      };
      
      // Update state and notify parent
      setLocationName(address);
      onLocationSelected(location);
      
      toast({
        title: "Location found",
        description: `Successfully located "${address}"`,
      });
    } catch (error) {
      toast({
        title: "Geocoding failed",
        description: "Could not find coordinates for this address. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeocodingAddress(false);
    }
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        {locationType === "current" && (
          <div className="space-y-4">
            {locationLoading ? (
              <div className="text-center py-6">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-muted-foreground">Getting your current location...</p>
              </div>
            ) : locationError ? (
              <div className="text-center py-6">
                <p className="text-destructive mb-2">Error: {locationError}</p>
                <Button onClick={requestPermission}>
                  Try Again
                </Button>
              </div>
            ) : latitude && longitude ? (
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Current Location Detected</p>
                    <p className="text-sm text-muted-foreground">
                      {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
                
                <div className="h-40 relative bg-gray-200 rounded-md overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  {/* This would be replaced with an actual Google Map */}
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">Map View</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="text-sm font-medium mb-1 block">Location Name</label>
                  <Input
                    placeholder="e.g. Main Office"
                    value={locationName}
                    onChange={(e) => {
                      setLocationName(e.target.value);
                      onLocationSelected({
                        lat: latitude,
                        lng: longitude,
                        name: e.target.value,
                      });
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-2">
                  Location services are required to use your current location
                </p>
                <Button onClick={requestPermission}>
                  Allow Location Access
                </Button>
              </div>
            )}
          </div>
        )}
        
        {locationType === "address" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Enter Address</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 123 Main St, City, State"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <Button 
                  onClick={handleGeocodeAddress}
                  disabled={isGeocodingAddress}
                >
                  {isGeocodingAddress ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>
            </div>
            
            {isGeocodingAddress ? (
              <div className="h-40 bg-gray-200 rounded-md flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : locationName ? (
              <div className="h-40 relative bg-gray-200 rounded-md overflow-hidden">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                {/* This would be replaced with an actual Google Map */}
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Map View</span>
                </div>
              </div>
            ) : (
              <div className="h-40 bg-gray-200 rounded-md flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Search for an address to see map</p>
              </div>
            )}
          </div>
        )}
        
        {locationType === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Click on the map to select a location</p>
            
            <div className="h-60 relative bg-gray-200 rounded-md overflow-hidden">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              {/* This would be replaced with an actual Google Map */}
              <div className="h-full w-full flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Interactive Map</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Location Name</label>
              <Input
                placeholder="e.g. Conference Center"
                value={locationName}
                onChange={(e) => {
                  setLocationName(e.target.value);
                  // In a real app, we'd get the lat/lng from the map click
                  // Using placeholder values for demo
                  onLocationSelected({
                    lat: 37.7749,
                    lng: -122.4194,
                    name: e.target.value,
                  });
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
