@echo off
echo ========================================
echo PostgreSQL Baglanti Testi
echo ========================================
echo.

echo [1] PostgreSQL versiyonu kontrol ediliyor...
psql --version
if %errorlevel% neq 0 (
    echo HATA: psql komutu bulunamadi!
    echo PostgreSQL bin klasorunu PATH'e ekleyin.
    echo Ornek: C:\Program Files\PostgreSQL\14\bin
    pause
    exit /b 1
)
echo.

echo [2] PostgreSQL servisi kontrol ediliyor...
sc query postgresql-x64-14 | findstr "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo PostgreSQL servisi calismyor!
    echo Baslatmak icin: net start postgresql-x64-14
    pause
    exit /b 1
) else (
    echo PostgreSQL servisi calisiyor!
)
echo.

echo [3] Veritabani baglantisi test ediliyor...
psql -U postgres -c "SELECT version();" 2>nul
if %errorlevel% neq 0 (
    echo HATA: Veritabanina baglanılamadi!
    echo.
    echo Olasi sebepler:
    echo - Sifre gerekiyor olabilir
    echo - pg_hba.conf ayarlari yanlis olabilir
    echo.
    echo Cozum:
    echo 1. PostgreSQL kurulumunda belirlediginiz sifreyi kullanin
    echo 2. Veya pg_hba.conf dosyasinda 'trust' ayarini yapin
    pause
    exit /b 1
)
echo.

echo [4] duha_deri_db veritabani kontrol ediliyor...
psql -U postgres -lqt | findstr "duha_deri_db" >nul 2>&1
if %errorlevel% neq 0 (
    echo Veritabani bulunamadi, olusturuluyor...
    createdb -U postgres duha_deri_db
    if %errorlevel% equ 0 (
        echo Veritabani basariyla olusturuldu!
    ) else (
        echo HATA: Veritabani olusturulamadi!
        pause
        exit /b 1
    )
) else (
    echo Veritabani mevcut!
)
echo.

echo ========================================
echo TUM TESTLER BASARILI!
echo ========================================
echo.
echo Simdi uygulamayi baslatabilirsiniz: npm start
echo.
pause
