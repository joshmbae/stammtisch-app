#!/bin/bash
# Bringt "Die Hellen" auf TestFlight.
# Der Chat ("Frag den Sepp") ist als "Coming soon"-Platzhalter gebaut,
# es wird also kein oeffentliches Backend benoetigt.
set -e

cd "$(dirname "$0")/.."

echo "1) Bei Expo/EAS einloggen (Expo-Account, ggf. neu erstellen auf expo.dev)"
npx eas-cli login

echo "2) EAS-Projekt verknuepfen (erstellt extra.eas.projectId in app.json)"
npx eas-cli init --non-interactive || npx eas-cli init

echo "3) iOS-Build fuer TestFlight erstellen (~15-20 Min, fragt nach Apple-ID-Login + 2FA)"
npx eas-cli build --platform ios --profile production

echo "4) Build zu App Store Connect / TestFlight hochladen (fragt ggf. erneut nach Apple-ID)"
npx eas-cli submit --platform ios --latest

echo ""
echo "Fertig hochgeladen. Naechste Schritte manuell in App Store Connect (appstoreconnect.apple.com):"
echo "  - Falls noch kein App-Eintrag existiert: einmalig unter 'Meine Apps' -> '+' anlegen"
echo "    (Bundle ID: com.diehellen.stammtischapp, Name: 'Die Hellen')"
echo "  - Unter TestFlight -> Interne Tests -> Tester per Apple-ID-E-Mail einladen"
echo "  - Verarbeitung dauert meist 15-60 Min, danach koennen Tester in der TestFlight-App installieren"
