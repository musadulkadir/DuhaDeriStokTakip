@echo off
echo ========================================
echo Duha Deri Stok Takip - Veritabani Kurulumu
echo ========================================
echo.

REM PostgreSQL kontrolü
echo [1/3] PostgreSQL kontrol ediliyor...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo HATA: PostgreSQL bulunamadi!
    echo.
    echo Lutfen once PostgreSQL yukleyin:
    echo https://www.postgresql.org/download/windows/
    echo.
    echo Kurulum ayarlari:
    echo - Port: 5432
    echo - Kullanici: postgres
    echo - Sifre: Bos birakin veya basit bir sifre
    echo.
    pause
    exit /b 1
)
echo PostgreSQL bulundu!
echo.

REM Veritabanı oluştur
echo [2/3] Veritabani olusturuluyor...
psql -U postgres -lqt | findstr /C:"duha_deri_db" >nul 2>&1
if %errorlevel% neq 0 (
    createdb -U postgres duha_deri_db
    if %errorlevel% neq 0 (
        echo.
        echo HATA: Veritabani olusturulamadi!
        echo.
        echo Olasi sebepler:
        echo - PostgreSQL servisi calismıyor
        echo - Sifre gerekiyor
        echo.
        echo Cozum:
        echo 1. PostgreSQL servisini baslatin
        echo 2. Veya sifre ile deneyin:
        echo    set PGPASSWORD=your_password
        echo    createdb -U postgres duha_deri_db
        echo.
        pause
        exit /b 1
    )
    echo Veritabani olusturuldu!
) else (
    echo Veritabani zaten mevcut.
)
echo.

echo [3/3] Hazirlik tamamlandi!
echo.
echo NOT: Tablolar uygulama ilk acildiginda otomatik olusturulacak.
echo.

echo ========================================
echo KURULUM TAMAMLANDI!
echo ========================================
echo.
echo Simdi uygulamayi calistirabilirsiniz.
echo.
pause
