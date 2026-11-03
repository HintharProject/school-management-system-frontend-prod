export interface DummyCohort {
  id: number
  code: string
  level: "IG" | "IAL" | "Year6" | "Year7" | "Year8" | "Year9"
  levelLabel: string
  stream: string
  studentCount: number
  subjectCount: number
  slotCount: number
}

export const DUMMY_COHORTS: DummyCohort[] = [
  {
    id: 1,
    code: "IG K1",
    level: "IG",
    levelLabel: "IGCSE",
    stream: "K · 1",
    studentCount: 24,
    subjectCount: 6,
    slotCount: 18,
  },
  {
    id: 2,
    code: "IG K2",
    level: "IG",
    levelLabel: "IGCSE",
    stream: "K · 2",
    studentCount: 22,
    subjectCount: 6,
    slotCount: 18,
  },
  {
    id: 3,
    code: "IAL A1",
    level: "IAL",
    levelLabel: "IAL (A Level)",
    stream: "A · 1",
    studentCount: 18,
    subjectCount: 5,
    slotCount: 16,
  },
  {
    id: 4,
    code: "IAL B1",
    level: "IAL",
    levelLabel: "IAL (A Level)",
    stream: "B · 1",
    studentCount: 16,
    subjectCount: 5,
    slotCount: 16,
  },
  {
    id: 5,
    code: "Year8 A",
    level: "Year8",
    levelLabel: "Year 8",
    stream: "A",
    studentCount: 26,
    subjectCount: 7,
    slotCount: 20,
  },
  {
    id: 6,
    code: "Year9 A",
    level: "Year9",
    levelLabel: "Year 9",
    stream: "A",
    studentCount: 25,
    subjectCount: 7,
    slotCount: 20,
  },
  {
    id: 7,
    code: "Year7 A",
    level: "Year7",
    levelLabel: "Year 7",
    stream: "A",
    studentCount: 23,
    subjectCount: 7,
    slotCount: 19,
  },
]

export const DUMMY_COHORTS_NO_IAL: DummyCohort[] = DUMMY_COHORTS.filter(
  (c) => c.level !== "IAL"
)

export interface DummySubject {
  id: number
  code: string
  name: string
  cohorts: string[]
  teachers: string[]
  weeklyHours: number
}

export const DUMMY_SUBJECTS: DummySubject[] = [
  {
    id: 1,
    code: "SUB-01",
    name: "Mathematics",
    cohorts: ["IG K1", "IG K2", "IAL A1", "Year8 A", "Year9 A"],
    teachers: ["Daw Su Su", "U Thura Aung"],
    weeklyHours: 6,
  },
  {
    id: 2,
    code: "SUB-02",
    name: "Physics",
    cohorts: ["IG K1", "IG K2", "IAL A1", "IAL B1"],
    teachers: ["U Kyaw Swar", "Dr. Myo Min"],
    weeklyHours: 4.5,
  },
  {
    id: 3,
    code: "SUB-03",
    name: "Chemistry",
    cohorts: ["IG K1", "IG K2", "IAL A1", "IAL B1"],
    teachers: ["Dr. Myo Min", "Daw Hnin Wai"],
    weeklyHours: 4.5,
  },
  {
    id: 4,
    code: "SUB-04",
    name: "Computer Science",
    cohorts: ["IG K1", "IAL A1", "Year8 A", "Year9 A"],
    teachers: ["U Nay Lin", "U Thura Aung"],
    weeklyHours: 3,
  },
  {
    id: 5,
    code: "SUB-05",
    name: "English Literature",
    cohorts: ["IG K2", "IAL B1", "Year8 A", "Year9 A", "Year7 A"],
    teachers: ["Daw May Thu", "Daw Zin Mar"],
    weeklyHours: 4.5,
  },
  {
    id: 6,
    code: "SUB-06",
    name: "Biology",
    cohorts: ["IG K1", "IG K2", "IAL B1"],
    teachers: ["Daw Hnin Wai"],
    weeklyHours: 4.5,
  },
  {
    id: 7,
    code: "SUB-07",
    name: "Further Mathematics",
    cohorts: ["IAL A1"],
    teachers: ["Daw Su Su"],
    weeklyHours: 4.5,
  },
]

export interface DummyStudent {
  id: number
  code: string
  name: string
  schoolCode: "HIS" | "MYA" | string
  cohorts: string[]
  qrActive: boolean
  qrToken: string
  checkedInToday: boolean
  checkInTime: string | null
  checkInMethod: "qr" | "manual" | "QR" | "MANUAL" | null
  attendanceRate: number | string
  contact: string
}

