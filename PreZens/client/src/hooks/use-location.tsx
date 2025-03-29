import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  permissionStatus: PermissionState | null;
}

interface UseLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

export function useLocation(options: UseLocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watchPosition = false,
  } = options;
  
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    isLoading: true,
    permissionStatus: null,
  });
  
  const { toast } = useToast();
  
  // Check if geolocation is available
  const geolocationAvailable = 'geolocation' in navigator;
  
  // Check permission status
  const checkPermission = useCallback(async () => {
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setState(prev => ({ ...prev, permissionStatus: permission.state }));
        
        // Listen for permission changes
        permission.onchange = () => {
          setState(prev => ({ ...prev, permissionStatus: permission.state }));
        };
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  }, []);
  
  // Get current position
  const getCurrentPosition = useCallback(() => {
    if (!geolocationAvailable) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        isLoading: false,
      }));
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          isLoading: false,
          permissionStatus: state.permissionStatus,
        });
        
        // Store permission in localStorage
        localStorage.setItem('locationPermissionGranted', 'true');
      },
      (error) => {
        let errorMessage = 'Unknown error occurred';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            localStorage.setItem('locationPermissionGranted', 'false');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
        
        toast({
          title: 'Location Error',
          description: errorMessage,
          variant: 'destructive',
        });
      },
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, geolocationAvailable, maximumAge, state.permissionStatus, timeout, toast]);
  
  // Request location permission
  const requestPermission = useCallback(() => {
    if (localStorage.getItem('locationPermissionGranted') === 'false') {
      toast({
        title: 'Location Permission Required',
        description: 'Please enable location services in your browser settings to use this feature.',
        variant: 'destructive',
      });
    }
    
    getCurrentPosition();
    checkPermission();
  }, [checkPermission, getCurrentPosition, toast]);
  
  // Watch position changes
  useEffect(() => {
    if (!geolocationAvailable || !watchPosition) return;
    
    checkPermission();
    
    const hasPermission = localStorage.getItem('locationPermissionGranted');
    
    if (hasPermission === 'true') {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            error: null,
            isLoading: false,
            permissionStatus: state.permissionStatus,
          });
        },
        (error) => {
          let errorMessage = 'Unknown error occurred';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          setState(prev => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
          }));
        },
        { enableHighAccuracy, timeout, maximumAge }
      );
      
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [
    checkPermission,
    enableHighAccuracy,
    geolocationAvailable,
    maximumAge,
    state.permissionStatus,
    timeout,
    watchPosition,
  ]);
  
  // Initialize permission check on component mount
  useEffect(() => {
    checkPermission();
    
    // Check if we've already requested permission before
    const hasRequestedPermission = localStorage.getItem('locationPermissionGranted');
    
    if (hasRequestedPermission === 'true' && !watchPosition) {
      getCurrentPosition();
    }
  }, [checkPermission, getCurrentPosition, watchPosition]);
  
  return {
    ...state,
    getCurrentPosition,
    requestPermission,
    geolocationAvailable,
  };
}
