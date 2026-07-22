import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date"); // YYYYMMDD format

  let targetDate = dateParam;
  if (!targetDate) {
    // Get current date in KST (UTC+9)
    const kstDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const year = kstDate.getUTCFullYear();
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(kstDate.getUTCDate()).padStart(2, "0");
    targetDate = `${year}${month}${day}`;
  }

  // ATPT_OFCDC_SC_CODE: C10 (Busan Metropolitan Office of Education)
  // SD_SCHUL_CODE: 1421117 (Busan Mechanical Technical High School)
  const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=C10&SD_SCHUL_CODE=1421117&MLSV_YMD=${targetDate}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    
    if (!res.ok) {
      throw new Error("Failed to fetch from NEIS API");
    }

    const data = await res.json();

    if (!data.mealServiceDietInfo) {
      return NextResponse.json({
        date: targetDate,
        meals: [],
        message: "이 날의 급식 정보가 존재하지 않습니다.",
      });
    }

    const rows = data.mealServiceDietInfo[1].row;
    
    // Process and clean up meal rows
    const meals = rows.map((row: any) => {
      // Clean up the dish list: remove allergy numbers (e.g., *1.2.5.13) and clean HTML tags
      const rawDish = row.DDISH_NM || "";
      const dishes = rawDish
        .split("<br/>")
        .map((dish: string) => {
          // Remove allergy numbers like (1.2.3) or (5.) or (13) at the end of the dish name
          return dish.replace(/\s*\([\d.]+\)\s*$/g, "").replace(/\*+$/, "").trim();
        })
        .filter((dish: string) => dish.length > 0);

      return {
        type: row.MMEAL_SC_NM, // 조식, 중식, 석식
        code: row.MMEAL_SC_CODE, // 1, 2, 3
        calories: row.CAL_INFO,
        dishes: dishes,
      };
    });

    // Sort meals: Breakfast (1) -> Lunch (2) -> Dinner (3)
    meals.sort((a: any, b: any) => Number(a.code) - Number(b.code));

    return NextResponse.json({
      date: targetDate,
      meals: meals,
      message: "Success",
    });
  } catch (error: any) {
    console.error("NEIS API Error:", error);
    return NextResponse.json(
      {
        date: targetDate,
        meals: [],
        error: "급식 정보를 불러오는 중 서버 에러가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
