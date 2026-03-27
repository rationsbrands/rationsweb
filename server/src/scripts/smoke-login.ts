
import axios from 'axios';

const API_URL = process.env.VITE_RATIONSWEB_API_URL || 'http://127.0.0.1:6002';

async function smokeTest() {
  try {
    console.log('1. Attempting Login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'rations.ng@gmail.com',
      password: 'password123'
    });

    if (loginRes.data.success) {
      console.log('✅ Login Successful');
      const { token, user } = loginRes.data.data;
      console.log(`   User: ${user.email}, Role: ${user.role}`);

      if (user.role !== 'owner') {
        console.error('❌ Role mismatch! Expected owner, got:', user.role);
        process.exit(1);
      }

      // 2. Access Admin Route
      console.log('2. Accessing Protected Admin Route (Overview)...');
      try {
        const overviewRes = await axios.get(`${API_URL}/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (overviewRes.data.success) {
            console.log('✅ Admin Overview Access Successful');
            console.log('   Stats:', JSON.stringify(overviewRes.data.data, null, 2));
        } else {
          console.log('⚠️ Admin Overview returned success=false:', overviewRes.data);
        }
      } catch (err: any) {
        console.error('❌ Admin Overview Failed Details:');
        if (err.response) {
          console.error('   Status:', err.response.status);
          console.error('   Data:', JSON.stringify(err.response.data, null, 2));
          console.error('   Headers:', JSON.stringify(err.response.headers, null, 2));
        } else if (err.request) {
          console.error('   No response received:', err.message);
        } else {
          console.error('   Error setting up request:', err.message);
        }
      }

    } else {
      console.error('❌ Login Failed (No Success Flag)');
    }

  } catch (error: any) {
    console.error('❌ Smoke Test Failed:', error.message);
    if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

smokeTest();
