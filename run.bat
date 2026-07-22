@echo off
title 부산기계공고 발명교실 홈페이지 실행기
echo =================================================================
echo   부산기계공고 발명교실 홈페이지 로컬 서버 실행기 (Next.js)
echo =================================================================
echo.
echo  - 서버 구동 후 자동으로 브라우저 창이 활성화됩니다.
echo  - 홈페이지 실행을 종료하려면 이 창을 닫아주시면 됩니다.
echo.
echo =================================================================
echo.
echo 1. 개발 서버 구동 시작...

:: Start Next.js server in the background inside this terminal
start /b npm run dev

echo 2. 서버 초기화 대기 중 (3초)...
timeout /t 3 /nobreak > nul

echo 3. 브라우저에서 홈페이지 즉시 로딩 중...
start http://localhost:3000

echo.
echo =================================================================
echo [동작 중] 이 창을 열어두시면 사이트가 계속 활성화됩니다.
echo =================================================================
echo.

:: Keep process open to print console logs
cmd /k
