@echo off
setlocal enabledelayedexpansion

echo =========================================================================
echo   ACADEMICAI -- PRE-REVIEW GIT STATUS & STAGING CHECK
echo =========================================================================
echo.
echo Current Directory: %~dp0
echo.

echo 1. Untracking any accidentally cached build/media files from Git index...
git rm -r --cached node_modules 2>nul
git rm -r --cached .next 2>nul
git rm -r --cached dist 2>nul
git rm -r --cached build 2>nul
git rm -r --cached .venv 2>nul
git rm -r --cached venv 2>nul
git rm -r --cached __pycache__ 2>nul
git rm -r --cached .pytest_cache 2>nul
git rm --cached *.mp4 2>nul
git rm --cached *.zip 2>nul
git rm --cached *.log 2>nul

echo.
echo 2. Checking Git Remote configuration...
git remote -v
echo.

echo 3. Staging only clean project source code and documentation...
git add .
echo.

echo 4. Current Clean Staged Status (Review before committing):
echo -------------------------------------------------------------------------
git status
echo -------------------------------------------------------------------------
echo.
echo [INFO] Ready for your approval.
echo To commit and push, run the commands displayed below.
echo.
pause

