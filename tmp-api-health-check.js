const urls = [
  'https://mbipa-whatsapp-ecajgkctb4cxeyck.eastus-01.azurewebsites.net',
  'https://mbipa-whatsapp-ecajgkctb4cxeyck.azurewebsites.net',
];
const paths = ['/api/v1/appointments', '/api/v1/testimonials', '/api/v1/messages'];
const body = {
  name: 'E2E',
  email: 'e2e@example.com',
  subject: 'test',
  message: 'test',
  reason: 'depression',
  format: 'video',
  date: new Date().toISOString(),
  period: 'morning',
  notes: 'test',
  language: 'en',
};

(async () => {
  for (const base of urls) {
    console.log('\nBASE:', base);
    for (const path of paths) {
      try {
        const res = await fetch(base + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const text = await res.text();
        const snippet = text.replace(/\n/g, ' ').slice(0, 250);
        console.log(path, res.status, snippet);
      } catch (err) {
        console.log(path, 'ERROR', err.message || err);
      }
    }
  }
})();
