async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/responses/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        responseId: 'a60216bb-04e4-4d83-9366-eb52c7128f73', // using the actual UUID from db? No I need a real response id from db
        formId: 'd8531994-bc07-4d14-8583-36b2034dbf3c'
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error(err);
  }
}
run();
