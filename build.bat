@echo off
taskkill /f /im vibetasks.exe 2>nul
if exist build rmdir /s /q build
npm run build:win-portable
