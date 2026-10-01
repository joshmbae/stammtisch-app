# App Store Connect — Einreichung DeinStammtisch v1.6.0

Alles, was in App Store Connect einzutragen ist, in der Reihenfolge der Oberfläche.
Zeichenlimits sind geprüft. Die App-ID `6789122309` (ascAppId in `eas.json`) existiert bereits.

## 0. Vorab erledigen

1. **Datenschutz- & Support-Seite live?** GitHub → Repo `joshmbae/stammtisch-app` →
   Settings → Pages → Branch `main`, Ordner `/docs`. Danach erreichbar unter
   - `https://joshmbae.github.io/stammtisch-app/privacy.html`
   - `https://joshmbae.github.io/stammtisch-app/support.html`
   Die Seiten müssen **vor** dem Einreichen online sein (Apple ruft sie ab).
2. **Impressum:** Eine öffentlich im Store angebotene App braucht in Deutschland
   vermutlich ein Impressum (§ 5 DDG), auch als Privatperson. Die Support-Seite
   nennt bisher nur eine E-Mail. Empfehlung: Impressum-Abschnitt mit ladungsfähiger
   Anschrift auf `support.html` ergänzen (Entwurf, vor Veröffentlichung selbst prüfen
   bzw. rechtlich absichern lassen).
3. **AVV mit Supabase** abschließen (Datenschutzerklärung sagt „liegt vor / ist abzuschließen“;
   Region laut Erklärung eu-west-1, Irland).
4. **Build hochladen:**
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios --latest
   ```
   Processing dauert 15–60 Minuten; erst dann ist der Build in der Version auswählbar.

## 1. Version 1.6.0 — Seite „Distribution → iOS-App → 1.6.0“

### Promotional Text (max. 170 Zeichen, jederzeit ohne Review änderbar)
```
Termine, Kasse, Strafen und Ranglisten für eure feste Runde. Eigener Strafenkatalog, Jahreswertung mit Sieger-Badges und Serientermine – alles in einer App.
```
(156 Zeichen)

### Description (max. 4000 Zeichen)
```
DeinStammtisch ist die App für eure feste Runde – ob Kartenabend, Vereinsstammtisch oder Freundeskreis mit eigenen Regeln. Alles, was ihr sonst in Chatgruppen und Zettelwirtschaft verliert, liegt hier an einem Ort.

TERMINE
Alle Stammtische im Kalender. Mitglieder sagen zu oder ab (auf Wunsch mit Grund), tragen Anwesenheit und Verspätung direkt im Termin ein. Termine lassen sich wöchentlich, alle 2 Wochen oder monatlich wiederholen und bekommen ein eigenes Titelbild.

STRAFEN – NACH EUREN REGELN
Jeder Stammtisch legt seinen Strafenkatalog selbst fest: Kategorien anlegen, umbenennen, Beträge ändern oder Vorlagen mit einem Tipp übernehmen. Wer absagt, zu spät kommt oder ein Spiel verliert, kassiert eine Strafe. Alle Strafen auf einen Blick, offen oder beglichen.

KASSE
Einnahmen, Ausgaben und Abendkosten sauber dokumentiert, inklusive Kostenteilung und Übersicht, wer schon bezahlt hat.

SPIELE
Legt eigene Spiele mit individuellen Ereignissen an, zum Beispiel Schocken oder Skat. Pro Ereignis ein großer Button: antippen, +1, fertig. Strafen bei bestimmten Ergebnissen entstehen automatisch.

RANGLISTEN & SIEGER-BADGES
Die Wertungen zeigen das laufende Jahr, die ewige Tabelle gibt es unter „Allzeit“. Wer eine Wertung anführt, trägt das Badge am Profilbild. Bei Gleichstand teilt ihr euch den Platz.

MITGLIEDER & ROLLEN
Jede Person hat ein eigenes Profil mit Rollen wie Kassenwart oder Schriftführer, optional mit PIN geschützt.

SATZUNG
Regeln, Treffpunkt und Termine eurer Runde, für alle jederzeit einsehbar.

AKTIVITÄTS-FEED & BENACHRICHTIGUNGEN
Seht in Echtzeit, was in der Runde passiert, und lasst euch an neue Termine erinnern.

AUCH OHNE NETZ DABEI
Im Funkloch zeigt die App den letzten Stand an. Zum Aktualisieren einfach nach unten ziehen.

