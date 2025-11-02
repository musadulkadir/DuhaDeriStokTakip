@echo off
echo ========================================
echo Windows Build - Duha Deri Stok Takip
echo ========================================
echo.

echo [1/4] Eski build dosyalarini temizleniyor...
if exist "dist" rmdir /s /q dist
if exist "dist-react" rmdir /s /q dist-react
echo Temizlendi!
echo.

echo [2/4] React uygulamasi build ediliyor...
call npm run build:react
if %errorlevel% neq 0 (
    echo HATA: React build basarisiz!
    pause
    exit /b 1
)
echo React build tamamlandi!
echo.

echo [3/4] dist-react klasoru kontrol ediliyor...
if not exist "dist-react\index.html" (
    echo HATA: dist-react\index.html bulunamadi!
    echo Vite build basarisiz olmus olabilir.
    pause
    exit /b 1
)
echo dist-react klasoru hazir!
echo.

echo [4/4] Electron build ediliyor...
call npm run build:win
if %errorlevel% neq 0 (
    echo HATA: Electron build basarisiz!
    pause
    exit /b 1
)
echo.

echo ========================================
echo BUILD TAMAMLANDI!
echo ========================================
echo.
echo Kurulum dosyasi: dist\Duha Deri Stok Takip-*-x64.exe
echo.
pause
