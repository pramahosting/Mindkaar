@echo off
REM ============================================================
REM  Mind Gym - Full Stack Launcher (Backend + Frontend)
REM  Place this file at the project root, next to "backend"
REM  and "frontend", then double-click it.
REM ============================================================

setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"
set "BACKEND_URL=http://localhost:%BACKEND_PORT%"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"

echo.
echo ==============================================
echo   Mind Gym - Full Stack Setup and Launch
echo ==============================================
echo.

if not exist "%BACKEND_DIR%" (
    echo [ERROR] Could not find "%BACKEND_DIR%".
    pause
    exit /b 1
)
if not exist "%FRONTEND_DIR%" (
    echo [ERROR] Could not find "%FRONTEND_DIR%".
    pause
    exit /b 1
)

REM --------------------------------------------------------
REM Node.js
REM --------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not on PATH.
    echo Install Node.js LTS from https://nodejs.org and try again.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo [OK] Node.js found: %%v

REM --------------------------------------------------------
REM Python. Must be 3.10-3.12 - pydantic-core (via PyO3/Rust) does
REM not yet support Python 3.13/3.14, so pip falls back to compiling
REM from source (needs a Rust toolchain) and fails or takes forever.
REM We specifically look for Python 3.12 / 3.11 / 3.10 via the "py"
REM launcher first, and only fall back to plain "python" if that's
REM already 3.12 or older.
REM --------------------------------------------------------
set "PYCMD="

where py >nul 2>&1
if not errorlevel 1 (
    for %%V in (3.12 3.11 3.10) do (
        if not defined PYCMD (
            py -%%V --version >nul 2>&1
            if not errorlevel 1 set "PYCMD=py -%%V"
        )
    )
)

if not defined PYCMD (
    where python >nul 2>&1
    if not errorlevel 1 (
        for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set "PYFULLVER=%%v"
        for /f "tokens=1,2 delims=." %%a in ("!PYFULLVER!") do (
            set "PYMAJOR=%%a"
            set "PYMINOR=%%b"
        )
        if "!PYMAJOR!"=="3" if !PYMINOR! LEQ 12 set "PYCMD=python"
    )
)

if not defined PYCMD (
    echo [ERROR] Could not find a Python 3.10-3.12 installation.
    echo         This backend's dependencies ^(pydantic-core, bcrypt^)
    echo         use compiled Rust extensions that do not yet have
    echo         prebuilt wheels for Python 3.13/3.14 - installs either
    echo         fail outright or hang trying to compile from source.
    echo.
    echo         Please install Python 3.12 from https://python.org/downloads/
    echo         ^(check "Add python.exe to PATH" during install - you do NOT
    echo         need to uninstall your existing Python version, both can
    echo         coexist and this script will pick the right one^).
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('%PYCMD% --version') do echo [OK] Using Python: %%v  (command: %PYCMD%)

REM --------------------------------------------------------
REM Check for a configured .env (Groq key)
REM --------------------------------------------------------
if not exist "%BACKEND_DIR%\.env" (
    echo [SETUP] No backend\.env found - creating one from .env.example.
    copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
    echo [WARN] Edit backend\.env and set GROQ_API_KEY before using the
    echo        scenario/question/scoring features - get a key at
    echo        https://console.groq.com/keys
)

REM --------------------------------------------------------
REM Backend: venv + dependencies
REM --------------------------------------------------------
cd /d "%BACKEND_DIR%"

if not exist "venv" (
    echo.
    echo [SETUP] Creating Python virtual environment...
    %PYCMD% -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

echo [SETUP] Installing backend dependencies...
call "%BACKEND_DIR%\venv\Scripts\python.exe" -m pip install --upgrade pip --no-cache-dir -q
call "%BACKEND_DIR%\venv\Scripts\pip.exe" install --no-cache-dir --prefer-binary -q -r requirements.txt
if errorlevel 1 (
    echo [ERROR] pip install failed. Check the output above.
    pause
    exit /b 1
)

REM --------------------------------------------------------
REM Frontend: npm dependencies
REM --------------------------------------------------------
cd /d "%FRONTEND_DIR%"

if not exist "node_modules" (
    echo.
    echo [SETUP] Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Check the output above.
        pause
        exit /b 1
    )
) else (
    echo [OK] Frontend dependencies already installed.
)

if not exist ".env" (
    echo VITE_API_URL=%BACKEND_URL%> ".env"
)

REM --------------------------------------------------------
REM Launch both services
REM --------------------------------------------------------
echo.
echo [START] Launching backend API on %BACKEND_URL% ...
start "Mind Gym Backend" cmd /k "cd /d "%BACKEND_DIR%" && venv\Scripts\uvicorn.exe app.main:app --reload --port %BACKEND_PORT%"

echo [START] Launching frontend on %FRONTEND_URL% ...
start "Mind Gym Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo [WAIT] Waiting for the frontend to start...
set /a TRIES=0
:waitloop
set /a TRIES+=1
curl -s -o nul -w "" %FRONTEND_URL% >nul 2>&1
if %errorlevel%==0 goto ready
if %TRIES% GEQ 30 (
    echo [WARN] Frontend did not respond in time - opening browser anyway.
    goto ready
)
timeout /t 1 >nul
goto waitloop

:ready
start "" "%FRONTEND_URL%"

echo.
echo ==============================================
echo  Backend:  %BACKEND_URL%
echo  Frontend: %FRONTEND_URL%
echo  Close the two console windows to stop each service.
echo ==============================================
echo.
pause
endlocal
