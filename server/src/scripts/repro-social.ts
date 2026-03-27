
import axios from 'axios';

const API_URL = 'http://localhost:6002/api';


async function reproSocial() {
  try {
    console.log('1. Logging in as Admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'admin@rations.ng',
      password: 'password123'
    });

    if (!loginRes.data.success) {
      console.error('❌ Login Failed');
      return;
    }

    const { token } = loginRes.data.data;
    console.log('✅ Login Successful');
    
    const headers = { Authorization: `Bearer ${token}` };

    // A) Connect Start
    console.log('\n2. Testing Connect Start (POST /admin/integrations/social/instagram/connect/start)...');
    try {
      const res = await axios.post(`${API_URL}/admin/integrations/social/instagram/connect/start`, {}, { headers });
      console.log('✅ Connect Start Success:', res.data);
    } catch (err: any) {
      console.log('❌ Connect Start Failed:');
      console.log(`   Status: ${err.response?.status}`);
      console.log(`   Message: ${JSON.stringify(err.response?.data)}`);
    }

    // B) Status
    console.log('\n3. Testing Status (GET /admin/integrations/social/status)...');
    try {
      const res = await axios.get(`${API_URL}/admin/integrations/social/status`, { headers });
      console.log('✅ Status Success:', res.data);
    } catch (err: any) {
      console.log('❌ Status Failed:');
      console.log(`   Status: ${err.response?.status}`);
      console.log(`   Message: ${JSON.stringify(err.response?.data)}`);
    }

    // C) Sync Preview
    console.log('\n4. Testing Sync Preview (POST /admin/integrations/social/instagram/sync { mode: "preview" })...');
    try {
      const res = await axios.post(`${API_URL}/admin/integrations/social/instagram/sync`, { mode: 'preview' }, { headers });
      console.log('✅ Sync Preview Success:', res.data);
    } catch (err: any) {
      console.log('❌ Sync Preview Failed:');
      console.log(`   Status: ${err.response?.status}`);
      console.log(`   Message: ${JSON.stringify(err.response?.data)}`);
    }

    // D) Import
    console.log('\n5. Testing Sync Import (POST /admin/integrations/social/instagram/sync { mode: "import" })...');
    try {
      const res = await axios.post(`${API_URL}/admin/integrations/social/instagram/sync`, { mode: 'import' }, { headers });
      console.log('✅ Sync Import Success:', res.data);
    } catch (err: any) {
      console.log('❌ Sync Import Failed:');
      console.log(`   Status: ${err.response?.status}`);
      console.log(`   Message: ${JSON.stringify(err.response?.data)}`);
    }

    // E) Auto-publish Settings
    console.log('\n6. Testing Settings Update (PATCH /admin/integrations/social/instagram/settings)...');
    try {
      const res = await axios.patch(`${API_URL}/admin/integrations/social/instagram/settings`, {
        autoPublish: true,
        autoPublishHashtag: '#rationsapproved'
      }, { headers });
      console.log('✅ Settings Update Success:', res.data);
    } catch (err: any) {
      console.log('❌ Settings Update Failed:');
      console.log(`   Status: ${err.response?.status}`);
      console.log(`   Message: ${JSON.stringify(err.response?.data)}`);
    }

  } catch (error: any) {
    console.error('❌ Repro Script Failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

reproSocial();
