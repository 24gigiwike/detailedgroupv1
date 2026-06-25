module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (!body || typeof body !== 'object') {
    try {
      body = JSON.parse(req.body);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const company = (body.company || '').trim();
  const projectDetails = (body.projectDetails || '').trim();
  const subject = (body.subject || '').trim();
  const message = (body.message || '').trim();

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const SEND_TO = process.env.TO_EMAIL || 'hello@detailedgroup.co';
  const API_KEY = process.env.EMAIL_SERVICE_API_KEY;
  const FROM_EMAIL = "DetailedGroup <hello@detailedgroup.co>";

  if (!API_KEY) {
    return res.status(500).json({ error: 'Email service API key is not configured.' });
  }

  if (!FROM_EMAIL) {
    return res.status(500).json({ error: 'Sender email is not configured.' });
  }

  const lines = [
    `Name: ${name}`,
    `Email: ${email}`,
  ];

  if (company) {
    lines.push(`Company: ${company}`);
  }

  if (subject) {
    lines.push(`Subject: ${subject}`);
  }

  if (projectDetails) {
    lines.push(`Project Details: ${projectDetails}`);
  }

  if (message) {
    lines.push(`Message: ${message}`);
  }

  const emailSubject = `Website Consultation Request from ${name}`;
  const emailBody = lines.join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: SEND_TO,
        subject: emailSubject,
        text: emailBody,
        reply_to: email
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ error: 'Email provider error', details: errorText });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Contact API error:', error);
    return res.status(500).json({ error: 'Failed to send email.' });
  }
}
