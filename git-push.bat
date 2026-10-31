@echo off
setlocal enabledelayedexpansion

echo =========================================================================
echo   ACADEMICAI -- AUTOMATED GIT STAGE, COMMIT & PUSH TO GITHUB
echo =========================================================================
echo.
echo Current Directory: %~dp0
echo.

echo 1/4. Checking Git Status...
git status -s
echo.

echo 2/4. Staging files (node_modules and .next are automatically excluded)...
git add .
echo [OK] All relevant project and documentation files staged.
echo.

echo 3/4. Creating Commit...
git commit -m "AcademicAI: Final review preparation, dynamic calendar date cleanup, official VIT CSI4001 project report, technical workflows, and faculty demo guide"
echo.

echo 4/4. Checking remote and pushing to GitHub...
git remote -v
echo.
echo Pushing to GitHub (origin)...
git push -u origin HEAD

echo.
if %ERRORLEVEL% EQU 0 (
    echo =========================================================================
    echo   SUCCESS! ALL CHANGES PUSHED TO GITHUB SUCCESSFULLY!
    echo =========================================================================
) else (
    echo.
    echo NOTE: If git push asked for credentials or if origin is not configured yet:
    echo   1. Check your remote with: git remote -v
    echo   2. If no remote exists, create a repo on github.com and run:
    echo      git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
    echo      git push -u origin main
)

echo.
pause