DATENSCHUTZ
Keine Werbung, kein Tracking, keine Analyse-Dienste von Drittanbietern. Die Daten gehören eurer Runde. Eine Registrierung mit E-Mail ist nicht nötig: Ihr legt einen Stammtisch mit Name und Passwort an, die anderen treten mit denselben Zugangsdaten bei.
```

### Keywords (max. 100 Zeichen, ohne Leerzeichen nach Komma)
```
stammtisch,verein,kneipenrunde,kasse,strafen,termine,rangliste,schocken,kartenrunde,skat,vereinsapp
```
(99 Zeichen. Name und Untertitel zählen schon als Suchbegriffe, daher dort nicht wiederholt.)

### Support URL
```
https://joshmbae.github.io/stammtisch-app/support.html
```

### Marketing URL
Leer lassen (optional).

### Version / Copyright
```
2026 Joshua Bär
```
(Apple ergänzt das ©-Zeichen nicht selbst: Feld ohne „©“ ausfüllen oder „© 2026 Joshua Bär“ eintragen, beides ist üblich.)

### What's New in This Version (max. 4000 Zeichen)
```
Das ist neu für eure Runde:

• Eigener Strafenkatalog: Kategorien anlegen, umbenennen, Beträge ändern oder Vorlagen übernehmen (Einstellungen → Strafenkategorien verwalten)
• Jahresranglisten: Die Wertungen zeigen das laufende Jahr, „Allzeit“ bleibt als ewige Tabelle. Bei Gleichstand teilt ihr euch den Platz
• Sieger-Badges: Wer eine Wertung anführt, trägt das Icon am Profilbild. Im Profil seht ihr, wer in welchem Jahr vorne lag
• Serientermine: wöchentlich, alle 2 Wochen oder monatlich, mit nur einer Benachrichtigung
• Titelbild für Termine
• Absage mit Grund
• Offline-Anzeige: Ohne Netz seht ihr den letzten Stand, überall lässt sich per Ziehen aktualisieren
• „Strafe hinzufügen“ öffnet ein eigenes Fenster, im Spiel-Tab zählt ein großer Button pro Ereignis
• Strafen-Kachel mit Gesamtsumme und offenem Betrag, Strafen-Tab pro Stammtisch ausblendbar
• Einstellungen übersichtlich gruppiert, Protokolle nach Termin-Datum sortiert
• Schnelleres Laden von Startseite und Terminen

Behoben: Doppeltes Antippen bucht Strafen, Kasse und Termine nicht mehr doppelt, ungespeicherte Eingaben in den Einstellungen gehen nicht mehr verloren, lange Strafen-Namen werden vollständig angezeigt.

Der Wetten-Bereich ist entfallen. Bestehende Wetten-Strafen bleiben als normale Strafen erhalten.
```

## 2. App-Informationen (links unter „Allgemein“)

| Feld | Wert |
|---|---|
| Name | `DeinStammtisch` (14/30) |
| Untertitel | `Termine, Kasse & Strafen` (24/30) |
| Hauptsprache | Deutsch |
| Bundle-ID | `com.diehellen.stammtischapp` |
| SKU | wie bei Anlage vergeben (unveränderlich) |
| Primäre Kategorie | Lifestyle |
| Sekundäre Kategorie | Soziale Netzwerke |
| Inhaltsrechte | „Nein, enthält keine Inhalte Dritter“ |
| Datenschutzrichtlinie-URL | `https://joshmbae.github.io/stammtisch-app/privacy.html` |
| Preis | Kostenlos (Preisstufe 0), alle Länder |
| Verfügbarkeit | Zunächst nur DE/AT/CH ist möglich, sonst alle Länder; Texte sind deutsch |

## 3. Altersfreigabe (Fragebogen)

Alle Fragen mit **Keine / Nein** beantworten, mit zwei Ausnahmen, die ehrlich zu beantworten sind:

| Frage | Antwort | Begründung |
|---|---|---|
| Alkohol, Tabak, Drogen: Verweise/Darstellung | **Selten/Mild** | Bier-Emojis und Rollen wie „Bierwart“, Lieblingsgetränk im Profil |
| Gelegentliche/häufige Simulation von Glücksspiel | Keine | Wetten-Tab wurde entfernt; Würfelspiele werden nur protokolliert, kein Geldeinsatz in der App |
| Echtes Glücksspiel | Nein | |
| Nutzergenerierte Inhalte / Chat | Nein bzw. nur innerhalb geschlossener Gruppen | Kein öffentlicher Feed, kein Chat |
| Unbeschränkter Web-Zugriff | Nein | |

Erwartetes Ergebnis: 4+ oder 9+ (wegen Alkohol-Verweisen). Das ist in Ordnung.

