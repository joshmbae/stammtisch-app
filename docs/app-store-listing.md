# App Store Connect — Einreichung DeinStammtisch v1.9.0

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
3. **AVV mit Supabase:** Gilt automatisch als Teil der Nutzungsbedingungen, nichts zu unterschreiben
   (https://supabase.com/legal/dpa, Vertragspartner Supabase Pte. Ltd., Singapur; SCCs in Schedule 2).
   Eine Kopie mit Datum für die eigenen Unterlagen speichern (z. B. als PDF).
4. **Prod-Datenbank:** Für 1.9.0 gibt es **keine neue Migration**. Die letzte
   (`2026-11-01-admins.sql`) gehörte zu 1.8.0 und ist in `public` angekommen
   (Spalte `members.ist_admin` geprüft am 09.11.2026). Falls von der 1.8.0-Liste
   noch `2026-10-31-avatars-bucket-absichern.sql` offen ist: erst ausführen, wenn
   alle mindestens 1.8.0 haben.
   `supabase/seed/demo-mehr-daten.sql` ist nur für dev – **nicht** gegen `public` ausführen.
5. **Build hochladen:**
   ```bash
   eas build --platform all --profile production
   eas submit --platform all --latest
   ```
   Processing dauert 15–60 Minuten; erst dann ist der Build in der Version auswählbar.

## 1. Version 1.9.0 — Seite „Distribution → iOS-App → 1.9.0“

### Promotional Text (max. 170 Zeichen, jederzeit ohne Review änderbar)
```
Termine, Strafen, Kasse und Tabelle für eure feste Runde – mit Live-Modus für den Abend und dem Rückblick als Bild für eure WhatsApp-Gruppe.
```
(140 Zeichen)

### Description (max. 4000 Zeichen)
```
DeinStammtisch ist die App für eure feste Runde – ob Kartenabend, Vereinsstammtisch oder Freundeskreis mit eigenen Regeln. Alles, was ihr sonst in Chatgruppen und Zettelwirtschaft verliert, liegt hier an einem Ort.

DER ABEND: VORHER, LIVE, DANACH
Vorher sagt jeder mit einem Tipp zu oder ab, wer noch nicht geantwortet hat, bekommt eine Erinnerung. Zur Startzeit öffnet die App direkt den laufenden Abend: wer da ist, wer zu spät kam, Strafen und euer Spiel mit einem Tipp. Danach seht ihr den Abend in Zahlen.

RÜCKBLICK ZUM TEILEN
Nach dem Abend macht die App ein Bild mit eurem Foto vom Abend und den Siegern des Abends – fertig für die WhatsApp-Gruppe.

STRAFEN – NACH EUREN REGELN
Jeder Stammtisch legt seinen Strafenkatalog selbst fest. Strafen aus dem Spiel entstehen automatisch, offene Strafen sind mit einem Tipp beglichen.

KASSE
Kassenstand, Einnahmen, Ausgaben und Rechnungen, die einer für alle bezahlt hat – mit Übersicht, wer seinen Anteil schon beglichen hat.

SPIELE
Eigene Spiele mit eigenen Ereignissen, zum Beispiel Schocken oder Skat. Pro Ereignis ein Zähler, Strafen bei bestimmten Ergebnissen entstehen automatisch.

TABELLE
Ranglisten für Teilnahme, Verspätung, Strafen und eure Spiele, fürs laufende Jahr oder „Allzeit“. Ihr legt fest, ob viel oder wenig gut ist. Wer vorne liegt, trägt das Symbol am Profilbild.

DIE RUNDE
Profile mit Foto und Rollen wie Kassenwart oder Schriftführer, optional mit PIN geschützt. Satzung, Protokolle und Einstellungen an einem Ort. Wer in mehreren Runden ist, wechselt mit einem Tipp.

HELL UND DUNKEL
Ein warmes, ruhiges Design in Hell und Dunkel.

AUCH OHNE NETZ DABEI
Im Funkloch zeigt die App den letzten Stand an.

DATENSCHUTZ
Keine Werbung, kein Tracking, keine Analyse-Dienste. Keine Registrierung mit E-Mail: Ihr legt einen Stammtisch mit Name und Passwort an, die anderen treten mit denselben Zugangsdaten bei. Eigenes Profil und ganzer Stammtisch lassen sich jederzeit in der App löschen.
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
Der Abend geht noch schneller von der Hand:

• Live-Abend aufgeräumt: oben immer sichtbar, ob Vorher, Live oder Danach – darunter Heute, Strafen und euer Spiel. Das Foto vom Abend ist schon während des Abends zu sehen.
• Strafen mit zwei Tipps: der ganze Katalog als Kacheln, Strafe und Person antippen, fertig – mit „Rückgängig“.
• Verspätung schnell eintragen: unter „Heute“ die Person antippen und Minuten eintragen.
• Agenda auch am Abend, mit Namen, wer den Punkt eingetragen hat.
• Direkt bezahlen: offene Strafen mit einem Tipp per PayPal zahlen, bei paypal.me ist der Betrag schon eingetragen.
• Rückblick-Bild mit allen Siegern bei Gleichstand und der Anwesenheit in Prozent.
• Profil: Bilanz fürs Jahr oder „Allzeit“, offene Strafen deutlich sichtbar, Profilbilder groß ansehen.
• Dein Profilbild oben auf Home: Profil, Offenes, Hell/Dunkel und Einstellungen mit einem Tipp.
• Neue Runde gründen: Schritt für Schritt mit Einladung, erstem Termin und Admin – als Checkliste auf Home.
• Außerdem: „Die Runde“ aufgeräumt, auf Wunsch Veranstaltungen oben auf Home, viele kleine Verbesserungen und Fehlerbehebungen.
```
(ca. 1.120 Zeichen)

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
| Nutzerinhalte → Fotos oder Videos | Profilbild, Foto zum Termin, Stammtisch-Logo |
| Nutzerinhalte → Sonstige Nutzerinhalte | Notizen, Absagegründe, Strafen- und Kassen-Einträge, Protokolle, Satzung |
| Kennungen → Benutzer-ID | anonyme Anmelde-Kennung (Supabase), Zugriff auf Stammtische |
| Kennungen → Geräte-ID | Push-Token (Expo Push Service) |
| Sonstige Daten → Sonstige Datentypen | Geburtsdatum, Beruf, Lieblingsgetränk (freiwillige Profilfelder) |
| Finanzinformationen → Sonstige Finanzinfos | Optional: Beträge in Kasse/Strafen sind interne Buchführung, keine Zahlungsdaten. Konservativ angeben ist unkritisch |

**Nicht erfasst:** E-Mail, Telefon, Standort, Kontakte, Browserverlauf, Nutzungsdaten/Analytics, Diagnosedaten, Zahlungsdaten.

## 5. Screenshots — für 1.9.0 die Live-Bilder erneuern

Für 1.9.0 haben sich vor allem der Live-Abend (Phasen oben, Tab „Heute“, Strafenkatalog als Kacheln) und die Home-Live-Karte geändert. Bild 2 neu aufnehmen; die übrigen 1.8.0-Bilder können bleiben, wenn sie das aktuelle Design zeigen. Aufnehmen im Simulator (iPhone 16/17 Pro Max = 6,9", 1320 × 2868) gegen den Demo-Stammtisch, Statusleiste auf 9:41, erfundene Namen und Beträge. Ablage lokal in `store-assets/iphone-6.9/` (nicht im Repo).

**iPad:** `supportsTablet` ist ab 1.8.0 aus. Es werden keine iPad-Screenshots mehr gebraucht; die App läuft auf dem iPad im iPhone-Modus.

| Reihenfolge | Inhalt | Overlay-Text (optional) |
|---|---|---|
| 1 | Home mit Countdown und Bilanz | Alles für eure Runde auf einen Blick |
| 2 | Termin live (Strafen oder Spiel) | Der Abend läuft – eintragen mit einem Tipp |
| 3 | Rückblick-Bild | Der Abend als Bild für eure Gruppe |
| 4 | Kasse Übersicht | Kasse und Strafen im Griff |
| 5 | Tabelle | Wer führt dieses Jahr? |
| 6 | Termin vorher (Wer kommt) | Zu- und Absagen mit einem Tipp |
| 7 | Dunkel-Modus (Home) | Auch in Dunkel |

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
- Konto/Daten löschen: Das eigene Profil lässt sich unter Profil → Bearbeiten → Entfernen löschen, der ganze Stammtisch samt aller Daten unter Runde → Einstellungen → Gefahrenzone.
- Der optionale Zahlungslink (z. B. PayPal-Pool) öffnet nur eine externe Seite, über die sich Freunde untereinander Geld schicken. Die App wickelt keine Zahlungen ab und verkauft nichts.
- Push-Benachrichtigungen informieren über Termine, Erinnerungen und Einträge. Die Foto-Mediathek wird nur für optionale Bilder (Profil, Termin, Logo) genutzt; Kamera und Mikrofon nutzt die App nicht.
```

**Demo-Stammtisch:** Das Seed-Skript für die Produktion liegt lokal unter `store-assets/private/seed-prod.sql`, Zugangsdaten und fertiger Prüfer-Text unter `store-assets/private/`. Das Skript einmal im Supabase-SQL-Editor gegen `public` ausführen, vor dem Einreichen.

**Apple-Prüfpunkte, die hier relevant sind:**
- 1.2 (nutzergenerierte Inhalte): Inhalte sind nur in geschlossenen Gruppen sichtbar. Falls Apple nachfragt: Löschfunktion und Kontakt über Support-Seite verweisen.
- 5.1.1(v) (Kontolöschung): Eigenes Profil (Profil → Bearbeiten → Entfernen) und ganzer Stammtisch (Einstellungen → Gefahrenzone) lassen sich in der App löschen, Fotos werden dabei mit gelöscht.
- 3.1.1 (Käufe): Kein Verkauf digitaler Inhalte; der Zahlungslink ist Geld unter Freunden.
- 5.3 (Glücksspiel): Wetten sind entfernt, Hinweis in den Notizen oben.

## 7. Export-Compliance & Content Rights

- Verschlüsselung: `ITSAppUsesNonExemptEncryption: false` ist gesetzt, die Frage entfällt.
- Werbe-ID (IDFA): **Nein**.
- Inhalte Dritter: Nein.

## 8. Build zuordnen & einreichen

1. Version 1.9.0 → „Build“ → „+“ → den hochgeladenen Build auswählen.
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

## Versionshinweise 1.9.0 für Google Play (max. 500 Zeichen)

Play Console → Release → „Versionshinweise“ → Deutsch (de-DE):
```
<de-DE>
Neu in 1.9:
• Live-Abend aufgeräumt: Vorher, Live, Danach immer oben, Foto schon am Abend sichtbar
• Strafen mit zwei Tipps, mit Rückgängig
• Verspätung schnell eintragen, Agenda auch live
• Offene Strafen direkt per PayPal zahlen
• Rückblick mit allen Siegern und Anwesenheit
• Profil: Bilanz fürs Jahr oder Allzeit
• Neue Runde gründen mit Checkliste
• Viele Verbesserungen und Fehlerbehebungen
</de-DE>
```
(ca. 400 Zeichen ohne die Tags; die `<de-DE>`-Tags nur beim Einfügen über „Release-Hinweise für alle Sprachen“, sonst weglassen.)

## Bei jedem Release

```bash
eas build --platform all --profile production
eas submit --platform all --latest
```

`eas.json` schickt Android seit 1.9.0 in den Track **`production`** (öffentlich).
Für reine Testversionen vorübergehend wieder `internal` eintragen.

**Wichtig für die erste öffentliche Veröffentlichung:** Private Entwicklerkonten,
die nach dem 13.11.2023 angelegt wurden, müssen vor dem ersten Produktions-Release
einen **geschlossenen Test mit mindestens 12 Testern über 14 Tage** abschließen.
Ist das noch nicht erfolgt, lehnt Google den Upload in `production` ab – dann zuerst
in den Track `alpha` (geschlossener Test) und den Produktionszugriff in der Play
Console beantragen. Prüfen unter Play Console → Dashboard → „Produktionszugriff“.

**Achtung bei der allerersten Veröffentlichung:** Die Google-API darf keinen
neuen Store-Eintrag anlegen. War die App noch nie im Play Store, muss die erste
`.aab` von Hand über die Console hochgeladen werden; ab dem zweiten Mal
übernimmt `eas submit`.
