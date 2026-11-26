@echo off
setlocal EnableExtensions DisableDelayedExpansion
pushd "%~dp0"
if errorlevel 1 goto failed
if exist "package.json" if exist "src\main.tsx" goto project_ready
if exist "medellin-dream\package.json" if exist "medellin-dream\src\main.tsx" (
  cd /d "medellin-dream"
  if not errorlevel 1 goto project_ready
)

echo The launcher is outside the project folder.
echo Paste the full path of the extracted medellin-dream folder.
echo It should contain package.json and the src folder.
set "PROJECT_DIR="
set /p "PROJECT_DIR=Project folder: "
if not defined PROJECT_DIR goto missing_project
setlocal EnableDelayedExpansion
cd /d "!PROJECT_DIR:"=!" 2>nul
if errorlevel 1 goto missing_project
endlocal
if not exist "package.json" goto missing_project
if not exist "src\main.tsx" goto missing_project

:project_ready
echo Project folder:
cd
where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm.cmd >nul 2>nul
if errorlevel 1 goto missing_node
if exist "node_modules\.bin\vite.cmd" goto start_dev
if not exist "package-lock.json" goto install_without_lock

echo Installing project dependencies. This may take a few minutes.
call npm.cmd ci
if errorlevel 1 goto failed
goto start_dev

:install_without_lock
echo package-lock.json is missing. npm will create it from package.json.
call npm.cmd install
if errorlevel 1 goto failed

:start_dev
echo Starting ARG Studio. Keep this window open while editing.
call npm.cmd run dev -- --open "/#studio"
if errorlevel 1 goto failed
exit /b 0

:missing_project
echo Project not found. Extract the whole GitHub ZIP and find the medellin-dream folder.
pause
exit /b 1

:missing_node
echo Install Node.js LTS from https://nodejs.org/ and then open this file again.
pause
exit /b 1

:failed
echo The command did not complete. Check the error and the project folder above.
pause
exit /b 1