export const DUMMY_STUDENTS: DummyStudent[] = [
  {
    id: 1,
    code: "STU-1042",
    name: "Aung Khant Kyaw",
    schoolCode: "HIS-26-1042",
    cohorts: ["IG K1"],
    qrActive: true,
    qrToken: "HNT-QR-2026-1-8F3A",
    checkedInToday: true,
    checkInTime: "08:14 AM",
    checkInMethod: "QR",
    attendanceRate: 98.2,
    contact: "+95 9 421 088 112",
  },
  {
    id: 2,
    code: "STU-1048",
    name: "May Myat Noe",
    schoolCode: "HIS-26-1048",
    cohorts: ["IG K1"],
    qrActive: true,
    qrToken: "HNT-QR-2026-2-2C9B",
    checkedInToday: true,
    checkInTime: "08:21 AM",
    checkInMethod: "QR",
    attendanceRate: 96.4,
    contact: "+95 9 795 314 209",
  },
  {
    id: 3,
    code: "STU-2015",
    name: "Htet Wai Yan",
    schoolCode: "MYA-26-2015",
    cohorts: ["IG K1", "IAL A1"],
    qrActive: false,
    qrToken: "HNT-QR-2026-3-REVOKED",
    checkedInToday: true,
    checkInTime: "08:42 AM",
    checkInMethod: "MANUAL",
    attendanceRate: 89.5,
    contact: "+95 9 250 619 884",
  },
  {
    id: 4,
    code: "STU-1055",
    name: "Yoon Wadi Lwin",
    schoolCode: "HIS-26-1055",
    cohorts: ["IAL A1"],
    qrActive: true,
    qrToken: "HNT-QR-2026-4-9D1E",
    checkedInToday: false,
    checkInTime: null,
    checkInMethod: null,
    attendanceRate: 91.0,
    contact: "+95 9 440 128 773",
  },
  {
    id: 5,
    code: "STU-1061",
    name: "Thuta Zaw",
    schoolCode: "HIS-26-1061",
    cohorts: ["IG K2"],
    qrActive: true,
    qrToken: "HNT-QR-2026-5-4A7C",
    checkedInToday: true,
    checkInTime: "08:09 AM",
    checkInMethod: "QR",
    attendanceRate: 99.1,
    contact: "+95 9 965 442 018",
  },
  {
    id: 6,
    code: "STU-2029",
    name: "Eaindra Phyu",
    schoolCode: "MYA-26-2029",
    cohorts: ["IAL B1"],
    qrActive: false,
    qrToken: "HNT-QR-2026-6-EXPIRED",
    checkedInToday: false,
    checkInTime: null,
    checkInMethod: null,
    attendanceRate: 84.2,
    contact: "+95 9 782 901 554",
  },
  {
    id: 7,
    code: "STU-1074",
    name: "Min Khant Sithu",
    schoolCode: "HIS-26-1074",
    cohorts: ["Year8 A"],
    qrActive: true,
    qrToken: "HNT-QR-2026-7-7B2F",
    checkedInToday: true,
    checkInTime: "08:30 AM",
    checkInMethod: "MANUAL",
    attendanceRate: 94.8,
    contact: "+95 9 450 882 310",
  },
]

export interface DummyTimetableSlot {
  id: string
  cohortCode: string
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
  timeRange: string
  subject: string
  assignedTeacher: string
  substituteTeacher: string | null
  room: string
  upcomingDates: {
    date: string
    status: "scheduled" | "completed" | "substituted"
    actualTeacher: string
    presentCount: number | string
    totalCount: number
  }[]
}

