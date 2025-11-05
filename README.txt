
# EGE Reklam – Nutzungsrechte Formular (Netlify)

## Was ist das?
- Formular auf deiner Domain (z. B. https://www.ege-reklam.com/nutzungsrechte)
- Kunde füllt aus, unterschreibt digital, sendet ab
- Netlify speichert Submission (inkl. IP & Timestamp)
- Netlify Function erzeugt PDF und mailt es an dich + den Kunden (Kopie)

## Dateien
- `public/index.html` – Formular (Deutsch, mit Signaturpad)
- `public/style.css` – schlichtes Styling
- `public/success.html` – Danke-Seite
- `netlify/functions/form-submission-created.js` – erzeugt PDF + versendet Mails
- `netlify.toml` – Netlify-Konfiguration
- `package.json` – Dependencies für die Function (`pdf-lib`, `resend`)

## Voraussetzungen
- Netlify Account + Site (verbunden mit Repository oder Zip Upload)
- Domain (z. B. ege-reklam.com) bereits auf Netlify verbunden
- Resend Account (https://resend.com) oder alternativer SMTP-Dienst

### Benötigte Umgebungsvariablen (Netlify → Site Settings → Environment)
- `RESEND_API_KEY` – API Key von Resend
- `OWNER_EMAIL` – `nutzungsrechte@ege-reklam.com`
- `FROM_EMAIL` – z. B. `EGE Reklam <nutzungsrechte@ege-reklam.com>`

## Deployment (einfach)
1. Dieses Projekt in ein Git-Repo legen (z. B. GitHub) und mit Netlify verbinden **oder** den Ordner als Zip bei Netlify hochladen.
2. In Netlify die drei Env Vars setzen (siehe oben).
3. Deploy auslösen.
4. Formular ist unter `/` verfügbar – du kannst es auf `/nutzungsrechte` verschieben, indem du die Dateien in einen Unterordner legst oder eine Route anpasst.

## Form-Trigger
Die Netlify-Funktion `form-submission-created` wird automatisch bei neuen Form-Submissions ausgelöst (Hook-Name).

## Rechtshinweis
- Netlify speichert IP/Timestamp der Absender submission serverseitig. Diese Daten werden in der PDF übernommen.
- Digitale Unterschrift ist optional; aktive Zustimmung + IP/Timestamp sind in der Regel ausreichend. Bei besonders sensiblen Verträgen ggf. qualifizierte Signatur einsetzen.
