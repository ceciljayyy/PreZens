import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import StatsCard from "@/components/dashboard/stats-card";
import MeetingList from "@/components/meeting/meeting-list";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, History, BarChart } from "lucide-react";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  
  // Fetch dashboard stats
  const { 
    data: stats, 
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });
  
  // Fetch today's meetings
  const {
    data: meetings,
    isLoading: meetingsLoading,
  } = useQuery({
    queryKey: ['/api/meetings/today'],
  });
  
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
  
  const isLoading = statsLoading || meetingsLoading;
  
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
            <h2 className="text-2xl font-medium mb-1">Admin Dashboard</h2>
            <p className="text-muted-foreground text-sm">Manage meetings and view attendance status</p>
          </div>
          
          {/* Stats Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-4 h-24 animate-pulse">
                  <div className="bg-gray-200 h-full rounded-md"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="Active Meetings"
                value={stats?.activeMeetings || 0}
                icon={<Calendar className="h-5 w-5" />}
                color="primary"
              />
              <StatsCard
                title="Present Today"
                value={stats?.presentToday || 0}
                icon={<Users className="h-5 w-5" />}
                color="success"
              />
              <StatsCard
                title="Late Check-ins"
                value={stats?.lateToday || 0}
                icon={<History className="h-5 w-5" />}
                color="warning"
              />
              <StatsCard
                title="Absent"
                value={stats?.absentToday || 0}
                icon={<Users className="h-5 w-5" />}
                color="destructive"
              />
            </div>
          )}
          
          {/* Today's Meetings Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Today's Meetings</h3>
              <Link href="/admin/create-meeting">
                <Button>
                  <Plus className="mr-1 h-4 w-4" />
                  Create Meeting
                </Button>
              </Link>
            </div>
            
            {isLoading ? (
              <div className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                <div className="h-64 bg-gray-200 rounded-md"></div>
              </div>
            ) : (
              <MeetingList meetings={meetings || []} />
            )}
          </div>
          
          {/* Analytics Preview */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Attendance Overview</h3>
              <Button variant="outline">
                <BarChart className="mr-1 h-4 w-4" />
                View Full Report
              </Button>
            </div>
            
            {isLoading ? (
              <div className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-md"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="h-48 flex items-center justify-center border border-dashed border-gray-300 rounded-md">
                  <div className="text-center">
                    <BarChart className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Attendance analytics charts will appear here</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
