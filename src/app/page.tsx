"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Student {
  name: string;
  grade: number;
  class: number;
}

interface TimetableSlot {
  day: string;
  period: number;
  time: string;
  teacher: string;
  location: string;
}

interface Timetable {
  [classId: string]: TimetableSlot;
}

interface Meal {
  type: string;
  code: string;
  calories: string;
  dishes: string[];
}

export default function Home() {
  // State variables
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState("");
  
  const [mealDate, setMealDate] = useState("");
  const [mealData, setMealData] = useState<Meal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [mealMessage, setMealMessage] = useState("");
  
  const [timetable, setTimetable] = useState<Timetable>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  // Meal selection and live clock state
  const [selectedMealType, setSelectedMealType] = useState("중식");
  const [currentTime, setCurrentTime] = useState("");

  // Initialize dates and live clock
  useEffect(() => {
    const kstOffset = 9 * 60 * 60 * 1000;
    const nowKst = new Date(new Date().getTime() + kstOffset);
    const localHour = new Date().getHours();
    
    let targetDateKst = new Date(nowKst);
    let initialMealType = "중식";
    
    if (localHour >= 19) {
      // After 7 PM, advance date to tomorrow
      targetDateKst.setUTCDate(targetDateKst.getUTCDate() + 1);
      initialMealType = "조식";
    } else if (localHour < 9) {
      initialMealType = "조식";
    } else if (localHour >= 14) {
      initialMealType = "석식";
    }
    
    const yyyy = targetDateKst.getUTCFullYear();
    const mm = String(targetDateKst.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(targetDateKst.getUTCDate()).padStart(2, "0");
    const formattedDate = `${yyyy}${mm}${dd}`;
    setMealDate(formattedDate);
    setSelectedMealType(initialMealType);

    // Setup live clock
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    // Fetch timetable and students database
    fetchTimetableAndStudents();

    return () => clearInterval(clockInterval);
  }, []);

  const getAvailableMealTypes = (dateStr: string) => {
    if (!dateStr) return ["조식", "중식", "석식"];
    const kstOffset = 9 * 60 * 60 * 1000;
    const nowKst = new Date(new Date().getTime() + kstOffset);
    const todayY = nowKst.getUTCFullYear();
    const todayM = String(nowKst.getUTCMonth() + 1).padStart(2, "0");
    const todayD = String(nowKst.getUTCDate()).padStart(2, "0");
    const todayStr = `${todayY}${todayM}${todayD}`;

    if (dateStr > todayStr) {
      return ["조식", "중식", "석식"];
    } else if (dateStr < todayStr) {
      return ["조식", "중식", "석식"];
    } else {
      const hour = new Date().getHours();
      if (hour < 9) return ["조식", "중식", "석식"];
      if (hour < 14) return ["중식", "석식"];
      if (hour < 19) return ["석식"];
      return [];
    }
  };

  // Keep selectedMealType in available types on date change
  useEffect(() => {
    if (mealDate) {
      const available = getAvailableMealTypes(mealDate);
      if (available.length > 0 && !available.includes(selectedMealType)) {
        setSelectedMealType(available[0]);
      }
    }
  }, [mealDate, selectedMealType]);

  // Fetch meals when date changes
  useEffect(() => {
    if (mealDate) {
      fetchMeals(mealDate);
    }
  }, [mealDate]);

  const fetchTimetableAndStudents = async () => {
    setLoadingTimetable(true);
    try {
      const timeRes = await fetch("/api/timetable");
      const timeData = await timeRes.json();
      if (timeData.timetable) {
        setTimetable(timeData.timetable);
      }

      const studRes = await fetch("/api/students");
      const studData = await studRes.json();
      if (studData.students) {
        setStudents(studData.students);
      }
    } catch (err) {
      console.error("Error loading databases:", err);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const fetchMeals = async (dateStr: string) => {
    setLoadingMeals(true);
    setMealMessage("");
    try {
      const res = await fetch(`/api/meals?date=${dateStr}`);
      const data = await res.json();
      if (res.ok) {
        setMealData(data.meals || []);
        if (data.meals.length === 0) {
          setMealMessage(data.message || "이 날은 등록된 급식 정보가 없습니다.");
        }
      } else {
        setMealData([]);
        setMealMessage("급식 정보를 가져오지 못했습니다.");
      }
    } catch (err) {
      console.error("Error fetching meals:", err);
      setMealData([]);
      setMealMessage("급식 서버와의 통신 에러가 발생했습니다.");
    } finally {
      setLoadingMeals(false);
    }
  };

  // Helper to change meal dates
  const handleDateOffset = (offset: number) => {
    if (!mealDate) return;
    const y = parseInt(mealDate.substring(0, 4), 10);
    const m = parseInt(mealDate.substring(4, 6), 10) - 1;
    const d = parseInt(mealDate.substring(6, 8), 10);
    
    const current = new Date(Date.UTC(y, m, d));
    current.setUTCDate(current.getUTCDate() + offset);
    
    const newY = current.getUTCFullYear();
    const newM = String(current.getUTCMonth() + 1).padStart(2, "0");
    const newD = String(current.getUTCDate()).padStart(2, "0");
    setMealDate(`${newY}${newM}${newD}`);
  };

  const getDayName = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return "";
    const y = parseInt(dateStr.substring(0, 4), 10);
    const m = parseInt(dateStr.substring(4, 6), 10) - 1;
    const d = parseInt(dateStr.substring(6, 8), 10);
    const date = new Date(y, m, d);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return days[date.getDay()];
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return "";
    const y = dateStr.substring(0, 4);
    const m = dateStr.substring(4, 6);
    const d = dateStr.substring(6, 8);
    const dayName = getDayName(dateStr);
    return `${y}년 ${m}월 ${d}일 (${dayName}요일)`;
  };

  // Student Search Handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchResult(null);
    setSearchError("");

    const query = searchQuery.trim();
    if (!query) {
      setSearchError("검색어를 입력해 주세요.");
      return;
    }

    // 1. Try to parse as class number (e.g. 106, 1-6, 1학년 6반)
    let searchedClassNum = "";
    
    const classPattern1 = query.match(/^([1-3])(0[1-9]|1[0-5])$/); // 106, 112
    const classPattern2 = query.match(/^([1-3])-([1-9]|1[0-5])$/); // 1-6
    const classPattern3 = query.match(/^([1-3])학년\s*([1-9]|1[0-5])반$/); // 1학년 6반

    if (classPattern1) {
      searchedClassNum = classPattern1[1] + String(parseInt(classPattern1[2], 10)); // e.g. "1" + "6" = "16" but let's map to "106"
      searchedClassNum = classPattern1[1] + String(parseInt(classPattern1[2], 10)).padStart(2, "0");
    } else if (classPattern2) {
      searchedClassNum = classPattern2[1] + classPattern2[2].padStart(2, "0");
    } else if (classPattern3) {
      searchedClassNum = classPattern3[1] + classPattern3[2].padStart(2, "0");
    } else if (/^[1-9]|1[0-5]$/.test(query)) {
      // Just a single number (assume class number for 1st grade)
      searchedClassNum = "1" + query.padStart(2, "0");
    }

    // If it is identified as a class search
    if (searchedClassNum) {
      const slot = timetable[searchedClassNum];
      if (slot) {
        setSearchResult({
          type: "class",
          classId: searchedClassNum,
          grade: parseInt(searchedClassNum[0], 10),
          classNum: parseInt(searchedClassNum.substring(1), 10),
          day: slot.day,
          period: slot.period,
          time: slot.time,
          teacher: slot.teacher,
          location: slot.location || "지정되지 않음",
        });
        return;
      } else {
        setSearchError(`해당 학급(${query})의 발명 수업 정보를 찾을 수 없습니다.`);
        return;
      }
    }

    // 2. Search by student name
    const matchedStudents = students.filter(
      (s) => s.name.toLowerCase() === query.toLowerCase()
    );

    if (matchedStudents.length > 0) {
      const student = matchedStudents[0]; // Take first match
      const classId = `${student.grade}${String(student.class).padStart(2, "0")}`;
      const slot = timetable[classId];

      if (slot) {
        setSearchResult({
          type: "student",
          name: student.name,
          grade: student.grade,
          classNum: student.class,
          day: slot.day,
          period: slot.period,
          time: slot.time,
          teacher: slot.teacher,
          location: slot.location || "지정되지 않음",
        });
      } else {
        setSearchResult({
          type: "student-no-class",
          name: student.name,
          grade: student.grade,
          classNum: student.class,
          message: "해당 반은 이번 주 발명 수업이 없거나 장소가 지정되지 않았습니다.",
        });
      }
    } else {
      setSearchError(`'${query}' 학생 또는 학급을 찾을 수 없습니다. 이름을 정확히 입력하거나 학급(예: 106)을 검색해주세요.`);
    }
  };

  // Helper to find slot content for grid rendering
  const getGridCell = (dayName: string, periodNum: number) => {
    // Find class that has this day and period
    const matchedClass = Object.keys(timetable).find((classId) => {
      const slot = timetable[classId];
      return slot.day === dayName && slot.period === periodNum;
    });

    if (matchedClass) {
      const details = timetable[matchedClass];
      const displayClass = `${parseInt(matchedClass[0], 10)}-${parseInt(matchedClass.substring(1), 10)}`;
      return {
        classId: matchedClass,
        displayClass: `${displayClass}반`,
        location: details.location,
        teacher: details.teacher,
      };
    }
    return null;
  };

  // Timetable definition matching the user's image
  const days = ["월", "화", "수", "목", "금"];
  const periods = [
    { num: 1, time: "08:40 ~ 09:30" },
    { num: 2, time: "09:40 ~ 10:30" },
    { num: 3, time: "10:40 ~ 11:30" },
    { num: 4, time: "11:40 ~ 12:30" },
    { num: 5, time: "13:30 ~ 14:20" },
    { num: 6, time: "14:30 ~ 15:20" },
    { num: 7, time: "15:30 ~ 16:20" },
  ];

  return (
    <>
      {/* Navigation Header */}
      <header className="nav-header">
        <div className="container nav-container">
          <Link href="/" className="nav-logo">
            부산기계공고 <span>1학년 발명 교과</span>
          </Link>
          <nav className="nav-links">
            <Link href="/" className="nav-link active">
              메인 홈
            </Link>
            <Link href="/admin" className="nav-link">
              교사 관리자
            </Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ paddingBottom: "5rem" }}>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-avatar-container">
            <img src="/teacher_icon.png" alt="Teacher Icon" className="hero-avatar" />
          </div>
          <div className="hero-badge">💡 창의성과 발명의 배움터</div>
          <h1 className="hero-title">
            1학년 발명 교과 <span>이동 교실</span>
          </h1>
          <p className="hero-desc">
            자신의 반 또는 이름을 검색하여<br />
            오늘의 발명 수업 시간 및 교실 위치를 확인하세요.
          </p>
        </section>

        {/* Integration Search Bar */}
        <section className="search-container">
          <form onSubmit={handleSearch} className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="학생 이름(예: 홍길동) 또는 반(예: 106)을 입력하세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              조회하기
            </button>
          </form>

          {/* Search Error */}
          {searchError && (
            <div className="glass" style={{ padding: "1rem", color: "#ef4444", borderRadius: "0.75rem", textAlign: "center", fontWeight: "700" }}>
              ⚠️ {searchError}
            </div>
          )}

          {/* Search Success Result */}
          {searchResult && (
            <div className="glass result-card">
              <h3 className="result-header">
                🔍 {searchResult.type === "student" || searchResult.type === "student-no-class" ? "학생" : "학급"} 조회 결과
              </h3>
              
              {searchResult.type === "student" && (
                <div className="result-grid">
                  <div>
                    <div className="result-item-label">학생 이름</div>
                    <div className="result-item-value">{searchResult.name}</div>
                  </div>
                  <div>
                    <div className="result-item-label">소속 학급</div>
                    <div className="result-item-value">{searchResult.grade}학년 {searchResult.classNum}반</div>
                  </div>
                  <div>
                    <div className="result-item-label">수업 시간</div>
                    <div className="result-item-value">{searchResult.day}요일 {searchResult.period}교시 ({searchResult.time})</div>
                  </div>
                  <div>
                    <div className="result-item-label">수업 장소</div>
                    <div className="result-item-value highlight">{searchResult.location}</div>
                  </div>
                </div>
              )}

              {searchResult.type === "class" && (
                <div className="result-grid">
                  <div>
                    <div className="result-item-label">조회 학급</div>
                    <div className="result-item-value">{searchResult.grade}학년 {searchResult.classNum}반</div>
                  </div>
                  <div>
                    <div className="result-item-label">수업 시간</div>
                    <div className="result-item-value">{searchResult.day}요일 {searchResult.period}교시 ({searchResult.time})</div>
                  </div>
                  <div>
                    <div className="result-item-label">수업 담당</div>
                    <div className="result-item-value">{searchResult.teacher} 선생님</div>
                  </div>
                  <div>
                    <div className="result-item-label">이번 주 수업 장소</div>
                    <div className="result-item-value highlight">{searchResult.location}</div>
                  </div>
                </div>
              )}

              {searchResult.type === "student-no-class" && (
                <div>
                  <p style={{ fontWeight: "700", marginBottom: "0.5rem" }}>
                    👤 {searchResult.name} 학생 ({searchResult.grade}학년 {searchResult.classNum}반)
                  </p>
                  <p style={{ color: "var(--muted)" }}>{searchResult.message}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* School Meals & Main grid */}
        <div className="grid-3" style={{ marginBottom: "4rem" }}>
          
          {/* Meals Section */}
          <section className="glass meal-card" style={{ gridColumn: "span 1" }}>
            <div className="meal-header">
              <span className="meal-type lunch">
                🍱 오늘의 급식
                {currentTime && (
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: "600", marginLeft: "0.5rem" }}>
                    ({currentTime})
                  </span>
                )}
              </span>
              <span className="meal-calories">식단표</span>
            </div>
            
            <div className="meal-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", borderRadius: "0.5rem", fontSize: "0.8rem" }} onClick={() => handleDateOffset(-1)}>
                  ◀ 이전날
                </button>
                <div style={{ textAlign: "center", fontWeight: "700", fontSize: "0.95rem" }}>
                  {formatDateDisplay(mealDate)}
                </div>
                <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", borderRadius: "0.5rem", fontSize: "0.8rem" }} onClick={() => handleDateOffset(1)}>
                  다음날 ▶
                </button>
              </div>

              {/* Meal Type Tabs */}
              {getAvailableMealTypes(mealDate).length > 0 ? (
                <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1rem", background: "rgba(0,0,0,0.03)", padding: "0.25rem", borderRadius: "0.5rem" }}>
                  {getAvailableMealTypes(mealDate).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedMealType(type)}
                      className="btn"
                      style={{
                        flex: 1,
                        padding: "0.35rem 0",
                        fontSize: "0.8rem",
                        borderRadius: "0.35rem",
                        border: "none",
                        cursor: "pointer",
                        background: selectedMealType === type ? "var(--primary)" : "transparent",
                        color: selectedMealType === type ? "#ffffff" : "var(--muted)",
                        fontWeight: selectedMealType === type ? "800" : "600",
                        boxShadow: selectedMealType === type ? "0 2px 8px rgba(var(--primary-rgb), 0.2)" : "none",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {type === "조식" ? "🌅 조식" : type === "중식" ? "☀️ 중식" : "🌙 석식"}
                    </button>
                  ))}
                </div>
              ) : null}

              {loadingMeals ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "150px", fontWeight: "700", color: "var(--muted)" }}>
                  급식 정보를 불러오는 중...
                </div>
              ) : getAvailableMealTypes(mealDate).length === 0 ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "150px", fontWeight: "700", color: "var(--muted)", textAlign: "center" }}>
                  오늘의 모든 급식 운영 시간이 지났습니다.
                </div>
              ) : mealData.length > 0 ? (
                (() => {
                  const filtered = mealData.filter((meal) => meal.type === selectedMealType);
                  if (filtered.length > 0) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", overflowY: "auto", maxHeight: "400px" }}>
                        {filtered.map((meal) => (
                          <div key={meal.type} style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1rem", background: "rgba(var(--primary-rgb), 0.01)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                              <span style={{ 
                                fontWeight: "800", 
                                fontSize: "0.95rem",
                                color: meal.type === "조식" ? "#f59e0b" : meal.type === "중식" ? "#3b82f6" : "#8b5cf6"
                              }}>
                                {meal.type}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: "600" }}>{meal.calories}</span>
                            </div>
                            <ul className="meal-dishes">
                              {meal.dishes.map((dish, i) => (
                                <li key={i} style={{ fontSize: "0.9rem" }}>{dish}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "150px", fontWeight: "700", color: "var(--muted)", textAlign: "center" }}>
                        등록된 {selectedMealType} 정보가 없습니다.
                      </div>
                    );
                  }
                })()
              ) : (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "150px", fontWeight: "700", color: "var(--muted)", textAlign: "center" }}>
                  {mealMessage}
                </div>
              )}

              <div style={{ marginTop: "auto", paddingTop: "1rem", textAlign: "center" }}>
                <button className="btn btn-secondary" style={{ width: "100%", padding: "0.5rem 1rem", fontSize: "0.85rem", borderRadius: "0.75rem" }} onClick={() => {
                  const kstOffset = 9 * 60 * 60 * 1000;
                  const nowKst = new Date(new Date().getTime() + kstOffset);
                  const localHour = new Date().getHours();
                  
                  let targetDateKst = new Date(nowKst);
                  let initialMealType = "중식";
                  
                  if (localHour >= 19) {
                    targetDateKst.setUTCDate(targetDateKst.getUTCDate() + 1);
                    initialMealType = "조식";
                  } else if (localHour < 9) {
                    initialMealType = "조식";
                  } else if (localHour >= 14) {
                    initialMealType = "석식";
                  }
                  
                  const yyyy = targetDateKst.getUTCFullYear();
                  const mm = String(targetDateKst.getUTCMonth() + 1).padStart(2, "0");
                  const dd = String(targetDateKst.getUTCDate()).padStart(2, "0");
                  setMealDate(`${yyyy}${mm}${dd}`);
                  setSelectedMealType(initialMealType);
                }}>
                  오늘 급식으로 돌아가기
                </button>
              </div>
            </div>
          </section>

          {/* Timetable Section */}
          <section className="glass timetable-card" style={{ gridColumn: "span 2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "850" }}>📅 이번 주 발명 수업 시간표</h2>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: "700" }}>
                담당 교사: 박은영
              </span>
            </div>

            {loadingTimetable ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "250px", fontWeight: "700", color: "var(--muted)" }}>
                시간표 데이터를 불러오는 중...
              </div>
            ) : (
              <table className="timetable-grid">
                <thead>
                  <tr>
                    <th>교시</th>
                    {days.map((day) => (
                      <th key={day}>{day}요일</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.num}>
                      <td className="period-label">
                        {p.num}교시
                        <span className="period-time">{p.time.split(" ~ ")[0]}</span>
                      </td>
                      {days.map((day) => {
                        const cell = getGridCell(day, p.num);
                        return (
                          <td 
                            key={day} 
                            className={`timetable-cell ${cell ? "active-slot" : ""}`}
                          >
                            {cell ? (
                              <div>
                                <div className="timetable-cell-class">{cell.displayClass}</div>
                                <div className="timetable-cell-loc" title={cell.location}>
                                  📍 {cell.location || "장소 미지정"}
                                </div>
                              </div>
                            ) : (
                              <span className="timetable-cell-empty">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-school">부산기계공업고등학교 1학년 발명 교과</div>
          <p>© 2026 부산기계공업고등학교 발명교실. All Rights Reserved.</p>
        </div>
      </footer>
    </>
  );
}
