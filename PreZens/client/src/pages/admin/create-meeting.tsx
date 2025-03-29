import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { z } from "zod";
import { insertMeetingSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import LocationPicker from "@/components/meeting/location-picker";
import RadiusSlider from "@/components/meeting/radius-slider";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, Calendar as CalendarIcon, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

// Extended schema with form validation
const meetingFormSchema = insertMeetingSchema.extend({
  date: z.date({
    required_error: "Meeting date is required",
  }),
  startTime: z.date({
    required_error: "Start time is required",
  }),
  endTime: z.date({
    required_error: "End time is required",
  }),
}).refine((data) => data.endTime > data.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

type MeetingFormValues = z.infer<typeof meetingFormSchema>;

export default function CreateMeeting() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [locationType, setLocationType] = useState<"current" | "address" | "map">("current");
  
  // Fetch users for participant selection
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
  });
  
  // Create meeting mutation
  const createMeeting = useMutation({
    mutationFn: async (meeting: any) => {
      const res = await apiRequest("POST", "/api/meetings", meeting);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Meeting created",
        description: "The meeting has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings/today'] });
      navigate("/admin/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create meeting",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Define form with default values
  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      name: "",
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(new Date().getTime() + 60 * 60 * 1000), // Default 1 hour later
      locationName: "",
      latitude: 0,
      longitude: 0,
      radius: 100,
      createdBy: user?.id || 0,
      status: "upcoming",
    },
  });
  
  // Update location data when location changes
  const updateLocation = (data: { lat: number; lng: number; name: string }) => {
    form.setValue("latitude", data.lat);
    form.setValue("longitude", data.lng);
    form.setValue("locationName", data.name);
  };
  
  // Handle form submission
  const onSubmit = (data: MeetingFormValues) => {
    // Format dates for API
    const formattedData = {
      ...data,
      participants: form.getValues("participants") || [],
    };
    
    createMeeting.mutate(formattedData);
  };
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Ensure user is an admin
  if (user && user.role !== "admin") {
    return <Redirect to="/employee/dashboard" />;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Content Area */}
        <div className="flex-1 p-6 bg-gray-50">
          <div className="mb-6">
            <h2 className="text-2xl font-medium mb-1">Create New Meeting</h2>
            <p className="text-muted-foreground text-sm">Set up a new meeting with location-based attendance</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Meeting Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meeting Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Daily Standup" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Meeting Date */}
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="pl-3 text-left font-normal"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Start Time */}
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={field.value ? format(field.value, "HH:mm") : ""}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':');
                                const date = new Date(field.value);
                                date.setHours(parseInt(hours, 10));
                                date.setMinutes(parseInt(minutes, 10));
                                field.onChange(date);
                              }} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* End Time */}
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={field.value ? format(field.value, "HH:mm") : ""}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':');
                                const date = new Date(field.value);
                                date.setHours(parseInt(hours, 10));
                                date.setMinutes(parseInt(minutes, 10));
                                field.onChange(date);
                              }} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Location Section */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Location</h3>
                      <FormField
                        control={form.control}
                        name="locationName"
                        render={() => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                value={locationType}
                                onValueChange={(value) => setLocationType(value as "current" | "address" | "map")}
                                className="flex flex-wrap gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="current" id="current" />
                                  <label htmlFor="current">Current Location</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="address" id="address" />
                                  <label htmlFor="address">Manual Address</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="map" id="map" />
                                  <label htmlFor="map">Map Selection</label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Location Picker Component */}
                    <LocationPicker locationType={locationType} onLocationSelected={updateLocation} />
                    
                    {/* Radius Slider */}
                    <FormField
                      control={form.control}
                      name="radius"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center mb-2">
                            <FormLabel className="mr-2 mb-0">Check-in Radius (meters):</FormLabel>
                            <span className="text-sm font-medium">{field.value}m</span>
                          </div>
                          <FormControl>
                            <RadiusSlider
                              value={field.value}
                              onValueChange={(value) => field.onChange(value)}
                            />
                          </FormControl>
                          <FormDescription>
                            Set how close participants need to be to the meeting location to check in
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Participants Selection */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">Participants</h3>
                    <FormField
                      control={form.control}
                      name="participants"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Add Participants</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange([...field.value || [], parseInt(value)])}
                            value=""
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select participants" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {usersLoading ? (
                                <div className="p-2 text-center">
                                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                  <span className="text-sm">Loading users...</span>
                                </div>
                              ) : (
                                users?.filter(u => u.role !== "admin").map((user) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.firstName && user.lastName ? 
                                      `${user.firstName} ${user.lastName}` : 
                                      user.username}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Selected participants will be notified about this meeting
                          </FormDescription>
                          <FormMessage />
                          
                          {/* Show selected participants */}
                          {field.value?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium mb-1">Selected participants:</p>
                              <div className="flex flex-wrap gap-2">
                                {field.value.map((userId) => {
                                  const user = users?.find(u => u.id === userId);
                                  return (
                                    <div key={userId} className="bg-primary/10 text-primary text-sm rounded-full px-3 py-1 flex items-center">
                                      {user?.firstName && user?.lastName ? 
                                        `${user.firstName} ${user.lastName}` : 
                                        user?.username}
                                      <button
                                        type="button"
                                        className="ml-2 text-primary/70 hover:text-primary"
                                        onClick={() => field.onChange(field.value.filter(id => id !== userId))}
                                      >
                                        &times;
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <CardFooter className="px-0 pt-6 border-t flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate("/admin/dashboard")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMeeting.isPending}>
                      {createMeeting.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Meeting"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
