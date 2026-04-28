import axios from 'axios';

async function testProxySearch() {
  const url = 'http://localhost:5001/api/openai/search';
  const query = 'samsung';
  
  console.log(`Testing Proxy Search for: ${query} at ${url}...`);
  
  try {
    const response = await axios.post(url, { query });
    console.log('✅ SUCCESS!');
    console.log('Results count:', response.data.data?.length);
    if (response.data.data?.length > 0) {
      console.log('First result:', response.data.data[0].title);
    }
  } catch (error: any) {
    console.error('❌ FAILED');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
    console.log('\nNOTE: Make sure the backend is running locally at http://localhost:5001');
  }
}

testProxySearch();
