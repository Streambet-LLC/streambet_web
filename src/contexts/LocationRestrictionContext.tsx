import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { verifyUserLocation, GeolocationResult } from '@/integrations/api/geolocation';
import { useToast } from '@/components/ui/use-toast';
import Bugsnag from '@bugsnag/js';

interface LocationRestrictionContextType {
  locationResult: GeolocationResult | null;
  isCheckingLocation: boolean;
  updateLocationResult: (result: GeolocationResult) => void;
  checkLocation: () => Promise<void>;
}

const LocationRestrictionContext = createContext<LocationRestrictionContextType | undefined>(undefined);

interface LocationRestrictionProviderProps {
  children: ReactNode;
}

export const LocationRestrictionProvider: React.FC<LocationRestrictionProviderProps> = ({ children }) => {
  const [locationResult, setLocationResult] = useState<GeolocationResult | null>(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(true);
  const { toast } = useToast();

  const checkLocation = async () => {
    setIsCheckingLocation(true);
    try {
      const result = await verifyUserLocation();
      setLocationResult(result);

      if (!result.allowed) {
        toast({
          variant: 'destructive',
          title: 'Location Restricted',
          description: result.error,
        });
      }
    } catch (error) {
      Bugsnag.notify(error); 
      console.error('Location check failed:', error);
      const fallbackResult: GeolocationResult = {
        allowed: true,
        error: 'Could not verify location. Proceeding anyway.',
      };
      setLocationResult(fallbackResult);
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const updateLocationResult = (result: GeolocationResult) => {
    setLocationResult(result);
  };

  // Check location on provider mount
  useEffect(() => {
    checkLocation();
  }, []);

  const value: LocationRestrictionContextType = {
    locationResult,
    isCheckingLocation,
    updateLocationResult,
    checkLocation,
  };

  return (
    <LocationRestrictionContext.Provider value={value}>
      {children}
    </LocationRestrictionContext.Provider>
  );
};

export const useLocationRestriction = (): LocationRestrictionContextType => {
  const context = useContext(LocationRestrictionContext);
  if (context === undefined) {
    throw new Error('useLocationRestriction must be used within a LocationRestrictionProvider');
  }
  return context;
}; 