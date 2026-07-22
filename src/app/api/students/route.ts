import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_FILE_PATH = path.join(process.cwd(), "src/data/students.json");

// Helper to read students file
async function getStudents() {
  try {
    const data = await fs.readFile(DATA_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

export async function GET() {
  const students = await getStudents();
  return NextResponse.json({ students });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { students, textData } = body;

    let studentsToSave = [];

    if (students && Array.isArray(students)) {
      studentsToSave = students;
    } else if (typeof textData === "string") {
      // Parse raw text pasted by the teacher
      // Format examples:
      // 홍길동 106
      // 김철수, 1-3
      // 이영희, 1학년 7반
      const lines = textData.split("\n");
      const parsedStudents = [];

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Split by comma, tab, or whitespace
        const tokens = line.split(/[\s,\t]+/).map(t => t.trim()).filter(Boolean);
        if (tokens.length < 2) continue;

        let name = "";
        let grade = 1;
        let classNum = 0;

        // Try to identify which token is the name and which is the class info
        for (const token of tokens) {
          // Check for 3-digit class representation like 106
          const threeDigitMatch = token.match(/^([1-3])(0[1-9]|1[0-5])$/);
          if (threeDigitMatch) {
            grade = parseInt(threeDigitMatch[1], 10);
            classNum = parseInt(threeDigitMatch[2], 10);
            continue;
          }

          // Check for format like 1-6 or 1-12
          const dashMatch = token.match(/^([1-3])-([1-9]|1[0-5])$/);
          if (dashMatch) {
            grade = parseInt(dashMatch[1], 10);
            classNum = parseInt(dashMatch[2], 10);
            continue;
          }

          // Check for format like 1학년 6반
          const krMatch = token.match(/^([1-3])학년$/) || token.match(/^([1-9]|1[0-5])반$/);
          if (krMatch) {
            if (token.includes("학년")) {
              grade = parseInt(token.replace("학년", ""), 10);
            } else if (token.includes("반")) {
              classNum = parseInt(token.replace("반", ""), 10);
            }
            continue;
          }

          // Fallback check if it's a number and we haven't assigned classNum yet
          if (/^\d+$/.test(token) && classNum === 0) {
            const num = parseInt(token, 10);
            if (num >= 1 && num <= 15) {
              classNum = num;
            }
            continue;
          }

          // Otherwise, treat as student name (if mostly alphabetic/Korean)
          if (/^[a-zA-Z가-힣]+$/.test(token) && !name) {
            name = token;
          }
        }

        // If we found at least a name and a class number, add it
        if (name && classNum > 0) {
          parsedStudents.push({ name, grade, class: classNum });
        }
      }

      studentsToSave = parsedStudents;
    } else {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // Ensure the data directory exists
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
    
    // Save to file
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(studentsToSave, null, 2), "utf-8");

    return NextResponse.json({ 
      success: true, 
      count: studentsToSave.length,
      students: studentsToSave 
    });

  } catch (error: any) {
    console.error("Save Students Error:", error);
    return NextResponse.json(
      { error: "학생 데이터를 저장하는 중 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