## 4. App-Datenschutz („App Privacy“)

„Datenschutzpraktiken“ → **Daten erfassen: Ja**. **Tracking: überall Nein** (keine Drittanbieter-SDKs, keine Werbe-ID).
Alle erfassten Daten: **mit der Identität verknüpft = Ja**, **Tracking = Nein**, **Zweck = App-Funktionalität**.

| Apple-Kategorie → Datentyp | Quelle in der App |
|---|---|
| Kontaktinfo → Name | Mitgliedsname, Spitzname |
| Nutzerinhalte → Fotos oder Videos | Profilbild, Termin-Titelbild |
| Nutzerinhalte → Sonstige Nutzerinhalte | Notizen, Absagegründe, Strafen- und Kassen-Einträge, Protokolle, Satzung |
| Kennungen → Geräte-ID | Push-Token (Expo Push Service) |
| Sonstige Daten → Sonstige Datentypen | Geburtsdatum, Beruf, Lieblingsgetränk (freiwillige Profilfelder) |
| Finanzinformationen → Sonstige Finanzinfos | Optional: Beträge in Kasse/Strafen sind interne Buchführung, keine Zahlungsdaten. Konservativ angeben ist unkritisch |

**Nicht erfasst:** E-Mail, Telefon, Standort, Kontakte, Browserverlauf, Nutzungsdaten/Analytics, Diagnosedaten, Zahlungsdaten.

## 5. Screenshots

| Gerät | Pflicht? | Größe (Hochformat) |
|---|---|---|
| iPhone 6,9" (17 Pro Max, 16 Pro Max …) | **Ja** | 1320 × 2868 px |
| iPad 13" | **Ja**, solange `supportsTablet: true` | 2064 × 2752 px |

Kleinere iPhone-Größen skaliert Apple aus den 6,9"-Bildern. 3 bis 10 Bilder pro Gerät,
empfohlen 6 in dieser Reihenfolge (Bildunterschrift = Overlay-Text, falls ihr welche setzt):

1. **Startseite** – „Alles für eure Runde auf einen Blick“
2. **Kalender / Termin-Detail** mit Zu-/Absagen – „Termine planen, Zu- und Absagen sammeln“
3. **Strafen** – „Strafen nach euren Regeln“
4. **Strafenkategorien** (Vorlagen) – „Euer Strafenkatalog, euer Spiel“
5. **Kasse** – „Kasse und Abendkosten im Griff“
6. **Rangliste mit Sieger-Badges** – „Wer führt dieses Jahr?“

Wichtig: Nur Demo-Daten mit erfundenen Namen und Beträgen verwenden, keine echten Mitglieder (DSGVO, Einwilligung).
Wenn ihr den iPad-Aufwand sparen wollt: `supportsTablet` auf `false` setzen und neu bauen.

## 6. App-Überprüfung (App Review Information)

**Anmeldeinformationen:** „Anmeldung erforderlich“ → **aus**, außer ihr stellt einen Demo-Stammtisch bereit (empfohlen, siehe unten), dann Benutzername = Stammtisch-Name, Passwort = Stammtisch-Passwort.

**Kontakt:** Joshua Bär, Telefonnummer + E-Mail `joshmbaer@googlemail.com`.

**Notizen für das Review (kopierbar):**
```
DeinStammtisch ist eine App zur Organisation privater Stammtisch-Runden (Termine, Kasse, Strafen, Ranglisten). Es gibt keine zentralen Nutzerkonten und keine E-Mail-Registrierung.

Zum Testen entweder
A) mit dem Demo-Stammtisch beitreten:
   Name: [DEMO-NAME]
   Passwort: [DEMO-PASSWORT]
   dann ein vorhandenes Mitglied auswählen (kein PIN nötig),
oder
B) einen eigenen Stammtisch anlegen: Auf "Stammtisch anlegen" tippen, beliebigen Namen und ein Passwort vergeben, danach ein Mitglied-Profil anlegen (Name genügt, PIN optional).

Hinweise:
- Strafen sind reine Spaß-Buchführung innerhalb der Gruppe. Es werden keine Zahlungen abgewickelt und es gibt keine In-App-Käufe. Geldbeträge sind nur interne Anzeige.
- Die App enthält kein Glücksspiel und keine Wetten.
- Inhalte sind nur für Mitglieder der jeweiligen geschlossenen Gruppe sichtbar (kein öffentlicher Feed, kein Chat).
- Der Stammtisch samt aller Daten kann unter Einstellungen → Gefahrenzone gelöscht werden.
- Push-Benachrichtigungen erinnern an Termine. Kamera/Fotos werden nur für das optionale Profilbild genutzt.
```

