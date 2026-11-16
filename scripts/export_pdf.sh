#!/usr/bin/env bash
# export_pdf.sh - report .docx -> .pdf with an up-to-date table of contents.
# Needs LibreOffice (brew install --cask libreoffice).
set -e
cd "$(dirname "$0")/.."
SOFFICE=/Applications/LibreOffice.app/Contents/MacOS/soffice
PROFILE=$(mktemp -d)
export REPORT_DOCX="$PWD/docs/report/Detailed_Report_Team_Black_Coffee.docx"
export REPORT_PDF="$PWD/docs/report/Detailed_Report_Team_Black_Coffee.pdf"
# 1st run creates the temporary LibreOffice profile
$SOFFICE -env:UserInstallation=file://$PROFILE --headless --terminate_after_init >/dev/null 2>&1 || true
mkdir -p "$PROFILE/user/Scripts/python"
cp tools/export_pdf.py "$PROFILE/user/Scripts/python/"
$SOFFICE -env:UserInstallation=file://$PROFILE --headless --invisible \
    "vnd.sun.star.script:export_pdf.py\$export_report?language=Python&location=user" 2>&1 | grep -v Fontconfig || true
rm -rf "$PROFILE"
ls -l "$REPORT_PDF"
