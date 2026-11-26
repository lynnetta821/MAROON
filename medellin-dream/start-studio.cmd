@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm.cmd >nul 2>nul
if errorlevel 1 goto missing_node

if not exist "node_modules\.bin\vite.cmd" (
  echo Installing project dependencies. This may take a few minutes.
  call npm.cmd ci
  if errorlevel 1 goto failed
)

echo Starting ARG Studio. Keep this window open while editing.
call npm.cmd run dev -- --open "/#studio"
if errorlevel 1 goto failed
exit /b 0

:missing_node
echo Install Node.js LTS from https://nodejs.org/ and then open this file again.
pause
exit /b 1

:failed
echo The command did not complete. Check the message above.
pause
exit /b 1
