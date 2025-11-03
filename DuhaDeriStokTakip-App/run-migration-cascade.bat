@echo off
echo ========================================
echo MALZEME SILME SORUNUNU DUZELTME
echo ========================================
echo.
echo Bu script material_movements tablosundaki
echo foreign key constraint'i CASCADE ile guncelleyecek
echo.
pause

REM .env dosyasından veritabanı bilgilerini oku
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="DB_HOST" set DB_HOST=%%b
    if "%%a"=="DB_PORT" set DB_PORT=%%b
    if "%%a"=="DB_NAME" set DB_NAME=%%b
    if "%%a"=="DB_USER" set DB_USER=%%b
    if "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
)

echo Veritabani: %DB_NAME%
echo Host: %DB_HOST%:%DB_PORT%
echo Kullanici: %DB_USER%
echo.

REM Migration'ı çalıştır
echo Migration calistiriliyor...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f migrations/fix_material_movements_cascade.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo BASARILI!
    echo ========================================
    echo Migration basariyla tamamlandi.
    echo Artik malzemeleri silebilirsiniz.
) else (
    echo.
    echo ========================================
    echo HATA!
    echo ========================================
    echo Migration sirasinda bir hata olustu.
    echo Lutfen hata mesajini kontrol edin.
)

echo.
pause
