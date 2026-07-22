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

export default function Admin() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [timetable, setTimetable] = useState<Timetable>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" }); // type: "success" | "error"

  // Check login on mount
  useEffect(() => {
    const auth = localStorage.getItem("teacher_authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default teacher password: 1234
    if (password === "1234") {
      setIsAuthenticated(true);
      localStorage.setItem("teacher_authenticated", "true");
      setAuthError("");
      fetchData();
    } else {
      setAuthError("비밀번호가 올바르지 않습니다. 다시 입력해주세요.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("teacher_authenticated");
    setPassword("");
  };

  const fetchData = async () => {
    setLoading(true);
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
        // Set the bulk text to current students for easy editing
        const textRepresentation = studData.students
          .map((s: Student) => `${s.name}, ${s.grade}-${s.class}`)
          .join("\n");
        setBulkText(textRepresentation);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      showStatus("데이터를 불러오는 중 오류가 발생했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (text: string, type: "success" | "error") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: "", type: "" });
    }, 5000);
  };

  // Update a classroom location in state
  const handleLocationChange = (classId: string, val: string) => {
    setTimetable((prev) => ({
      ...prev,
      [classId]: {
        ...prev[classId],
        location: val,
      },
    }));
  };

  // Save the classroom locations
  const handleSaveTimetable = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timetable }),
      });
      if (res.ok) {
        showStatus("수업 장소 시간표가 성공적으로 저장되었습니다.", "success");
      } else {
        showStatus("시간표 저장에 실패했습니다.", "error");
      }
    } catch (err) {
      console.error(err);
      showStatus("서버 통신 에러가 발생했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Save the student database (bulk text parsing)
  const handleSaveStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textData: bulkText }),
      });
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students);
        showStatus(`학생 명단이 성공적으로 등록되었습니다. (총 ${data.count}명)`, "success");
      } else {
        showStatus(data.error || "학생 명단 등록에 실패했습니다.", "error");
      }
    } catch (err) {
      console.error(err);
      showStatus("서버 통신 에러가 발생했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Render logins
  if (!isAuthenticated) {
    return (
      <>
        <header className="nav-header">
          <div className="container nav-container">
            <Link href="/" className="nav-logo">
              부산기계공고 <span>1학년 발명 교과</span>
            </Link>
            <nav className="nav-links">
              <Link href="/" className="nav-link">
                메인 홈
              </Link>
              <Link href="/admin" className="nav-link active">
                교사 관리자
              </Link>
            </nav>
          </div>
        </header>

        <main className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
          <div className="glass" style={{ padding: "3rem", width: "100%", maxWidth: "450px", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "0.5rem" }}>교사용 관리자 로그인</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
              시간표 수업 장소 및 학생 명단을 수정하려면 비밀번호를 입력해주세요.
            </p>

            <form onSubmit={handleLogin}>
              <div className="admin-form-group" style={{ textAlign: "left" }}>
                <label className="admin-label">관리자 비밀번호</label>
                <input
                  type="password"
                  className="admin-input"
                  placeholder="비밀번호를 입력하세요 (기본: 1234)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ textAlign: "center", fontSize: "1.1rem" }}
                  required
                />
              </div>

              {authError && (
                <div style={{ color: "#ef4444", fontSize: "0.85rem", fontWeight: "700", marginBottom: "1.5rem" }}>
                  ❌ {authError}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                로그인
              </button>
            </form>
          </div>
        </main>
      </>
    );
  }

  // Group timetable slots by day for clean listing
  const dayOrder = ["월", "화", "수", "목", "금"];
  const getSlotsByDay = (dayName: string) => {
    return Object.keys(timetable)
      .map((classId) => ({ classId, ...timetable[classId] }))
      .filter((s) => s.day === dayName)
      .sort((a, b) => a.period - b.period);
  };

  return (
    <>
      {/* Navigation Header */}
      <header className="nav-header">
        <div className="container nav-container">
          <Link href="/" className="nav-logo">
            부산기계공고 <span>1학년 발명 교과 어드민</span>
          </Link>
          <nav className="nav-links">
            <Link href="/" className="nav-link">
              메인 홈
            </Link>
            <button className="nav-link" onClick={handleLogout} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
              로그아웃
            </button>
          </nav>
        </div>
      </header>

      <main className="container" style={{ padding: "3rem 1.5rem 5rem" }}>
        
        {/* Header bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "850" }}>🛠️ 발명교실 수업 관리 콘솔</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>수업 장소 배치 수정 및 학생 데이터 로스터 관리가 가능합니다.</p>
          </div>
          {loading && (
            <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--primary)" }}>
              ⏳ 데이터 동기화 중...
            </span>
          )}
        </div>

        {/* Global Save Status Alert */}
        {statusMessage.text && (
          <div className="glass" style={{
            padding: "1.25rem 2rem",
            marginBottom: "2rem",
            borderRadius: "1rem",
            fontWeight: "700",
            borderLeft: `5px solid ${statusMessage.type === "success" ? "var(--success)" : "#ef4444"}`,
            color: statusMessage.type === "success" ? "var(--success)" : "#ef4444",
            background: statusMessage.type === "success" ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)"
          }}>
            {statusMessage.type === "success" ? "✅" : "⚠️"} {statusMessage.text}
          </div>
        )}

        <div className="grid-2">
          
          {/* Timetable Locations Panel */}
          <section className="glass admin-card">
            <div className="admin-title">
              <span>📅 수업 장소 일괄 설정</span>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveTimetable}
                disabled={loading}
                style={{ fontSize: "0.85rem", padding: "0.5rem 1rem", borderRadius: "0.75rem" }}
              >
                장소 변경 저장
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
              각 발명 학급의 요일/교시별 수업 장소를 입력하고 상단의 저장 버튼을 누르세요.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {dayOrder.map((day) => {
                const slots = getSlotsByDay(day);
                if (slots.length === 0) return null;

                return (
                  <div key={day} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.25rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--primary)", marginBottom: "0.75rem" }}>
                      {day}요일 발명 수업
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {slots.map((slot) => {
                        const classDisplay = `${parseInt(slot.classId[0], 10)}학년 ${parseInt(slot.classId.substring(1), 10)}반`;
                        return (
                          <div 
                            key={slot.classId} 
                            style={{ 
                              display: "grid", 
                              gridTemplateColumns: "100px 80px 1fr", 
                              alignItems: "center",
                              gap: "0.5rem" 
                            }}
                          >
                            <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>{classDisplay}</span>
                            <span style={{ color: "var(--muted)", fontSize: "0.8rem", fontWeight: "600" }}>{slot.period}교시 ({slot.time})</span>
                            <input
                              type="text"
                              className="admin-input"
                              placeholder="예: 창의발명실 (2층)"
                              value={slot.location || ""}
                              onChange={(e) => handleLocationChange(slot.classId, e.target.value)}
                              style={{ padding: "0.4rem 0.75rem", fontSize: "0.9rem" }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Students Database Management Panel */}
          <section className="glass admin-card">
            <div className="admin-title">
              <span>👤 학생 명단 대량 편집</span>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveStudents}
                disabled={loading}
                style={{ fontSize: "0.85rem", padding: "0.5rem 1rem", borderRadius: "0.75rem" }}
              >
                학생명단 업데이트
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>
              엑셀이나 한글에서 학생 이름과 반 정보를 복사하여 붙여넣으세요. 저장 시 기존 학생 목록이 대체됩니다.
            </p>

            <div style={{ background: "rgba(var(--primary-rgb), 0.03)", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.8rem", marginBottom: "1.5rem", borderLeft: "3px solid var(--accent)" }}>
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>💡 입력 지원 포맷 (한 줄에 한 명씩):</strong>
              - 홍길동 106 (이름 학급코드3자리)<br />
              - 김철수, 1-3 (이름 쉼표 학년-반)<br />
              - 이영희, 1학년 7반 (이름 쉼표 한글)<br />
              - 정민수 1학년 12반
            </div>

            <div className="admin-form-group">
              <label className="admin-label">학생 명단 편집기</label>
              <textarea
                className="admin-textarea"
                placeholder="이름과 반 정보를 여기에 입력하세요..."
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                style={{ height: "350px", fontSize: "0.9rem", lineHeight: "1.5" }}
              />
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                <span>현재 등록된 학생 ({students.length}명)</span>
              </div>
              <div style={{ 
                maxHeight: "150px", 
                overflowY: "auto", 
                border: "1px solid var(--border)", 
                borderRadius: "0.5rem", 
                padding: "0.75rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.35rem",
                background: "rgba(0,0,0,0.02)"
              }}>
                {students.map((student, i) => (
                  <span 
                    key={i} 
                    style={{ 
                      fontSize: "0.75rem", 
                      background: "var(--border)", 
                      padding: "0.2rem 0.5rem", 
                      borderRadius: "0.25rem",
                      fontWeight: "600"
                    }}
                  >
                    {student.name} ({student.grade}-{student.class})
                  </span>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
