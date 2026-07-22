import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_FILE_PATH = path.join(process.cwd(), "src/data/timetable.json");

// Helper to read timetable file
async function getTimetable() {
  try {
    const data = await fs.readFile(DATA_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export async function GET() {
  const timetable = await getTimetable();
  return NextResponse.json({ timetable });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { timetable } = body;

    if (!timetable || typeof timetable !== "object") {
      return NextResponse.json({ error: "Invalid timetable format" }, { status: 400 });
    }

    // Ensure the data directory exists
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });

    // Save to file
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(timetable, null, 2), "utf-8");

    return NextResponse.json({ success: true, timetable });
  } catch (error: any) {
    console.error("Save Timetable Error:", error);
    return NextResponse.json(
      { error: "시간표 데이터를 저장하는 중 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
