const url = 'https://mmw.email.nyc.mn/api/clash/subscribe?filename=mmw.yaml&t=clash&token=4f708a7d-48e9-43a3-b5ac-fc961bb56198';

async function test() {
  console.log("Calling local api...");
  const res = await fetch('http://127.0.0.1:8999/api/parse-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response length: ${text.length}`);
  try {
    const data = JSON.parse(text);
    console.log(`Parsed ${data.nodes?.length} nodes`);
    if(data.error) console.log("Error:", data.error);
    if(data.isBase64) console.log("isBase64 is true");
  } catch(e) {
    console.log("Snippet:", text.substring(0, 200));
  }
}

test();
