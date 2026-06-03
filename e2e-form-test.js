const url = 'https://mbipa-whatsapp-ecajgkctb4cxeyck.azurewebsites.net';

const tests = [
  {
    name: 'Appointment',
    path: '/api/v1/appointments',
    body: {
      name: 'E2E Test User',
      email: 'e2e@example.com',
      reason: 'depression',
      format: 'phone',
      date: new Date(Date.now() + 172800000).toISOString(),
      period: 'afternoon',
      notes: 'E2E validation test',
      language: 'en'
    }
  },
  {
    name: 'Testimonial',
    path: '/api/v1/testimonials',
    body: {
      name: 'Happy Customer',
      email: 'happy@example.com',
      message: 'The Mbipa app has been transformative for mental health!',
      language: 'en'
    }
  },
  {
    name: 'Contact',
    path: '/api/v1/messages',
    body: {
      subject: 'Feature: Offline Mode',
      message: 'Would love offline access to meditation sessions.',
      senderEmail: 'feature@example.com',
      language: 'en'
    }
  }
];

(async () => {
  console.log('\n=== FRONTEND E2E TEST ===\n');
  let passed = 0;
  for (const t of tests) {
    try {
      const res = await fetch(url + t.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t.body)
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text.substring(0, 100) };
      }
      if (res.status === 201 && data.success) {
        console.log('✓ PASS - ' + t.name + ': 201 Created (id: ' + data.id + ')');
        passed++;
      } else {
        console.log('✗ FAIL - ' + t.name + ': ' + res.status + ' ' + JSON.stringify(data));
      }
    } catch (e) {
      console.log('✗ ERROR - ' + t.name + ': ' + e.message);
    }
  }
  console.log('\n=== RESULT ===');
  console.log('Passed: ' + passed + '/3 tests');
  if (passed === 3) {
    console.log('✓ All form submissions working!\n');
  }
})();
