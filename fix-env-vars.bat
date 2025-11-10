@echo off
echo ========================================
echo Limpando variaveis de ambiente antigas
echo ========================================
echo.

REM Remove variáveis de ambiente antigas do usuário
setx DATABASE_URL ""
setx POSTGRES_HOST_INTERNAL ""

echo ✅ Variáveis de ambiente limpas!
echo.
echo Agora feche este terminal e abra um NOVO terminal
echo para as mudanças terem efeito.
echo.
pause
