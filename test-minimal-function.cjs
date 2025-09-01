const { httpsCallable, getFunctions } = require('firebase/functions');
const { initializeApp } = require('firebase/app');

// Firebase config (simplified)
const firebaseConfig = {
  projectId: 'b8shield-reseller-app'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

async function testMinimalPasswordReset() {
  console.log('🧪 Testing minimal password reset function...');
  
  try {
    const testFunction = httpsCallable(functions, 'testPasswordResetMinimal');
    
    const result = await testFunction({
      email: 'micke.ohlen@gmail.com'
    });
    
    console.log('✅ SUCCESS:', result.data);
    
  } catch (error) {
    console.error('❌ ERROR:', error.code, error.message);
    console.error('Full error:', error);
  }
}

testMinimalPasswordReset();
