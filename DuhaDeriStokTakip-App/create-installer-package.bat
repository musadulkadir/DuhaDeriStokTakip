@echo off
echo ========================================
echo Kurulum Paketi Olusturucu
echo ========================================
echo.

REM Kontroller
if not exist "dist" (
    echo HATA: dist klasoru bulunamadi!
    echo Once build alin: build-windows.bat
    pause
    exit /b 1
)

if not exist "dist\*.exe" (
    echo HATA: .exe dosyasi bulunamadi!
    echo Build basarisiz olmus olabilir.
    pause
    exit /b 1
)

echo [1/5] Eski release klasoru temizleniyor...
if exist "release" rmdir /s /q release
mkdir release
mkdir release\installer-files
echo Temizlendi!
echo.

echo [2/5] .exe dosyasi kopyalaniyor...
for %%f in (dist\*.exe) do (
    copy "%%f" "release\installer-files\Duha Deri Stok Takip.exe" >nul
    echo Kopyalandi: %%~nxf
)
echo.

echo [3/5] Kurulum dosyalari kopyalaniyor...
copy "installer-files\setup-database.bat" "release\installer-files\" >nul
copy "installer-files\KURULUM_REHBERI.txt" "release\installer-files\" >nul
echo Kurulum dosyalari kopyalandi!
echo.

echo [4/5] .env.example kopyalaniyor...
copy ".env.example" "release\installer-files\.env.example" >nul
echo .env.example kopyalandi!
echo.

echo [5/5] PostgreSQL link dosyasi olusturuluyor...
echo [InternetShortcut] > "release\installer-files\PostgreSQL-Indir.url"
echo URL=https://www.postgresql.org/download/windows/ >> "release\installer-files\PostgreSQL-Indir.url"
echo Link olusturuldu!
echo.

echo ========================================
echo KURULUM PAKETI HAZIR!
echo ========================================
echo.
echo Konum: release\installer-files\
echo.
echo Icerik:
dir /b "release\installer-files\"
echo.
echo SONRAKI ADIMLAR:
echo 1. release\installer-files klasorunu ZIP'le
echo 2. Veya USB'ye kopyala
echo 3. Kullaniciya gonder
echo.
echo ZIP olusturmak icin:
echo - Windows Explorer'da sag tik ^> Sikistir
echo - Veya 7-Zip/WinRAR kullan
echo.
pause
