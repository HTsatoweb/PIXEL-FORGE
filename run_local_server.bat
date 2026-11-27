@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo  PIXEL FORGE STUDIO - Secure Local Web Server
echo ================================================
echo.
echo PC:       http://localhost:8000/
echo Phone:    http://PC-IP-ADDRESS:8000/ (same Wi-Fi)
echo.
echo Keep this window open while using the app.
echo Press Ctrl+C to stop the server.
echo.
where py >nul 2>nul
if not errorlevel 1 (
  py -3 server.py
  goto :done
)
where python >nul 2>nul
if not errorlevel 1 (
  python server.py
  goto :done
)
echo Python 3 was not found. Install Python 3 or launch a local static server manually.
pause
:done
endlocal
