# ESG 모니터링 주간 실행: 수집 -> 신호 탐지 -> GitHub Pages 반영
# (작업 스케줄러 ESG-Monitoring-Weekly 가 평일 09:00 + 로그인 시 실행.
#  PC가 월요일에 꺼져 있어도 그 주 처음 켤 때 한 번 돌도록 하고, 이미 돈 주는 건너뜀)
Set-Location $PSScriptRoot

# 이번 주(월요일 00:00 이후)에 이미 실행됐으면 종료
$monday = (Get-Date).Date.AddDays(-(([int](Get-Date).DayOfWeek + 6) % 7))
$done = git log --since="$($monday.ToString('yyyy-MM-dd')) 00:00" --grep="weekly auto-update" --format=%h
if ($done) { exit 0 }

& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" crawler.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 크롤러 산출물만 올림 (작업 중인 페이지가 섞여 배포되지 않도록)
git add assets/data.js data.json seen.json trans_cache.json
git commit -m "weekly auto-update"
git push
