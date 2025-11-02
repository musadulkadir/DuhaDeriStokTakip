@echo off
echo ========================================
echo Duha Deri Stok Takip - Windows Kurulum
echo ========================================
echo.

REM PostgreSQL kontrolü
echo [1/4] PostgreSQL kontrol ediliyor...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo HATA: PostgreSQL bulunamadi!
    echo Lutfen PostgreSQL'i yukleyin: https://www.postgresql.org/download/windows/
    pause
    exit /b 1
)
echo PostgreSQL bulundu!
echo.

REM PostgreSQL servisini başlat
echo [2/4] PostgreSQL servisi baslatiliyor...
net start postgresql-x64-14 >nul 2>&1
if %errorlevel% equ 0 (
    echo PostgreSQL servisi baslatildi!
) else (
    echo PostgreSQL servisi zaten calisiyor veya baslatma izni gerekiyor.
)
echo.

REM Veritabanı oluştur
echo [3/4] Veritabani olusturuluyor...
psql -U postgres -lqt | findstr /C:"duha_deri_db" >nul 2>&1
if %errorlevel% neq 0 (
    createdb -U postgres duha_deri_db
    echo Veritabani olusturuldu!
) else (
    echo Veritabani zaten mevcut.
)
echo.

REM Node modüllerini yükle
echo [4/4] Bagimliliklari yukleniyor...
if not exist "node_modules" (
    call npm install
) else (
    echo Bagimliliklari zaten yuklu.
)
echo.

echo ========================================
echo Kurulum tamamlandi!
echo ========================================
echo.
echo Uygulamayi baslatmak icin: npm start
echo Build almak icin: npm run build:win
echo.
pause