export const DUMMY_SLOTS: DummyTimetableSlot[] = [
  {
    id: "SLOT-IGK1-MON-1",
    cohortCode: "IG K1",
    day: "Mon",
    timeRange: "09:00 - 10:30",
    subject: "Mathematics",
    assignedTeacher: "Daw Su Su",
    substituteTeacher: null,
    room: "RM-201",
    upcomingDates: [
      {
        date: "2026-11-02",
        status: "completed",
        actualTeacher: "Daw Su Su",
        presentCount: 23,
        totalCount: 24,
      },
      {
        date: "2026-11-09",
        status: "scheduled",
        actualTeacher: "Daw Su Su",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-MON-2",
    cohortCode: "IG K1",
    day: "Mon",
    timeRange: "11:00 - 13:00",
    subject: "Physics",
    assignedTeacher: "U Kyaw Swar",
    substituteTeacher: "Dr. Myo Min",
    room: "LAB-A2",
    upcomingDates: [
      {
        date: "2026-11-02",
        status: "substituted",
        actualTeacher: "Dr. Myo Min",
        presentCount: 24,
        totalCount: 24,
      },
      {
        date: "2026-11-09",
        status: "scheduled",
        actualTeacher: "U Kyaw Swar",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-TUE-1",
    cohortCode: "IG K1",
    day: "Tue",
    timeRange: "10:00 - 12:00",
    subject: "Chemistry",
    assignedTeacher: "Dr. Myo Min",
    substituteTeacher: null,
    room: "LAB-B1",
    upcomingDates: [
      {
        date: "2026-11-03",
        status: "completed",
        actualTeacher: "Dr. Myo Min",
        presentCount: 22,
        totalCount: 24,
      },
      {
        date: "2026-11-10",
        status: "scheduled",
        actualTeacher: "Dr. Myo Min",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-TUE-2",
    cohortCode: "IG K1",
    day: "Tue",
    timeRange: "14:00 - 15:30",
    subject: "Computer Science",
    assignedTeacher: "U Nay Lin",
    substituteTeacher: null,
    room: "COMP-01",
    upcomingDates: [
      {
        date: "2026-11-03",
        status: "scheduled",
        actualTeacher: "U Nay Lin",
        presentCount: 24,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-WED-1",
    cohortCode: "IG K1",
    day: "Wed",
    timeRange: "09:30 - 11:00",
    subject: "Mathematics",
    assignedTeacher: "Daw Su Su",
    substituteTeacher: null,
    room: "RM-201",
    upcomingDates: [
      {
        date: "2026-11-04",
        status: "scheduled",
        actualTeacher: "Daw Su Su",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-WED-2",
    cohortCode: "IG K1",
    day: "Wed",
    timeRange: "13:30 - 15:00",
    subject: "English Literature",
    assignedTeacher: "Daw May Thu",
    substituteTeacher: null,
    room: "RM-202",
    upcomingDates: [
      {
        date: "2026-11-04",
        status: "scheduled",
        actualTeacher: "Daw May Thu",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-WED-3",
    cohortCode: "IG K1",
    day: "Wed",
    timeRange: "15:30 - 17:00",
    subject: "Chemistry Lab",
    assignedTeacher: "Dr. Myo Min",
    substituteTeacher: null,
    room: "LAB-B1",
    upcomingDates: [
      {
        date: "2026-11-04",
        status: "scheduled",
        actualTeacher: "Dr. Myo Min",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-THU-1",
    cohortCode: "IG K1",
    day: "Thu",
    timeRange: "09:00 - 11:00",
    subject: "Computer Science",
    assignedTeacher: "U Nay Lin",
    substituteTeacher: null,
    room: "COMP-01",
    upcomingDates: [
      {
        date: "2026-11-05",
        status: "scheduled",
        actualTeacher: "U Nay Lin",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-THU-2",
    cohortCode: "IG K1",
    day: "Thu",
    timeRange: "13:00 - 14:30",
    subject: "Biology",
    assignedTeacher: "Daw Hnin Wai",
    substituteTeacher: "Dr. Myo Min",
    room: "LAB-B2",
    upcomingDates: [
      {
        date: "2026-11-05",
        status: "substituted",
        actualTeacher: "Dr. Myo Min",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-FRI-1",
    cohortCode: "IG K1",
    day: "Fri",
    timeRange: "10:00 - 11:30",
    subject: "Physics",
    assignedTeacher: "U Kyaw Swar",
    substituteTeacher: null,
    room: "LAB-A2",
    upcomingDates: [
      {
        date: "2026-11-06",
        status: "scheduled",
        actualTeacher: "U Kyaw Swar",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-FRI-2",
    cohortCode: "IG K1",
    day: "Fri",
    timeRange: "14:00 - 16:00",
    subject: "Mathematics",
    assignedTeacher: "Daw Su Su",
    substituteTeacher: null,
    room: "RM-201",
    upcomingDates: [
      {
        date: "2026-11-06",
        status: "scheduled",
        actualTeacher: "Daw Su Su",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-SAT-1",
    cohortCode: "IG K1",
    day: "Sat",
    timeRange: "09:00 - 11:30",
    subject: "IGCSE Past Paper Clinic",
    assignedTeacher: "Daw Su Su",
    substituteTeacher: null,
    room: "HALL-01",
    upcomingDates: [
      {
        date: "2026-11-07",
        status: "scheduled",
        actualTeacher: "Daw Su Su",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-SAT-2",
    cohortCode: "IG K1",
    day: "Sat",
    timeRange: "13:00 - 15:00",
    subject: "Biology Practical",
    assignedTeacher: "Daw Hnin Wai",
    substituteTeacher: null,
    room: "LAB-B2",
    upcomingDates: [
      {
        date: "2026-11-07",
        status: "scheduled",
        actualTeacher: "Daw Hnin Wai",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IGK1-SUN-1",
    cohortCode: "IG K1",
    day: "Sun",
    timeRange: "10:00 - 12:30",
    subject: "Physics Olympiad Prep",
    assignedTeacher: "U Kyaw Swar",
    substituteTeacher: "Dr. Myo Min",
    room: "LAB-A2",
    upcomingDates: [
      {
        date: "2026-11-08",
        status: "substituted",
        actualTeacher: "Dr. Myo Min",
        presentCount: 0,
        totalCount: 24,
      },
    ],
  },
  {
    id: "SLOT-IALA1-MON-1",
    cohortCode: "IAL A1",
    day: "Mon",
    timeRange: "09:00 - 11:00",
    subject: "Further Mathematics",
    assignedTeacher: "Daw Su Su",
    substituteTeacher: null,
    room: "RM-304",
    upcomingDates: [
      {
        date: "2026-11-02",
        status: "completed",
        actualTeacher: "Daw Su Su",
        presentCount: 18,
        totalCount: 18,
      },
    ],
  },
  {
    id: "SLOT-IALA1-WED-1",
    cohortCode: "IAL A1",
    day: "Wed",
    timeRange: "11:00 - 13:00",
    subject: "Physics",
    assignedTeacher: "Dr. Myo Min",
    substituteTeacher: null,
    room: "LAB-A1",
    upcomingDates: [
      {
        date: "2026-11-04",
        status: "scheduled",
        actualTeacher: "Dr. Myo Min",
        presentCount: 0,
        totalCount: 18,
      },
    ],
  },
  {
    id: "SLOT-IALA1-FRI-1",
    cohortCode: "IAL A1",
    day: "Fri",
    timeRange: "14:00 - 16:00",
    subject: "Chemistry",
    assignedTeacher: "Daw Hnin Wai",
    substituteTeacher: "Dr. Myo Min",
    room: "LAB-B1",
    upcomingDates: [
      {
        date: "2026-11-06",
        status: "substituted",
        actualTeacher: "Dr. Myo Min",
        presentCount: 0,
        totalCount: 18,
      },
    ],
  },
  {
    id: "SLOT-IALA1-SAT-1",
    cohortCode: "IAL A1",
    day: "Sat",
    timeRange: "10:00 - 13:00",
    subject: "A-Level Mock Seminar",
    assignedTeacher: "Dr. Myo Min",
    substituteTeacher: null,
    room: "RM-304",
    upcomingDates: [
      {
        date: "2026-11-07",
        status: "scheduled",
        actualTeacher: "Dr. Myo Min",
        presentCount: 0,
        totalCount: 18,
      },
    ],
  },
]

export const V2_NAVIGATION_MAP: {
  id: string
  label: string
  route: string
  badge?: string
  replaces: string[]
  description: string
}[] = [
  {
    id: "overview",
    label: "Overview",
    route: "/overview",
    badge: "LIVE",
    replaces: ["/overview", "/analytics-cards"],
    description:
      "Daily operational telemetry, campus check-in pulse, and exception queues.",
  },
  {
    id: "check-in",
    label: "Check-In",
    route: "/check-in",
    badge: "GATE",
    replaces: ["/check-in", "/qr-scanner", "/manual-gate"],
    description:
      "Unified QR scanner & instant manual gate verification terminal.",
  },
  {
    id: "attendance",
    label: "Attendance",
    route: "/attendance",
    badge: "ROLL",
    replaces: [
      "/attendance",
      "/attendance/daily",
      "/attendance/sessions",
      "/attendance/reports",
    ],
    description:
      "Daily campus ledger, cohort session roll-call, and exception resolution.",
  },
  {
    id: "schedule",
    label: "Schedule",
    route: "/schedule",
    badge: "GRID",
    replaces: [
      "/schedule",
      "/timetable",
      "/substitutions",
      "/teacher-assignments",
    ],
    description:
      "Interactive cohort timetable matrix, room allocation, and substitute teacher dispatch.",
  },
  {
    id: "academics",
    label: "Academics",
    route: "/classes",
    badge: "HUB",
    replaces: ["/classes", "/cohorts", "/subjects", "/curriculum"],
    description:
      "Cohort streams (IG K1, IAL A1, Year 6–9) and global subject catalog.",
  },
  {
    id: "students",
    label: "Directory",
    route: "/students",
    badge: "QR",
    replaces: ["/students", "/teachers", "/qr-passes", "/staff-directory"],
    description:
      "Unified student & faculty registry with inline QR credential inspector.",
  },
  {
    id: "communications",
    label: "Communications",
    route: "/communications",
    badge: "3",
    replaces: ["/communications", "/announcements", "/guardian-alerts"],
    description:
      "Broadcast notices, absence alerts, and guardian dispatch logs.",
  },
]
