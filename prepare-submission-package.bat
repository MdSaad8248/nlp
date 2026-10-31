@echo off
setlocal enabledelayedexpansion

echo =========================================================================
echo   ACADEMICAI -- AUTOMATED SUBMISSION PACKAGER (FOR GOOGLE DRIVE & GITHUB)
echo =========================================================================
echo.
echo Current Folder: %~dp0
echo.
echo 1/4. Preparing clean staging folder (excluding 2GB node_modules and .next)...

set "ROOT_DIR=%~dp0"
set "STAGE_DIR=%~dp0..\AcademicAI_Submission_Clean"
set "ZIP_FILE=%~dp0..\AcademicAI_Project_Submission.zip"

if exist "%STAGE_DIR%" (
    echo Cleaning existing staging directory...
    rmdir /s /q "%STAGE_DIR%"
)

if exist "%ZIP_FILE%" (
    del /f /q "%ZIP_FILE%"
)

mkdir "%STAGE_DIR%"
mkdir "%STAGE_DIR%\documentation"
mkdir "%STAGE_DIR%\demo-video"

echo 2/4. Copying essential source files and documentation...
robocopy "%ROOT_DIR%app" "%STAGE_DIR%\app" /E /NFL /NDL /NJH /NJS /nc /ns /np
robocopy "%ROOT_DIR%components" "%STAGE_DIR%\components" /E /NFL /NDL /NJH /NJS /nc /ns /np
robocopy "%ROOT_DIR%lib" "%STAGE_DIR%\lib" /E /NFL /NDL /NJH /NJS /nc /ns /np
robocopy "%ROOT_DIR%prisma" "%STAGE_DIR%\prisma" /E /NFL /NDL /NJH /NJS /nc /ns /np
robocopy "%ROOT_DIR%public" "%STAGE_DIR%\public" /E /NFL /NDL /NJH /NJS /nc /ns /np
robocopy "%ROOT_DIR%scripts" "%STAGE_DIR%\scripts" /E /NFL /NDL /NJH /NJS /nc /ns /np
robocopy "%ROOT_DIR%docs" "%STAGE_DIR%\docs" /E /NFL /NDL /NJH /NJS /nc /ns /np
robocopy "%ROOT_DIR%documentation" "%STAGE_DIR%\documentation" /E /NFL /NDL /NJH /NJS /nc /ns /np

copy "%ROOT_DIR%package.json" "%STAGE_DIR%\" >nul
copy "%ROOT_DIR%package-lock.json" "%STAGE_DIR%\" >nul
copy "%ROOT_DIR%tsconfig.json" "%STAGE_DIR%\" >nul
copy "%ROOT_DIR%next.config.ts" "%STAGE_DIR%\" >nul
copy "%ROOT_DIR%.eslintrc.json" "%STAGE_DIR%\" >nul
copy "%ROOT_DIR%.env.example" "%STAGE_DIR%\" >nul
copy "%ROOT_DIR%.gitignore" "%STAGE_DIR%\" >nul
copy "%ROOT_DIR%README.md" "%STAGE_DIR%\" >nul

echo Instructions for 8-Minute Video: > "%STAGE_DIR%\demo-video\README_VIDEO.txt"
echo Place your 8-minute MP4 video in this folder if uploading via Google Drive. >> "%STAGE_DIR%\demo-video\README_VIDEO.txt"
echo For GitHub: Upload the MP4 video to Google Drive, set sharing to "Anyone with the link can view", and paste the link in README.md. >> "%STAGE_DIR%\demo-video\README_VIDEO.txt"

echo.
echo 3/4. Creating compressed lightweight archive: AcademicAI_Project_Submission.zip ...
powershell -Command "Compress-Archive -Path '%STAGE_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"

echo.
echo 4/4. Cleaning up temporary staging folder...
rmdir /s /q "%STAGE_DIR%"

echo.
echo =========================================================================
echo   SUCCESS! SUBMISSION PACKAGE CREATED SUCCESSFULLY!
echo =========================================================================
echo.
echo File created:
echo   %ZIP_FILE%
echo.
echo Size reduced from ~2GB down to ~6MB (node_modules and .next excluded).
echo.
echo How to use:
echo   1. GOOGLE DRIVE: Upload 'AcademicAI_Project_Submission.zip' and your
echo      8-minute video file directly to your Google Drive submission folder.
echo   2. GITHUB: In this project directory, run:
echo        git add .
echo        git commit -m "AcademicAI final project submission"
echo        git push origin main
echo      (Git automatically ignores node_modules and .next via .gitignore)
echo.
echo Opening folder containing the ZIP file...
explorer.exe /select,"%ZIP_FILE%"
echo.
pause

