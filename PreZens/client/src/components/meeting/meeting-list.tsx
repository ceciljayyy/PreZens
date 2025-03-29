import { Link } from "wouter";
import { format } from "date-fns";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Meeting {
  id: number;
  name: string;
  startTime: string | Date;
  endTime: string | Date;
  locationName: string;
  status: string;
}

interface MeetingListProps {
  meetings: Meeting[];
}

export default function MeetingList({ meetings }: MeetingListProps) {
  // Helper to determine status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "upcoming":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Upcoming</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  // If no meetings
  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No meetings scheduled for today.</p>
          <Link href="/admin/create-meeting">
            <Button className="mt-4">Create Meeting</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Meeting Name</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings.map((meeting) => (
              <TableRow key={meeting.id}>
                <TableCell className="font-medium">{meeting.name}</TableCell>
                <TableCell>
                  {format(new Date(meeting.startTime), "HH:mm")} - {format(new Date(meeting.endTime), "HH:mm")}
                </TableCell>
                <TableCell>{meeting.locationName}</TableCell>
                <TableCell>
                  {/* This would be replaced with actual attendance data */}
                  <span>0/0</span>
                </TableCell>
                <TableCell>
                  {getStatusBadge(meeting.status)}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/meetings/${meeting.id}`}>
                    <Button variant="link" className="text-primary hover:text-primary/80">
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
