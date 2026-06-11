const fs = require('fs');

async function run() {
  const url = "https://script.google.com/macros/s/AKfycbwEPHgBcfpR5m8ULh4pyCatD3yjAll2kL4b9Ru4xiuNAnfs8GDn3Fpirx-PYdykrR5Q/exec";

  // Download a sample smartphone image
  const imgResponse = await fetch('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=200&auto=format&fit=crop');
  const buffer = await imgResponse.arrayBuffer();
  const base64Img = Buffer.from(buffer).toString('base64');

  const payload = {
    type: "search_by_image",
    photo: "data:image/jpeg;base64," + base64Img
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const text = await res.text();
  console.log("Smartphone Result:", text);
}

run();
