const axios = require('axios');

async function test() {
  try {
    // 1. Register or Login
    let token;
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        name: 'Test', email: 'test1@test.com', password: 'password', role: 'user'
      });
      token = res.data.token;
      console.log('Registered', token);
    } catch (e) {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'test1@test.com', password: 'password'
      });
      token = res.data.token;
      console.log('Logged in', token);
    }

    // 2. Submit initial application
    const app1 = await axios.post('http://localhost:5000/api/applications', {
      income: 50000, existingDebt: 10000, employmentYears: 3, creditScore: 650
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('App1 created:', app1.data.income);

    // 3. Update application
    const app2 = await axios.post('http://localhost:5000/api/applications', {
      income: 80000, existingDebt: 5000, employmentYears: 5, creditScore: 750
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('App2 updated:', app2.data.income);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
