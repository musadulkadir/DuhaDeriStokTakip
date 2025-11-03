@echo off
echo ========================================
echo .env Dosyasi Olusturucu
echo ========================================
echo.

if exist ".env" (
    echo .env dosyasi zaten mevcut!
    echo.
    choice /C YN /M "Uzerine yazmak istiyor musunuz"
    if errorlevel 2 (
        echo Iptal edildi.
        pause
        exit /b 0
    )
)

echo .env dosyasi olusturuluyor...
copy .env.example .env >nul

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo .env dosyasi basariyla olusturuldu!
    echo ========================================
    echo.
    echo Simdi .env dosyasini duzenleyin:
    echo.
    echo 1. Notepad ile acin: notepad .env
    echo 2. PostgreSQL sifreniz varsa DB_PASSWORD satirina yazin
    echo 3. Kaydedin ve kapatın
    echo.
    choice /C YN /M ".env dosyasini simdi acmak istiyor musunuz"
    if errorlevel 2 (
        echo.
        echo Daha sonra manuel olarak duzenleyebilirsiniz.
    ) else (
        notepad .env
    )
) else (
    echo.
    echo HATA: .env dosyasi olusturulamadi!
    echo .env.example dosyasinin var oldugundan emin olun.
)

echo.
pause
