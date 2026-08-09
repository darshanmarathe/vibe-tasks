@echo off
taskkill /f /im vibetasks.exe 2>nul
if exist build rmdir /s /q build
call npm run build:win-portable
cd build
echo "Killing process if any"
call taskkill /f /im vibe-tasks.exe
call taskkill /f /im "vibe tasks.exe"
call kill vibe-tasks.exe
call kill "vibe tasks.exe"
echo "configuring...."
del vibe-tasks.exe
copy vibetask.exe vibe-tasks.exe
echo "starting...."
start  vibe-tasks.exe
