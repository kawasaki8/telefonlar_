@echo off
title PHONE ARENA — Professional Smartphone Portal
color 0b
echo ==============================================================
echo           PHONE ARENA — O'zbekiston Smartfon Portali
echo ==============================================================
echo.
echo Protsessorlar, AnTuTu reytinglari va O'zbekiston bozor narxlari
echo.

set PYTHON_CMD="C:\Users\sherdil\AppData\Local\Programs\Python\Python314\python.exe"

if exist %PYTHON_CMD% (
    echo Python 3.14 topildi: %PYTHON_CMD%
) else (
    set PYTHON_CMD=python
)

echo Server ishga tushmoqda: http://localhost:5050
start http://localhost:5050
%PYTHON_CMD% server.py
pause

