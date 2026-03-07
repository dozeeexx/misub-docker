import fs from 'fs';
const url = 'https://mmw.email.nyc.mn/api/clash/subscribe?filename=mmw.yaml&t=clash&token=4f708a7d-48e9-43a3-b5ac-fc961bb56198';

async function testFetch() {
  const res = await fetch(url, { headers: { 'User-Agent': 'v2rayN/7.23' }});
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log("Response preview:");
  console.log(text.substring(0, 500));
}
testFetch();
