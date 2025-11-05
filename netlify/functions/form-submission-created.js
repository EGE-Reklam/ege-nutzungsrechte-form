
import { Resend } from 'resend';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ENV required:
// RESEND_API_KEY = your Resend API key
// OWNER_EMAIL = "nutzungsrechte@ege-reklam.com"
// FROM_EMAIL = "EGE Reklam <nutzungsrechte@ege-reklam.com>"

// This function is triggered by Netlify's form-submission-created event
export async function handler(event) {
  try {
    const payload = JSON.parse(event.body);

    // Netlify passes submission and site info in payload
    const submission = payload?.payload?.data || {};
    const submitMeta = payload?.payload || {};
    const submitterIP = submitMeta?.remote_ip || submitMeta?.client_ip || 'unbekannt';
    const submittedAt = submitMeta?.created_at || new Date().toISOString();

    // Extract form fields
    const firma = submission.firma || '';
    const vorname = submission.vorname || '';
    const nachname = submission.nachname || '';
    const adresse = submission.adresse || '';
    const email = submission.email || '';
    const telefon = submission.telefon || '';
    const rechte = submission.rechte || '';
    const referenz = submission.referenz || '';
    const agb = submission.agb === 'akzeptiert' ? 'akzeptiert' : 'nicht akzeptiert';
    const signatureData = submission.signatureData || null; // dataURL (image/png)

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait (72dpi)
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const marginX = 40;
    let y = height - 50;

    function drawText(text, x, y, size=11, bold=false) {
      page.drawText(text, { x, y, size, font: bold ? fontBold : font, color: rgb(0,0,0) });
    }

    // Logo/Head line (simple text header; you can replace with image if desired)
    drawText('EGE Reklam – Werbetechnik & Druckerzeugnisse', marginX, y, 14, true);
    y -= 18;
    drawText('Nutzungsrechte – Bestätigung', marginX, y, 12, true);
    y -= 10;
    page.drawLine({ start: {x: marginX, y}, end: {x: width - marginX, y}, thickness: 1, color: rgb(0.8,0.8,0.8) });
    y -= 20;

    drawText('Eingang:', marginX, y, 10, true); drawText(new Date(submittedAt).toLocaleString('de-DE'), marginX+120, y, 10);
    y -= 14;
    drawText('IP-Adresse:', marginX, y, 10, true); drawText(String(submitterIP), marginX+120, y, 10);
    y -= 20;

    drawText('Kundendaten', marginX, y, 12, true); y -= 14;
    drawText('Firma:', marginX, y, 11, true); drawText(firma, marginX+120, y, 11); y -= 14;
    drawText('Vorname:', marginX, y, 11, true); drawText(vorname, marginX+120, y, 11); y -= 14;
    drawText('Nachname:', marginX, y, 11, true); drawText(nachname, marginX+120, y, 11); y -= 14;
    drawText('Adresse:', marginX, y, 11, true); drawText(adresse, marginX+120, y, 11); y -= 14;
    drawText('E-Mail:', marginX, y, 11, true); drawText(email, marginX+120, y, 11); y -= 14;
    drawText('Telefon:', marginX, y, 11, true); drawText(telefon, marginX+120, y, 11); y -= 22;

    drawText('Auswahl', marginX, y, 12, true); y -= 14;
    drawText('Nutzungsrechte:', marginX, y, 11, true); drawText(rechte, marginX+120, y, 11); y -= 14;
    drawText('Referenznutzung:', marginX, y, 11, true); drawText(referenz, marginX+120, y, 11); y -= 14;
    drawText('AGB:', marginX, y, 11, true); drawText(agb, marginX+120, y, 11); y -= 24;

    // Signature block
    drawText('Digitale Unterschrift', marginX, y, 12, true); y -= 10;
    page.drawLine({ start: {x: marginX, y}, end: {x: width - marginX, y}, thickness: 1, color: rgb(0.9,0.9,0.9) });
    y -= 160;

    if (signatureData && signatureData.startsWith('data:image/png;base64,')) {
      const base64 = signatureData.split(',')[1];
      const sigBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const sigImage = await pdfDoc.embedPng(sigBytes);
      const sigW = 360, sigH = 120;
      page.drawImage(sigImage, { x: marginX, y: y + 20, width: sigW, height: sigH });
    } else {
      drawText('(keine Unterschrift übermittelt)', marginX, y + 50, 11, false);
    }

    // Footer note
    const footY = 60;
    page.drawLine({ start: {x: marginX, y: footY+8}, end: {x: width - marginX, y: footY+8}, thickness: 1, color: rgb(0.8,0.8,0.8) });
    drawText('Hinweis: Diese PDF enthält Zeitstempel und IP-Adresse aus der Server-Aufzeichnung.', marginX, footY, 9, false);

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    // Send emails via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.FROM_EMAIL || 'EGE Reklam <noreply@your-domain.com>';
    const owner = process.env.OWNER_EMAIL || 'nutzungsrechte@example.com';

    const subject = 'Nutzungsrechte – Eingegangene Bestätigung';
    const htmlBody = `
      <p>Neue Bestätigung von ${vorname} ${nachname} (${email}).</p>
      <ul>
        <li>Rechte: ${rechte}</li>
        <li>Referenz: ${referenz}</li>
        <li>AGB: ${agb}</li>
        <li>IP: ${submitterIP}</li>
        <li>Datum: ${new Date(submittedAt).toLocaleString('de-DE')}</li>
      </ul>
      <p>Das PDF ist im Anhang.</p>
    `;

    // Email to owner
    await resend.emails.send({
      from,
      to: owner,
      subject,
      html: htmlBody,
      attachments: [
        { filename: 'Nutzungsrechte.pdf', content: pdfBase64 }
      ]
    });

    // Email to customer (copy)
    if (email) {
      await resend.emails.send({
        from,
        to: email,
        subject: 'Kopie Ihrer Nutzungsrechte-Bestätigung',
        html: `<p>Hallo ${vorname} ${nachname},</p>
               <p>vielen Dank. Im Anhang finden Sie eine Kopie Ihrer Bestätigung.</p>`,
        attachments: [
          { filename: 'Nutzungsrechte.pdf', content: pdfBase64 }
        ]
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
}
