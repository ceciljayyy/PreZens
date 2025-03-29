import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertMeetingSchema, 
  insertAttendanceRecordSchema, 
  insertMeetingParticipantSchema, 
  checkInSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Calculate distance between two coordinates in meters
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function isAdmin(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Not authorized" });
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Meeting routes
  app.get("/api/meetings", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      let meetings;
      if (req.user.role === "admin") {
        meetings = await storage.getMeetings();
      } else {
        meetings = await storage.getUserMeetings(req.user.id);
      }
      
      res.json(meetings);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/meetings/today", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      let meetings;
      if (req.user.role === "admin") {
        meetings = await storage.getTodayMeetings();
      } else {
        meetings = await storage.getUserTodayMeetings(req.user.id);
      }
      
      res.json(meetings);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/meetings/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const meetingId = parseInt(req.params.id);
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Check if user is admin or a participant
      if (req.user.role !== "admin") {
        const isParticipant = await storage.isUserMeetingParticipant(req.user.id, meetingId);
        if (!isParticipant) {
          return res.status(403).json({ message: "Not authorized to view this meeting" });
        }
      }
      
      res.json(meeting);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/meetings", isAdmin, async (req, res, next) => {
    try {
      const meetingData = insertMeetingSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      const meeting = await storage.createMeeting(meetingData);
      
      // Add participants if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        for (const userId of req.body.participants) {
          await storage.addMeetingParticipant({
            meetingId: meeting.id,
            userId,
            required: true
          });
        }
      }
      
      res.status(201).json(meeting);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.put("/api/meetings/:id", isAdmin, async (req, res, next) => {
    try {
      const meetingId = parseInt(req.params.id);
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const meetingData = insertMeetingSchema.parse({
        ...req.body,
        createdBy: meeting.createdBy
      });
      
      const updatedMeeting = await storage.updateMeeting(meetingId, meetingData);
      
      // Update participants if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        // Remove existing participants
        await storage.removeMeetingParticipants(meetingId);
        
        // Add new participants
        for (const userId of req.body.participants) {
          await storage.addMeetingParticipant({
            meetingId,
            userId,
            required: true
          });
        }
      }
      
      res.json(updatedMeeting);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.delete("/api/meetings/:id", isAdmin, async (req, res, next) => {
    try {
      const meetingId = parseInt(req.params.id);
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      await storage.deleteMeeting(meetingId);
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // Attendance routes
  app.post("/api/attendance/check-in", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const checkInData = checkInSchema.parse(req.body);
      const { meetingId, latitude, longitude, verificationMethod } = checkInData;
      
      // Get meeting details
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Check if user is a participant
      const isParticipant = await storage.isUserMeetingParticipant(req.user.id, meetingId);
      if (!isParticipant) {
        return res.status(403).json({ message: "You are not a participant in this meeting" });
      }
      
      // Check if already checked in
      const existingRecord = await storage.getAttendanceRecord(meetingId, req.user.id);
      if (existingRecord && (existingRecord.status === "present" || existingRecord.status === "late")) {
        return res.status(400).json({ message: "You have already checked in to this meeting" });
      }
      
      // For GPS verification, check if user is within the allowed radius
      if (verificationMethod === "gps") {
        const distance = haversineDistance(
          latitude, 
          longitude, 
          meeting.latitude, 
          meeting.longitude
        );
        
        if (distance > meeting.radius) {
          // If outside radius, record a failed check-in attempt
          await storage.createAttendanceRecord({
            meetingId,
            userId: req.user.id,
            status: "absent",
            checkInTime: new Date(),
            checkInLatitude: latitude,
            checkInLongitude: longitude,
            verificationMethod,
            notes: `Failed check-in attempt: Distance ${Math.round(distance)}m exceeds allowed radius ${meeting.radius}m`
          });
          
          return res.status(400).json({ 
            message: "You are too far from the meeting location",
            distance: Math.round(distance),
            allowedRadius: meeting.radius
          });
        }
      } else if (verificationMethod === "manual") {
        // Manual check-in requires admin approval, set status to pending
        await storage.createAttendanceRecord({
          meetingId,
          userId: req.user.id,
          status: "pending",
          checkInTime: new Date(),
          checkInLatitude: latitude,
          checkInLongitude: longitude,
          verificationMethod,
          notes: checkInData.notes
        });
        
        return res.status(202).json({ message: "Manual check-in recorded. Awaiting approval." });
      }
      
      // Check if the user is late
      const now = new Date();
      const status = now > meeting.startTime ? "late" : "present";
      
      // Record attendance
      const attendanceRecord = await storage.createAttendanceRecord({
        meetingId,
        userId: req.user.id,
        status,
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        verificationMethod,
        notes: checkInData.notes
      });
      
      res.status(201).json({
        message: status === "late" ? "Checked in (Late)" : "Checked in successfully",
        attendanceRecord
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      next(error);
    }
  });

  app.get("/api/attendance/history", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      const records = await storage.getUserAttendanceHistory(req.user.id);
      res.json(records);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/attendance/meeting/:id", isAdmin, async (req, res, next) => {
    try {
      const meetingId = parseInt(req.params.id);
      const records = await storage.getMeetingAttendance(meetingId);
      res.json(records);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/attendance/approve/:id", isAdmin, async (req, res, next) => {
    try {
      const recordId = parseInt(req.params.id);
      const record = await storage.getAttendanceRecordById(recordId);
      
      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      if (record.status !== "pending") {
        return res.status(400).json({ message: "This record is not pending approval" });
      }
      
      const updatedRecord = await storage.updateAttendanceRecord(recordId, {
        ...record,
        status: "present",
        manualApprovalBy: req.user.id,
        notes: (record.notes ? record.notes + " | " : "") + `Manually approved by ${req.user.username}`
      });
      
      res.json(updatedRecord);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/attendance/reject/:id", isAdmin, async (req, res, next) => {
    try {
      const recordId = parseInt(req.params.id);
      const record = await storage.getAttendanceRecordById(recordId);
      
      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      if (record.status !== "pending") {
        return res.status(400).json({ message: "This record is not pending approval" });
      }
      
      const updatedRecord = await storage.updateAttendanceRecord(recordId, {
        ...record,
        status: "absent",
        manualApprovalBy: req.user.id,
        notes: (record.notes ? record.notes + " | " : "") + `Manually rejected by ${req.user.username}`
      });
      
      res.json(updatedRecord);
    } catch (error) {
      next(error);
    }
  });

  // User management (admin only)
  app.get("/api/users", isAdmin, async (req, res, next) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard data
  app.get("/api/dashboard/stats", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      
      if (req.user.role === "admin") {
        const stats = await storage.getAdminDashboardStats();
        res.json(stats);
      } else {
        const stats = await storage.getUserDashboardStats(req.user.id);
        res.json(stats);
      }
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
