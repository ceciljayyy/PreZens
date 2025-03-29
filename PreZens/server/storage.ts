import { 
  User, InsertUser, Meeting, InsertMeeting, 
  MeetingParticipant, InsertMeetingParticipant,
  AttendanceRecord, InsertAttendanceRecord
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  
  // Meeting operations
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetings(): Promise<Meeting[]>;
  getTodayMeetings(): Promise<Meeting[]>;
  getUserMeetings(userId: number): Promise<Meeting[]>;
  getUserTodayMeetings(userId: number): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, meeting: InsertMeeting): Promise<Meeting>;
  deleteMeeting(id: number): Promise<void>;
  
  // Meeting participants
  getMeetingParticipants(meetingId: number): Promise<{ user: User, participant: MeetingParticipant }[]>;
  isUserMeetingParticipant(userId: number, meetingId: number): Promise<boolean>;
  addMeetingParticipant(participant: InsertMeetingParticipant): Promise<MeetingParticipant>;
  removeMeetingParticipants(meetingId: number): Promise<void>;
  
  // Attendance records
  getAttendanceRecordById(id: number): Promise<AttendanceRecord | undefined>;
  getAttendanceRecord(meetingId: number, userId: number): Promise<AttendanceRecord | undefined>;
  getMeetingAttendance(meetingId: number): Promise<{ record: AttendanceRecord, user: User }[]>;
  getUserAttendanceHistory(userId: number): Promise<{ record: AttendanceRecord, meeting: Meeting }[]>;
  createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  updateAttendanceRecord(id: number, record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  
  // Dashboard stats
  getAdminDashboardStats(): Promise<{
    activeMeetings: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
  }>;
  getUserDashboardStats(userId: number): Promise<{
    upcomingMeetings: number;
    totalPresent: number;
    totalLate: number;
    totalAbsent: number;
  }>;
  
  // Session storage
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private meetings: Map<number, Meeting>;
  private meetingParticipants: Map<number, MeetingParticipant>;
  private attendanceRecords: Map<number, AttendanceRecord>;
  private currentIds: { 
    users: number; 
    meetings: number; 
    participants: number; 
    records: number;
  };

  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.meetings = new Map();
    this.meetingParticipants = new Map();
    this.attendanceRecords = new Map();
    
    this.currentIds = {
      users: 1,
      meetings: 1,
      participants: 1,
      records: 1
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Create a default admin user
    this.createUser({
      username: "admin",
      email: "admin@prezens.app",
      password: "9b8769a4f3925d2cc6c919aca420f2a29d8abf1aa99e1605b5651cace1f27c1ea1711b5b5e2dc9bd36ae6b62d519cf22ea5e2eb19bab7a1a161a3f5eef89f44b.9f0d8c88282ddeb1",
      firstName: "Admin",
      lastName: "User",
      role: "admin"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }

  // Meeting methods
  async getMeeting(id: number): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async getMeetings(): Promise<Meeting[]> {
    return Array.from(this.meetings.values());
  }

  async getTodayMeetings(): Promise<Meeting[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return Array.from(this.meetings.values()).filter(meeting => {
      const meetingDate = new Date(meeting.date);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate.getTime() === today.getTime();
    });
  }

  async getUserMeetings(userId: number): Promise<Meeting[]> {
    // Get all meeting IDs where the user is a participant
    const participantMeetingIds = Array.from(this.meetingParticipants.values())
      .filter(p => p.userId === userId)
      .map(p => p.meetingId);
    
    // Return all meetings where the user is a participant
    return Array.from(this.meetings.values())
      .filter(meeting => participantMeetingIds.includes(meeting.id));
  }

  async getUserTodayMeetings(userId: number): Promise<Meeting[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const userMeetings = await this.getUserMeetings(userId);
    
    return userMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.date);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate.getTime() === today.getTime();
    });
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const id = this.currentIds.meetings++;
    const now = new Date();
    const newMeeting: Meeting = { ...meeting, id, createdAt: now };
    this.meetings.set(id, newMeeting);
    return newMeeting;
  }

  async updateMeeting(id: number, meeting: InsertMeeting): Promise<Meeting> {
    const existingMeeting = this.meetings.get(id);
    if (!existingMeeting) {
      throw new Error(`Meeting with ID ${id} not found`);
    }
    
    const updatedMeeting: Meeting = { 
      ...meeting, 
      id, 
      createdAt: existingMeeting.createdAt 
    };
    
    this.meetings.set(id, updatedMeeting);
    return updatedMeeting;
  }

  async deleteMeeting(id: number): Promise<void> {
    this.meetings.delete(id);
    
    // Delete associated participants
    const participantIds = Array.from(this.meetingParticipants.entries())
      .filter(([_, p]) => p.meetingId === id)
      .map(([id, _]) => id);
    
    participantIds.forEach(id => this.meetingParticipants.delete(id));
    
    // Delete associated attendance records
    const recordIds = Array.from(this.attendanceRecords.entries())
      .filter(([_, r]) => r.meetingId === id)
      .map(([id, _]) => id);
    
    recordIds.forEach(id => this.attendanceRecords.delete(id));
  }

  // Meeting participants methods
  async getMeetingParticipants(meetingId: number): Promise<{ user: User, participant: MeetingParticipant }[]> {
    const participants = Array.from(this.meetingParticipants.values())
      .filter(p => p.meetingId === meetingId);
    
    return participants.map(participant => {
      const user = this.users.get(participant.userId);
      if (!user) throw new Error(`User with ID ${participant.userId} not found`);
      return { user, participant };
    });
  }

  async isUserMeetingParticipant(userId: number, meetingId: number): Promise<boolean> {
    return Array.from(this.meetingParticipants.values()).some(
      p => p.meetingId === meetingId && p.userId === userId
    );
  }

  async addMeetingParticipant(participant: InsertMeetingParticipant): Promise<MeetingParticipant> {
    const id = this.currentIds.participants++;
    const newParticipant: MeetingParticipant = { ...participant, id };
    this.meetingParticipants.set(id, newParticipant);
    return newParticipant;
  }

  async removeMeetingParticipants(meetingId: number): Promise<void> {
    const participantIds = Array.from(this.meetingParticipants.entries())
      .filter(([_, p]) => p.meetingId === meetingId)
      .map(([id, _]) => id);
    
    participantIds.forEach(id => this.meetingParticipants.delete(id));
  }

  // Attendance records methods
  async getAttendanceRecordById(id: number): Promise<AttendanceRecord | undefined> {
    return this.attendanceRecords.get(id);
  }

  async getAttendanceRecord(meetingId: number, userId: number): Promise<AttendanceRecord | undefined> {
    return Array.from(this.attendanceRecords.values()).find(
      record => record.meetingId === meetingId && record.userId === userId
    );
  }

  async getMeetingAttendance(meetingId: number): Promise<{ record: AttendanceRecord, user: User }[]> {
    const records = Array.from(this.attendanceRecords.values())
      .filter(record => record.meetingId === meetingId);
    
    return records.map(record => {
      const user = this.users.get(record.userId);
      if (!user) throw new Error(`User with ID ${record.userId} not found`);
      return { record, user };
    });
  }

  async getUserAttendanceHistory(userId: number): Promise<{ record: AttendanceRecord, meeting: Meeting }[]> {
    const records = Array.from(this.attendanceRecords.values())
      .filter(record => record.userId === userId)
      .sort((a, b) => {
        // Sort by check-in time descending
        const timeA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
        const timeB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
        return timeB - timeA;
      });
    
    return records.map(record => {
      const meeting = this.meetings.get(record.meetingId);
      if (!meeting) throw new Error(`Meeting with ID ${record.meetingId} not found`);
      return { record, meeting };
    });
  }

  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const id = this.currentIds.records++;
    const now = new Date();
    const newRecord: AttendanceRecord = { ...record, id, createdAt: now };
    this.attendanceRecords.set(id, newRecord);
    return newRecord;
  }

  async updateAttendanceRecord(id: number, record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const existingRecord = this.attendanceRecords.get(id);
    if (!existingRecord) {
      throw new Error(`Attendance record with ID ${id} not found`);
    }
    
    const updatedRecord: AttendanceRecord = { 
      ...record, 
      id, 
      createdAt: existingRecord.createdAt 
    };
    
    this.attendanceRecords.set(id, updatedRecord);
    return updatedRecord;
  }

  // Dashboard stats methods
  async getAdminDashboardStats(): Promise<{
    activeMeetings: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
  }> {
    const todayMeetings = await this.getTodayMeetings();
    const now = new Date();
    
    // Count active meetings (current time is between start and end time)
    const activeMeetings = todayMeetings.filter(meeting => {
      const startTime = new Date(meeting.startTime);
      const endTime = new Date(meeting.endTime);
      return now >= startTime && now <= endTime;
    }).length;
    
    // Count attendance for today
    let presentToday = 0;
    let lateToday = 0;
    let absentToday = 0;
    
    const todayMeetingIds = todayMeetings.map(m => m.id);
    const todayRecords = Array.from(this.attendanceRecords.values())
      .filter(record => todayMeetingIds.includes(record.meetingId));
    
    for (const record of todayRecords) {
      if (record.status === "present") presentToday++;
      else if (record.status === "late") lateToday++;
      else if (record.status === "absent") absentToday++;
    }
    
    return {
      activeMeetings,
      presentToday,
      lateToday,
      absentToday
    };
  }

  async getUserDashboardStats(userId: number): Promise<{
    upcomingMeetings: number;
    totalPresent: number;
    totalLate: number;
    totalAbsent: number;
  }> {
    const userMeetings = await this.getUserMeetings(userId);
    const now = new Date();
    
    // Count upcoming meetings
    const upcomingMeetings = userMeetings.filter(meeting => {
      const startTime = new Date(meeting.startTime);
      return startTime > now;
    }).length;
    
    // Count user attendance records
    const userRecords = Array.from(this.attendanceRecords.values())
      .filter(record => record.userId === userId);
    
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    
    for (const record of userRecords) {
      if (record.status === "present") totalPresent++;
      else if (record.status === "late") totalLate++;
      else if (record.status === "absent") totalAbsent++;
    }
    
    return {
      upcomingMeetings,
      totalPresent,
      totalLate,
      totalAbsent
    };
  }
}

export const storage = new MemStorage();
