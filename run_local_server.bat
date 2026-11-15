@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 serve.py
) else (
  python serve.py
)
if errorlevel 1 (
  echo.
  echo Python 3 was not found. You can host this folder as a static website instead.
  pause
)
