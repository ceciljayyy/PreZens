import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import Header from "@/components/layout/header";
import EmployeeNavigation from "@/components/layout/employee-navigation";
import InstallBanner from "@/components/pwa/install-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Clock, MapPin, Calendar, History, User } from "lucide-react";
import { format } from "date-fns";

export default function EmployeeDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  
  // Fetch today's meetings
  const {
    data: meetings,
    isLoading: meetingsLoading,
  } = useQuery({
    queryKey: ['/api/meetings/today'],
  });
  
  // Fetch attendance history
  const {
    data: history,
    isLoading: historyLoading,
  } = useQuery({
    queryKey: ['/api/attendance/history'],
  });
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Ensure user is an employee
  if (user && user.role === "admin") {
    return <Redirect to="/admin/dashboard" />;
  }
  
  const isLoading = meetingsLoading || historyLoading;
  
  // Find the latest check-in (if any)
  const latestCheckIn = history?.[0];
  const nextMeeting = meetings?.find(m => {
    const startTime = new Date(m.startTime);
    return startTime > new Date();
  });
  
  return (
    <div className="min-h-screen flex flex-col pb-16">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="flex-1 p-4">
        {/* Current Status Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : latestCheckIn ? (
                <>
                  <div className="mb-2">
                    <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success bg-opacity-10">
                      <CheckCircle className="h-8 w-8 text-success" />
                    </span>
                  </div>
                  <h2 className="text-xl font-medium mb-1">You're All Set!</h2>
                  <p className="text-muted-foreground mb-4">
                    Successfully checked in to {latestCheckIn.meeting.name} at{" "}
                    {latestCheckIn.record.checkInTime ? 
                      format(new Date(latestCheckIn.record.checkInTime), "h:mm a") : 
                      ""}
                  </p>
                  
                  {nextMeeting && (
                    <div className="inline-block px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                      <Clock className="inline-block h-4 w-4 align-text-bottom mr-1" />
                      Next: {nextMeeting.name} at {format(new Date(nextMeeting.startTime), "h:mm a")}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </span>
                  </div>
                  <h2 className="text-xl font-medium mb-1">No Check-ins Yet</h2>
                  <p className="text-muted-foreground mb-4">
                    {nextMeeting ? 
                      `You have a meeting coming up at ${format(new Date(nextMeeting.startTime), "h:mm a")}` : 
                      "No meetings scheduled for today"}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Today's Meetings */}
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-3">Today's Meetings</h3>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-24 bg-gray-200 rounded-md"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : meetings && meetings.length > 0 ? (
            <div className="space-y-3">
              {meetings.map((meeting) => {
                const attendanceRecord = history?.find(
                  h => h.meeting.id === meeting.id
                )?.record;
                
                const now = new Date();
                const startTime = new Date(meeting.startTime);
                const endTime = new Date(meeting.endTime);
                const isActive = now >= startTime && now <= endTime;
                const isUpcoming = now < startTime;
                const isPast = now > endTime;
                
                // Calculate if check-in is available (15 mins before)
                const checkInWindowStart = new Date(startTime);
                checkInWindowStart.setMinutes(checkInWindowStart.getMinutes() - 15);
                const canCheckIn = now >= checkInWindowStart && now <= endTime;
                
                let status = "Upcoming";
                let statusClass = "bg-warning bg-opacity-10 text-warning";
                
                if (attendanceRecord) {
                  if (attendanceRecord.status === "present") {
                    status = "Checked In";
                    statusClass = "bg-success text-white";
                  } else if (attendanceRecord.status === "late") {
                    status = "Late";
                    statusClass = "bg-warning text-white";
                  } else if (attendanceRecord.status === "pending") {
                    status = "Pending Approval";
                    statusClass = "bg-warning bg-opacity-10 text-warning";
                  } else {
                    status = "Absent";
                    statusClass = "bg-destructive bg-opacity-10 text-destructive";
                  }
                } else if (isActive) {
                  status = "Active";
                  statusClass = "bg-primary text-white";
                } else if (isPast) {
                  status = "Missed";
                  statusClass = "bg-destructive text-white";
                }
                
                return (
                  <Card key={meeting.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{meeting.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(meeting.startTime), "h:mm a")} - {format(new Date(meeting.endTime), "h:mm a")}
                          </p>
                          <p className="text-sm flex items-center mt-1">
                            <MapPin className="h-4 w-4 text-muted-foreground mr-1" />
                            <span>{meeting.locationName}</span>
                          </p>
                        </div>
                        <div>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                            {status}
                          </span>
                        </div>
                      </div>
                      
                      {canCheckIn && !attendanceRecord && (
                        <div className="mt-3 text-center">
                          <Link href={`/employee/check-in/${meeting.id}`}>
                            <Button className="w-full">
                              <User className="mr-1 h-4 w-4" />
                              Check In
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <h4 className="font-medium">No Meetings Today</h4>
                <p className="text-sm text-muted-foreground">You don't have any scheduled meetings for today</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* History Overview */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">Recent Attendance</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          
          {isLoading ? (
            <Card className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-48 bg-gray-200 rounded-md"></div>
              </CardContent>
            </Card>
          ) : history && history.length > 0 ? (
            <Card>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Meeting
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {history.slice(0, 5).map((entry) => {
                      let statusClass = "";
                      
                      switch (entry.record.status) {
                        case "present":
                          statusClass = "bg-success bg-opacity-10 text-success";
                          break;
                        case "late":
                          statusClass = "bg-warning bg-opacity-10 text-warning";
                          break;
                        case "absent":
                          statusClass = "bg-destructive bg-opacity-10 text-destructive";
                          break;
                        case "pending":
                          statusClass = "bg-secondary bg-opacity-10 text-secondary";
                          break;
                      }
                      
                      return (
                        <tr key={entry.record.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm">{entry.meeting.name}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-muted-foreground">
                              {entry.record.checkInTime ? 
                                format(new Date(entry.record.checkInTime), "MMM d, h:mm a") : 
                                format(new Date(entry.meeting.date), "MMM d")}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>
                              {entry.record.status.charAt(0).toUpperCase() + entry.record.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <History className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <h4 className="font-medium">No Attendance History</h4>
                <p className="text-sm text-muted-foreground">Your attendance history will appear here</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* PWA Install Banner */}
        <InstallBanner />
      </div>
      
      {/* Bottom Navigation */}
      <EmployeeNavigation />
    </div>
  );
}