**Empfehlung:** Demo-Stammtisch anlegen (Option A mit gefüllten Beispieldaten). Ein leerer
Stammtisch zeigt dem Prüfer fast nichts, das verlängert das Review oder führt zu Rückfragen.

**Apple-Prüfpunkte, die hier relevant sind:**
- 1.2 (nutzergenerierte Inhalte): Inhalte sind nur in geschlossenen Gruppen sichtbar. Falls Apple nachfragt: Löschfunktion und Kontakt über Support-Seite verweisen.
- 5.1.1(v) (Kontolöschung): Stammtisch lässt sich in der App löschen. Einzelne Mitglieder-Profile ebenfalls.
- 5.3 (Glücksspiel): Wetten sind entfernt, Hinweis in den Notizen oben.

## 7. Export-Compliance & Content Rights

- Verschlüsselung: `ITSAppUsesNonExemptEncryption: false` ist gesetzt, die Frage entfällt.
- Werbe-ID (IDFA): **Nein**.
- Inhalte Dritter: Nein.

## 8. Build zuordnen & einreichen

1. Version 1.6.0 → „Build“ → „+“ → den hochgeladenen Build auswählen.
2. Alle Pflichtfelder prüfen (Screenshots, Beschreibung, Support-URL, Datenschutz, Review-Kontakt).
3. „Zur Prüfung hinzufügen“ → „Zur Prüfung einreichen“.
4. Release-Methode: „Manuell veröffentlichen“ empfohlen, dann bestimmt ihr den Zeitpunkt nach Freigabe.

Review-Dauer meist 24–48 Stunden.

---

# Android / Google Play

Stand: 30.09.2026. Die Play Console hat den früheren Weg über „Einstellungen →
API-Zugriff" abgelöst — das Dienstkonto wird heute in der **Google Cloud
Console** angelegt und in der Play Console unter **Nutzer und Berechtigungen**
eingeladen. Quelle: [Expos Anleitung](https://expo.fyi/creating-google-service-account).

## Einmalig: Dienstkonto für automatische Uploads

1. **Cloud-Projekt** anlegen, falls noch keins verknüpft ist:
   <https://console.cloud.google.com/projectcreate>
2. **Dienstkonto erstellen**:
   <https://console.cloud.google.com/iam-admin/serviceaccounts> → „Dienstkonto
   erstellen" → Name z. B. `eas-submit` → „Erstellen und schließen".
   Im Cloud-Projekt ist **keine Rolle** nötig, die Rechte kommen aus der Play Console.
3. **E-Mail-Adresse des Dienstkontos kopieren** (endet auf `iam.gserviceaccount.com`).
4. **Schlüssel erzeugen**: beim Dienstkonto „Schlüssel verwalten → Neuen Schlüssel
   erstellen → JSON". Die Datei gehört **nicht ins Repo** — `.gitignore` fängt die
   üblichen Namen ab, aber sie wird ohnehin nur einmal gebraucht.
5. **API aktivieren**: [Google Play Android Developer API](https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com)
   → „Aktivieren". Ohne diesen Schritt scheitert der Upload mit einer
   unverständlichen Fehlermeldung.
6. **In der Play Console einladen**: Play Console → „Nutzer und Berechtigungen" →
   „Neue Nutzer einladen" → Dienstkonto-E-Mail einfügen → App auswählen → Rechte:
   - App-Zugriff: App-Informationen ansehen (schreibgeschützt)
   - Entwurfs-Apps bearbeiten und löschen
   - Releases: in Produktion veröffentlichen, in Testkanälen veröffentlichen,
     Testkanäle verwalten
   - Store-Präsenz verwalten
7. **Schlüssel hochladen**: beim ersten `eas submit --platform android` fragt die
   CLI nach der JSON-Datei und legt sie bei EAS ab. Danach kann die lokale Datei weg.

## Bei jedem Release

```bash
eas build --platform all --profile production
eas submit --platform all --latest
```

`eas.json` schickt Android in den Track `internal` (Gegenstück zu TestFlight).
Für eine öffentliche Veröffentlichung `submit.production.android.track` auf
`production` setzen.

**Achtung bei der allerersten Veröffentlichung:** Die Google-API darf keinen
neuen Store-Eintrag anlegen. War die App noch nie im Play Store, muss die erste
`.aab` von Hand über die Console hochgeladen werden; ab dem zweiten Mal
übernimmt `eas submit`.
