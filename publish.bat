@echo off
if "%1"=="" (
    echo Usage: publish.bat ^<version^>
    echo Example: publish.bat 1.15.5
    exit /b 1
)

set VERSION=v%1
echo Preparing release %VERSION%...

git add -A
git commit -m "%VERSION%"
git tag %VERSION%
git push origin main --tags

echo Done! Release %VERSION% pushed.
