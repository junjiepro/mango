param(
    [string]$ChecklistPath
)

$content = Get-Content $ChecklistPath -Raw
$total = ([regex]::Matches($content, '- \[([ xX])\]')).Count
$completed = ([regex]::Matches($content, '- \[[xX]\]')).Count
$incomplete = $total - $completed

Write-Output "$total|$completed|$incomplete"
