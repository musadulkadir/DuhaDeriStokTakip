@echo off
echo ========================================
echo Production Test - Dosya Kontrolleri
echo ========================================
echo.

echo [1] dist-react klasoru kontrol ediliyor...
if exist "dist-react" (
    echo ✓ dist-react klasoru mevcut
    
    if exist "dist-react\index.html" (
        echo ✓ index.html mevcut
    ) else (
        echo ✗ index.html BULUNAMADI!
    )
    
    if exist "dist-react\assets" (
        echo ✓ assets klasoru mevcut
        dir /b dist-react\assets | find /c /v "" > temp.txt
        set /p count=<temp.txt
        del temp.txt
        echo   Assets sayisi: %count%
    ) else (
        echo ✗ assets klasoru BULUNAMADI!
    )
) else (
    echo ✗ dist-react klasoru BULUNAMADI!
    echo.
    echo Lutfen once build alin: npm run build:react
)
echo.

echo [2] src/main klasoru kontrol ediliyor...
if exist "src\main\main.js" (
    echo ✓ main.js mevcut
) else (
    echo ✗ main.js BULUNAMADI!
)

if exist "src\main\database.js" (
    echo ✓ database.js mevcut
) else (
    echo ✗ database.js BULUNAMADI!
)
echo.

echo [3] package.json kontrol ediliyor...
if exist "package.json" (
    echo ✓ package.json mevcut
    findstr /C:"\"main\"" package.json
) else (
    echo ✗ package.json BULUNAMADI!
)
echo.

echo [4] node_modules kontrol ediliyor...
if exist "node_modules" (
    echo ✓ node_modules mevcut
    
    if exist "node_modules\electron" (
        echo ✓ electron yuklu
    ) else (
        echo ✗ electron YUKLU DEGIL!
    )
    
    if exist "node_modules\pg" (
        echo ✓ pg yuklu
    ) else (
        echo ✗ pg YUKLU DEGIL!
    )
) else (
    echo ✗ node_modules BULUNAMADI!
    echo.
    echo Lutfen once: npm install
)
echo.

echo ========================================
echo Test Tamamlandi
echo ========================================
echo.
pause
