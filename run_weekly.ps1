# ESG 모니터링 주간 실행: 수집 -> 신호 탐지 -> GitHub Pages 반영
# (작업 스케줄러 ESG-Monitoring-Weekly 가 매주 월요일 09:00 실행)
Set-Location $PSScriptRoot
& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" crawler.py
git add -A
git commit -m "weekly auto-update"
git push
