# Mbipa — Script de captures d'écran Play Store
# Usage:
#   1. Installe l'APK preview EAS sur ton téléphone Android (USB Debug activé)
#   2. Connecte le téléphone en USB
#   3. Lance: .\screenshots.ps1
#
# Le script capture chaque écran clé et les sauvegarde dans ./store-assets/screenshots/
# Tu navigues dans l'app, le script attend que tu appuies sur Entrée pour chaque capture.

$ErrorActionPreference = "Stop"
$outputDir = Join-Path $PSScriptRoot "screenshots"

# Crée le dossier de sortie
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# Vérifie qu'adb est disponible
$adbPath = $null
$candidates = @(
    "adb",
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "$env:ANDROID_HOME\platform-tools\adb.exe",
    "C:\Android\Sdk\platform-tools\adb.exe"
)
foreach ($c in $candidates) {
    try {
        & $c version 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $adbPath = $c; break }
    } catch {}
}

if (-not $adbPath) {
    Write-Host "❌ adb introuvable." -ForegroundColor Red
    Write-Host "Installe Android Platform Tools : https://developer.android.com/tools/releases/platform-tools" -ForegroundColor Yellow
    Write-Host "Ou installe Android Studio (inclut adb)." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ adb trouvé : $adbPath" -ForegroundColor Green

# Vérifie qu'un appareil est connecté
$devices = & $adbPath devices | Select-String -Pattern "\sdevice$"
if ($devices.Count -eq 0) {
    Write-Host "❌ Aucun appareil Android connecté." -ForegroundColor Red
    Write-Host "Active le débogage USB et connecte ton téléphone." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Appareil connecté : $($devices[0])" -ForegroundColor Green
Write-Host ""

# Liste des écrans à capturer
$screens = @(
    @{ Name = "01-login";       Description = "Écran de connexion (avec logo Mbipa)" }
    @{ Name = "02-home";        Description = "Écran d'accueil (dashboard avec greetings)" }
    @{ Name = "03-chat";        Description = "Chat IA en cours de conversation" }
    @{ Name = "04-therapists";  Description = "Liste des thérapeutes disponibles" }
    @{ Name = "05-booking";     Description = "Écran de réservation de séance" }
    @{ Name = "06-music";       Description = "Bibliothèque musicale (catégories)" }
    @{ Name = "07-music-play";  Description = "Player YouTube en lecture" }
    @{ Name = "08-assessments"; Description = "Liste des évaluations psychologiques" }
    @{ Name = "09-profile";     Description = "Profil utilisateur" }
)

Write-Host "📸 Mbipa — Capture d'écran Play Store" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour chaque écran : navigue dans l'app jusqu'à l'écran demandé, puis appuie sur Entrée." -ForegroundColor Yellow
Write-Host "Tape 'skip' pour passer une capture, 'quit' pour arrêter." -ForegroundColor Yellow
Write-Host ""

foreach ($screen in $screens) {
    $output = Join-Path $outputDir "$($screen.Name).png"

    Write-Host "📱 $($screen.Description)" -ForegroundColor White
    Write-Host "   → Fichier : $($screen.Name).png" -ForegroundColor Gray
    $input = Read-Host "   Prêt ? (Entrée pour capturer / 'skip' / 'quit')"

    if ($input -eq "quit") { Write-Host "👋 Arrêt." -ForegroundColor Yellow; break }
    if ($input -eq "skip") { Write-Host "⏭️  Sauté." -ForegroundColor Gray; continue }

    # Capture via adb screencap puis pull
    & $adbPath shell screencap -p /sdcard/mbipa_screenshot.png
    & $adbPath pull /sdcard/mbipa_screenshot.png $output 2>$null | Out-Null
    & $adbPath shell rm /sdcard/mbipa_screenshot.png

    if (Test-Path $output) {
        $size = (Get-Item $output).Length / 1KB
        Write-Host "   ✅ Capturé ($([math]::Round($size, 1)) KB) → $output" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Échec de la capture." -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host ""
Write-Host "🎉 Captures terminées !" -ForegroundColor Green
Write-Host "📁 Dossier : $outputDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Exigences Play Store :" -ForegroundColor Yellow
Write-Host "   • Min 2, max 8 captures par type d'appareil" -ForegroundColor White
Write-Host "   • Taille : entre 320 px et 3840 px (ratio 16:9 ou 9:16)" -ForegroundColor White
Write-Host "   • Format : PNG ou JPG (24-bit, sans alpha)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Conseil : sélectionne tes 5-8 meilleures captures et upload-les" -ForegroundColor Yellow
Write-Host "   dans Google Play Console > Présence sur Play > Fiche du Store." -ForegroundColor Yellow
