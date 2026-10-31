import { NextResponse } from "next/server";

export async function GET() {
  const csvHeaders = [
    "student_id",
    "student_name",
    "email",
    "course_code",
    "academic_year",
    "semester",
    "section",
    "enrollment_status",
  ].join(",");

  const sampleRows = [
    "S001,Aarav Sharma,aarav.sharma@academic.ai,CSE4001,2025-2026,8,A,ACTIVE",
    "S002,Priya Nair,priya.nair@academic.ai,CSE3002,2025-2026,8,A,ACTIVE",
    "S003,Karthik R,karthik.r@academic.ai,CSE2004,2025-2026,6,B,ACTIVE",
    "S004,Sneha Patel,sneha.patel@academic.ai,CSE2001,2025-2026,6,A,ACTIVE",
    "S005,Rohit Kumar,rohit.kumar@academic.ai,CSE4001,2025-2026,8,C,ACTIVE",
    "S006,Ananya Iyer,ananya.iyer@academic.ai,CSE3001,2025-2026,8,B,ACTIVE",
    "S007,Vikram Singh,vikram.singh@academic.ai,CSE4001,2025-2026,8,A,ACTIVE",
    "S008,Divya Menon,divya.menon@academic.ai,CSE3002,2025-2026,8,B,ACTIVE",
  ].join("\n");

  const fullCsv = `${csvHeaders}\n${sampleRows}\n`;

  return new NextResponse(fullCsv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="academic_student_roster_template.csv"',
    },
  });
}
