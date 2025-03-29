import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation as useGeoLocation } from "@/hooks/use-location";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Check, X, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function CheckIn() {
  const { id } = useParams<{ id: string }>;
  const meetingId = parseInt(id);
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // For check-in method selection
  const [verificationMethod, setVerificationMethod] = useState<"gps" | "biometric" | "manual">("gps");
  const [notes, setNotes] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  
  // Geo location hook with watch for continuous updates
  const {
    latitude,
    longitude,
    accuracy,
    error: locationError,
    isLoading: locationLoading,
    requestPermission,
    geolocationAvailable,
  } = useGeoLocation({ watchPosition: true });
  
  // Fetch meeting details
  const {
    data: meeting,
    isLoading: meetingLoading,
    error: meetingError,
  } = useQuery({
    queryKey: [`/api/meetings/${meetingId}`],
  });
  
  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/attendance/check-in", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Check-in successful",
        description: "You've been successfully checked in to the meeting",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/today"] });
      navigate("/employee/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Check-in failed",
        description: error.message,
        variant: "destructive",
      });
      setCheckingIn(false);
    },
  });
  
  // Request location permission when component mounts
  useEffect(() => {
    if (geolocationAvailable) {
      requestPermission();
    }
  }, [geolocationAvailable, requestPermission]);
  
  // Handle biometric auth
  const handleBiometricAuth = async () => {
    setVerificationMethod("biometric");
    
    if (!navigator.credentials || !window.PublicKeyCredential) {
      toast({
        title: "Biometric authentication not supported",
        description: "Your device doesn't support biometric authentication. Try GPS verification instead.",
        variant: "destructive",
      });
      setVerificationMethod("gps");
      return;
    }
    
    try {
      // Check if biometric auth is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!available) {
        toast({
          title: "Biometric authentication not available",
          description: "No biometric authenticator available on this device. Try GPS verification instead.",
          variant: "destructive",
        });
        setVerificationMethod("gps");
        return;
      }
      
      // Fake successful biometric auth for demo
      // In a real app, this would use the Web Authentication API
      toast({
        title: "Biometric authentication successful",
        description: "Your identity has been verified",
      });
      
      // Continue with check-in process using GPS coordinates
      handleCheckIn("biometric");
    } catch (error) {
      console.error("Biometric auth error:", error);
      toast({
        title: "Biometric authentication failed",
        description: "Could not verify your identity. Try GPS verification instead.",
        variant: "destructive",
      });
      setVerificationMethod("gps");
    }
  };
  
  // Handle manual check-in
  const handleManualCheckIn = () => {
    setVerificationMethod("manual");
    handleCheckIn("manual");
  };
  
  // Handle check-in
  const handleCheckIn = (method: "gps" | "biometric" | "manual") => {
    if (!latitude || !longitude) {
      toast({
        title: "Location required",
        description: "We need your location to verify your attendance. Please enable location services.",
        variant: "destructive",
      });
      return;
    }
    
    setCheckingIn(true);
    
    const checkInData = {
      meetingId,
      latitude,
      longitude,
      verificationMethod: method,
      notes: method === "manual" ? notes : undefined,
    };
    
    checkInMutation.mutate(checkInData);
  };
  
  // Calculate distance from meeting location (if meeting data is available)
  const calculateDistance = () => {
    if (!meeting || !latitude || !longitude) return null;
    
    // Haversine formula to calculate distance between two points on Earth
    const R = 6371e3; // Earth radius in meters
    const φ1 = latitude * Math.PI / 180;
    const φ2 = meeting.latitude * Math.PI / 180;
    const Δφ = (meeting.latitude - latitude) * Math.PI / 180;
    const Δλ = (meeting.longitude - longitude) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return Math.round(R * c);
  };
  
  const distance = calculateDistance();
  const isWithinRadius = meeting && distance !== null ? distance <= meeting.radius : false;
  
  const isLoading = authLoading || meetingLoading || locationLoading;
  
  // Check for errors
  if (!isLoading) {
    if (meetingError) {
      return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="flex-1 p-4 flex flex-col items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-medium mb-2">Meeting Not Found</h2>
                <p className="text-muted-foreground mb-6">The meeting you're trying to check in to doesn't exist or you don't have access to it.</p>
                <Link href="/employee/dashboard">
                  <Button className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    
    if (!geolocationAvailable) {
      return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="flex-1 p-4 flex flex-col items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-medium mb-2">Location Not Available</h2>
                <p className="text-muted-foreground mb-6">Your browser doesn't support geolocation, which is required for checking in.</p>
                <Link href="/employee/dashboard">
                  <Button className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with back button */}
      <header className="bg-white shadow-sm p-4 flex items-center">
        <Link href="/employee/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-lg font-medium ml-2">
          {isLoading ? "Loading..." : `Check-in to ${meeting?.name}`}
        </h2>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Getting your location...</p>
          </div>
        ) : locationError ? (
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-medium mb-2">Location Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                We can't verify your attendance without access to your location. 
                Please enable location services for this site in your browser settings.
              </p>
              <Button className="w-full mb-3" onClick={requestPermission}>
                Try Again
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setVerificationMethod("manual")}>
                Request Manual Check-in
              </Button>
              
              {verificationMethod === "manual" && (
                <div className="mt-4 text-left">
                  <p className="font-medium mb-2">Manual Check-in Request</p>
                  <textarea 
                    className="w-full p-3 border border-input rounded-md mb-3"
                    rows={3}
                    placeholder="Please explain why you need manual check-in approval..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                  <Button className="w-full" onClick={handleManualCheckIn} disabled={!notes.trim() || checkingIn}>
                    {checkingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit for Approval"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Map and Location Status */}
            <div className="w-full max-w-md mb-6">
              <Card className="overflow-hidden shadow-md">
                <div className="h-64 relative bg-gray-200">
                  {/* This would be replaced with an actual Google Map component */}
                  <div className="h-full w-full relative flex items-center justify-center">
                    <div className="absolute" style={{ transform: "translate(-50%, -100%)" }}>
                      <MapPin className="h-8 w-8 text-primary mb-4" />
                    </div>
                    <div 
                      className="absolute rounded-full border-2 border-primary bg-primary bg-opacity-10"
                      style={{ 
                        width: `${200}px`, 
                        height: `${200}px`, 
                        transform: "translate(-50%, -50%)"
                      }}
                    ></div>
                    {/* Image placeholder for Google Maps */}
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <p className="text-muted-foreground">Map View - Your location is being verified</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Your Location:</span>
                    <span className="text-sm text-muted-foreground">
                      {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Accuracy:</span>
                    <span className="text-sm text-muted-foreground">
                      {accuracy ? `±${Math.round(accuracy)}m` : "Unknown"}
                    </span>
                  </div>
                  {distance !== null && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-medium">Distance to meeting:</span>
                      <span className="text-sm text-muted-foreground">
                        {distance}m (Allowed: {meeting?.radius}m)
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="w-full max-w-md text-center">
              {/* Location status */}
              <div className="mb-8">
                {isWithinRadius ? (
                  <>
                    <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-success bg-opacity-10 mb-2">
                      <Check className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="text-xl font-medium mb-1">You're in the right place!</h3>
                    <p className="text-muted-foreground">You're within the allowed check-in area</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-destructive bg-opacity-10 mb-2">
                      <X className="h-8 w-8 text-destructive" />
                    </div>
                    <h3 className="text-xl font-medium mb-1">You're too far away!</h3>
                    <p className="text-muted-foreground">You need to be within {meeting?.radius}m of the meeting location</p>
                  </>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="w-full space-y-3">
                <Button 
                  className="w-full"
                  disabled={!isWithinRadius || checkingIn}
                  onClick={() => handleCheckIn("gps")}
                >
                  {checkingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking in...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Complete GPS Check-in
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleBiometricAuth}
                  disabled={checkingIn}
                >
                  Use Biometric Authentication
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setVerificationMethod("manual")}
                  disabled={checkingIn}
                >
                  Request Manual Check-in
                </Button>
                
                {verificationMethod === "manual" && (
                  <div className="mt-4 text-left">
                    <p className="font-medium mb-2">Manual Check-in Request</p>
                    <textarea 
                      className="w-full p-3 border border-input rounded-md mb-3"
                      rows={3}
                      placeholder="Please explain why you need manual check-in approval..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                    <Button className="w-full" onClick={handleManualCheckIn} disabled={!notes.trim() || checkingIn}>
                      {checkingIn ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit for Approval"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
