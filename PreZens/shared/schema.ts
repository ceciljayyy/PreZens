import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("employee"), // "admin" or "employee"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Meeting model
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  locationName: text("location_name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  radius: integer("radius").notNull().default(100), // in meters
  createdBy: integer("created_by").notNull(),
  status: text("status").notNull().default("upcoming"), // "upcoming", "active", "completed", "cancelled"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMeetingSchema = createInsertSchema(meetings).pick({
  name: true,
  date: true,
  startTime: true,
  endTime: true,
  locationName: true,
  latitude: true,
  longitude: true,
  radius: true,
  createdBy: true,
  status: true,
});

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

// Meeting Participants (many-to-many relationship)
export const meetingParticipants = pgTable("meeting_participants", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  userId: integer("user_id").notNull(),
  required: boolean("required").notNull().default(true),
});

export const insertMeetingParticipantSchema = createInsertSchema(meetingParticipants).pick({
  meetingId: true,
  userId: true,
  required: true,
});

export type InsertMeetingParticipant = z.infer<typeof insertMeetingParticipantSchema>;
export type MeetingParticipant = typeof meetingParticipants.$inferSelect;

// Attendance Records
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull(), // "present", "late", "absent", "pending"
  checkInTime: timestamp("check_in_time"),
  checkInLatitude: real("check_in_latitude"),
  checkInLongitude: real("check_in_longitude"),
  verificationMethod: text("verification_method"), // "gps", "biometric", "manual"
  manualApprovalBy: integer("manual_approval_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).pick({
  meetingId: true,
  userId: true,
  status: true,
  checkInTime: true,
  checkInLatitude: true,
  checkInLongitude: true,
  verificationMethod: true,
  manualApprovalBy: true,
  notes: true,
});

export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

// Login schema for frontend validation
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// Check-in validation schema
export const checkInSchema = z.object({
  meetingId: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  verificationMethod: z.enum(["gps", "biometric", "manual"]),
  notes: z.string().optional(),
});

export type CheckInData = z.infer<typeof checkInSchema>;
