@echo off
echo ========================================
echo   Pro Backlinks Analyzer - Starting
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Check if api.txt exists
if not exist "api.txt" (
    echo ERROR: api.txt file not found!
    echo.
    echo Please create api.txt file with your DomDetailer API key.
    echo Get your API key from: https://domdetailer.com/api
    echo.
    pause
    exit /b 1
)

REM Check if api.txt is not empty
for %%A in (api.txt) do set size=%%~zA
if %size% LSS 5 (
    echo ERROR: api.txt appears to be empty!
    echo.
    echo Please add your DomDetailer API key to api.txt
    echo Get your API key from: https://domdetailer.com/api
    echo.
    pause
    exit /b 1
)

REM Create data directory if it doesn't exist
if not exist "data" mkdir data

echo [1/3] Python installation: OK
echo [2/3] API key file: OK
echo [3/3] Starting server...
echo.

REM Start the Python server
echo Server will start at http://localhost:8001
echo Opening browser in 3 seconds...
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start server in background and wait a bit
start /B python server.py

REM Wait 3 seconds for server to start
timeout /t 3 /nobreak >nul

REM Open browser
start http://localhost:8001/index.html

REM Keep the window open to show server logs
python server.py

