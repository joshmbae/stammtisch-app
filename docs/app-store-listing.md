# App Store Connect — Einreichung DeinStammtisch v1.3.0

## 1. Vorbereitende Schritte (einmalig)

### GitHub Pages aktivieren (für Datenschutz- & Support-URL)
1. Auf GitHub im Repo `joshmbae/stammtisch-app` → **Settings → Pages**
2. Unter „Build and deployment" → Source: **Deploy from a branch**
3. Branch: `main`, Ordner: `/docs` → **Save**
4. Nach ein paar Minuten erreichbar unter:
   - Datenschutz: `https://joshmbae.github.io/stammtisch-app/privacy.html`
   - Support: `https://joshmbae.github.io/stammtisch-app/support.html`
5. **Vorher:** in `docs/privacy.html` die Platzhalter `[Vor- und Nachname]`, `[Straße, Hausnummer]`, `[PLZ, Ort]` sowie die Supabase-Hosting-Region ausfüllen (Abschnitt „TODO" oben in der Datei).

⚠️ **Impressumspflicht:** Da die App öffentlich im Store für die Allgemeinheit angeboten wird, greift in Deutschland vermutlich §5 TMG/DDG (Impressumspflicht), auch als Privatperson bei einer kostenlosen, aber öffentlich angebotenen App. Die Datenschutzerklärung deckt das nicht automatisch ab — im Zweifel kurz gegenprüfen (z. B. e-recht24.de) oder anwaltlich absichern, ob ein Impressum zusätzlich nötig ist.

### iOS-Build einreichen
```bash
npx eas submit --platform ios --latest
```
Lädt den zuletzt gebauten iOS-Build zu App Store Connect hoch. Dauert je nach Apple-Verarbeitung (Processing) 15–60 Minuten, bis der Build in App Store Connect als Version auswählbar ist.

## 2. App in App Store Connect anlegen

[appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Meine Apps → „+" → Neue App**

| Feld | Wert |
|---|---|
| Plattform | iOS |
| Name | `DeinStammtisch` |
| Hauptsprache | Deutsch |
| Bundle-ID | `com.diehellen.stammtischapp` (aus Dropdown, bereits über EAS registriert) |
| SKU | z. B. `stammtischapp001` (beliebig, intern, einmalig) |
| Nutzerzugriff | Vollzugriff |

## 3. App-Informationen

- **Kategorie (primär):** Lifestyle
- **Kategorie (sekundär, optional):** Soziale Netzwerke
- **Altersfreigabe:** Fragebogen durchgehen — bei dieser App überall „Nein"/„Keine" ankreuzen (kein Nutzer-generierter öffentlicher Content, kein Glücksspiel um echtes Geld, keine Werbung), Ergebnis sollte 4+ sein.
- **Datenschutzrichtlinien-URL:** `https://joshmbae.github.io/stammtisch-app/privacy.html`

## 4. App-Datenschutz (App Privacy Fragebogen)

Apple fragt Datentypen einzeln ab. Basierend darauf, was die App tatsächlich sammelt:

| Datentyp | Erfasst? | Verknüpft mit Identität? | Zweck |
|---|---|---|---|
| Name | Ja | Ja | App-Funktionalität |
| E-Mail-Adresse | Nein | – | – |
| Fotos | Ja (Profilbild, optional) | Ja | App-Funktionalität |
| Finanzinformationen (Kassen-Beträge) | Ja | Ja | App-Funktionalität |
| Nutzungsdaten / Tracking | Nein | – | – |

Bei „Wird dieses Datum zum Tracking verwendet?" → **überall Nein** (kein SDK von Drittanbietern, kein Werbe-Tracking — bestätigt durch package.json: nur Supabase + Standard-Expo-Module).

## 5. Store-Texte

**App-Name** (max. 30 Zeichen)
```
DeinStammtisch
```

**Untertitel** (max. 30 Zeichen)
```
Termine, Kasse & Strafen
```

**Werbetext** (max. 170 Zeichen, jederzeit ohne neues Review änderbar)
```
Alles für eure Stammtischrunde an einem Ort: Termine planen, Kasse führen, Strafen verwalten — mit Live-Updates für alle Mitglieder.
```

**Beschreibung** (max. 4000 Zeichen)
```
DeinStammtisch ist die App für eure feste Stammtischrunde — egal ob Kartenrunde, Vereinsstammtisch oder Freundeskreis mit eigenen Regeln.

TERMINE
Behaltet den Überblick über alle Stammtische im Kalender. Mitglieder sagen zu oder ab, tragen Anwesenheit und Verspätungen direkt im Termin ein.

STRAFEN
Wer absagt, zu spät kommt oder eine Runde verliert, kassiert eine Strafe — automatisch bei Spielereignissen und Wetten, oder manuell erfasst. Alle Strafen auf einen Blick, mit Status „offen" oder „beglichen".

KASSE
Einnahmen, Ausgaben und Abendkosten sauber dokumentiert — inklusive Kostenteilung, wer schon bezahlt hat.

MITGLIEDER & ROLLEN
Jede Person hat ihr eigenes Profil mit Rollen wie Kassenwart, Bierwart oder Schriftführer — optional per PIN geschützt.

SPIELE & WETTEN
Legt eigene Spiele mit individuellen Ereignistypen an (z. B. Schocken, Skat) — inklusive automatischer Strafen bei bestimmten Ergebnissen. Wettet gegeneinander und behaltet die Ranglisten im Auge.

SATZUNG
Haltet eure Stammtisch-Regeln, Treffpunkt und Termine fest — für alle jederzeit einsehbar.

LIVE-AKTIVITÄT
Ein Aktivitäts-Feed zeigt in Echtzeit, was in der Runde passiert — neue Strafen, Kassen-Einträge, Zu-/Absagen.

Keine Werbung, kein Tracking, keine Drittanbieter-Analyse. Eure Daten gehören eurer Runde.
```

**Schlüsselwörter** (max. 100 Zeichen, kommagetrennt, keine Leerzeichen nach Komma)
```
stammtisch,verein,kneipenrunde,kasse,strafen,termine,rangliste,schocken,kartenrunde,vereinsapp
```

**Werbe-URL (Marketing URL)** — optional, leer lassen falls keine eigene Website existiert.

**Support-URL**
```
https://joshmbae.github.io/stammtisch-app/support.html
```

**Was ist neu in dieser Version** (Release Notes für 1.3.0)
```
- Neu: Onboarding für neue Mitglieder — kurzer Rundgang durch die wichtigsten Funktionen beim ersten Login
- Neu: Live-Updates — Termine, Strafen & Aktivitäten aktualisieren sich in Echtzeit bei allen Mitgliedern
- Neu: Strafen lassen sich jetzt auch direkt (ohne Termin-Bezug) mit freiem Text erfassen
- Verbessert: Anwesenheitsquote berücksichtigt jetzt den Mitgliedsbeginn
- Verbessert: Navigation im Menü, klarere Hinweise in den Einstellungen
```

**Copyright**
```
© 2026 [Vor- und Nachname]
```

## 6. App-Überprüfung (App Review Information)

Da die App ohne zentrale Nutzerkonten funktioniert (jede:r legt selbst einen Stammtisch an oder tritt bei), braucht Apple **kein Demo-Login** — trotzdem unbedingt Hinweise dalassen, sonst bleibt der Reviewer beim ersten Screen hängen:

**Kontaktinformationen:** deine Telefonnummer + E-Mail eintragen.

**Notizen für den Prüfer:**
```
Diese App benötigt keinen Demo-Account. Bitte zum Testen:
1. Auf "Stammtisch anlegen" tippen, beliebigen Namen + Passwort eingeben
2. Ein Mitglied-Profil anlegen (Name reicht, PIN ist optional)
3. Damit ist die App vollständig nutzbar — Termine, Kasse, Strafen etc. lassen sich frei anlegen und testen
```

## 7. Screenshots

Pflicht: **6,9"-Display** (iPhone 16 Pro Max o. ä., 1320×2868 px) — mindestens 3, besser 5–6 Stück.
Falls „iPad unterstützt" aktiv bleibt (aktuell `supportsTablet: true` in app.json): zusätzlich **13"-iPad-Screenshots** nötig, sonst iPad-Unterstützung in App Store Connect deaktivieren, um das zu umgehen.

Ich kann die iOS-Simulator-Screenshots übernehmen, sobald du magst — sag Bescheid, dann fahre ich den Simulator in den passenden Auflösungen hoch und schieße Screens von Home, Kalender, Kasse und Strafen.

## 8. Build zuordnen & einreichen

1. In der Versionsseite (1.3.0) unter „Build" → „+" → den Build auswählen, der über `eas submit` hochgeladen wurde (erscheint nach Processing).
2. Exportkonformität: Frage nach Verschlüsselung → **Nein** (bereits in `app.json` als `ITSAppUsesNonExemptEncryption: false` hinterlegt, sollte automatisch vorausgefüllt sein).
3. Alle Felder oben ausfüllen → **Zur Prüfung einreichen**.

Review-Dauer bei Apple meist 24–48 Stunden.
