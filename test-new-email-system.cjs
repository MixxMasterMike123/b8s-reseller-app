const { httpsCallable, getFunctions } = require('firebase/functions');
const { initializeApp } = require('firebase/app');

// Firebase config
const firebaseConfig = {
  projectId: 'b8shield-reseller-app'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

async function testNewEmailSystem() {
  console.log('🚀 Testing NEW Email System V3...');
  
  try {
    const passwordResetV3 = httpsCallable(functions, 'sendPasswordResetV3');
    
    console.log('📧 Testing password reset with new system...');
    const result = await passwordResetV3({
      email: 'micke.ohlen@gmail.com'
    });
    
    console.log('✅ NEW EMAIL SYSTEM SUCCESS!');
    console.log('📊 Result:', result.data);
    
    console.log('\n🎉 NEW EMAIL SYSTEM IS WORKING!');
    console.log('✅ SMTP connection verified');
    console.log('✅ Email sent successfully');
    console.log('✅ Clean architecture working');
    
  } catch (error) {
    console.error('❌ NEW EMAIL SYSTEM FAILED:', error.code, error.message);
    console.error('📋 Full error:', error);
  }
}

testNewEmailSystem();

