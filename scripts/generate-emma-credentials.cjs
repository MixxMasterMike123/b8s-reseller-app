const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin (uses default credentials)
admin.initializeApp();

// Initialize Firestore for the CORRECT named database
const db = getFirestore('b8s-reseller-db');
db.settings({ ignoreUndefinedProperties: true });

const auth = getAuth();

const EMMA_DATA = {
  name: 'Emma Mattsdal',
  email: 'e.mattsdal@gmail.com',
  code: 'EMMA-768',
  id: '7S4ApdJeu2M12gZVUbrF9geNCzc2'
};

async function generateEmmaCredentials() {
  console.log('🔐 Generating credentials for Emma Mattsdal...');
  
  try {
    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    
    console.log(`\n📋 Affiliate: ${EMMA_DATA.name}`);
    console.log(`📧 Email: ${EMMA_DATA.email}`);
    console.log(`🔑 Affiliate Code: ${EMMA_DATA.code}`);
    console.log(`🆔 ID: ${EMMA_DATA.id}`);
    
    // Check if Firebase Auth user already exists
    let authUser;
    let wasExistingAuthUser = false;
    
    try {
      authUser = await auth.getUserByEmail(EMMA_DATA.email);
      wasExistingAuthUser = true;
      console.log(`\n✅ Firebase Auth user already exists for ${EMMA_DATA.email}`);
      
      // Update existing user's password
      await auth.updateUser(authUser.uid, {
        password: tempPassword
      });
      console.log(`🔄 Updated existing user's password`);
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new Firebase Auth user
        authUser = await auth.createUser({
          email: EMMA_DATA.email,
          password: tempPassword,
          emailVerified: true,
          displayName: EMMA_DATA.name
        });
        console.log(`\n✅ Created new Firebase Auth user for ${EMMA_DATA.email}`);
      } else {
        throw error;
      }
    }
    
    // Update affiliate document with temporary password info
    const affiliateRef = db.collection('affiliates').doc(EMMA_DATA.id);
    await affiliateRef.update({
      temporaryPassword: tempPassword,
      credentialsSent: true,
      credentialsSentAt: new Date(),
      requiresPasswordChange: true,
      firebaseAuthUid: authUser.uid,
      updatedAt: new Date()
    });
    
    console.log(`\n✅ Updated affiliate document with credential info`);
    
    // Display credentials for manual sending
    console.log('\n🎯 CREDENTIALS TO SEND TO EMMA:');
    console.log('═'.repeat(50));
    console.log(`📧 Email: ${EMMA_DATA.email}`);
    console.log(`🔑 Temporary Password: ${tempPassword}`);
    console.log(`🔗 Affiliate Portal: https://shop.b8shield.com/se/affiliate-portal`);
    console.log(`🔗 Affiliate Link: https://shop.b8shield.com/se/?ref=${EMMA_DATA.code}`);
    console.log('═'.repeat(50));
    
    console.log('\n📝 EMAIL TEMPLATE FOR EMMA:');
    console.log('-'.repeat(50));
    console.log(`Subject: Välkommen till B8Shield Affiliate Program - BETA Testing`);
    console.log(`
Hej Emma!

Välkommen till B8Shield Affiliate Program för BETA-testning!

Dina inloggningsuppgifter:
• E-post: ${EMMA_DATA.email}
• Tillfälligt lösenord: ${tempPassword}
• Affiliate Portal: https://shop.b8shield.com/se/affiliate-portal

Din unika affiliate-länk:
https://shop.b8shield.com/se/?ref=${EMMA_DATA.code}

Som BETA-testare får du:
- Tidig access till alla affiliate-funktioner
- Möjlighet att påverka utvecklingen
- 20% provision på alla försäljningar
- 10% rabatt för dina kunder

Vänligen byt ditt lösenord vid första inloggningen.

Vi ser fram emot din feedback!

Med vänliga hälsningar,
B8Shield Team
`);
    console.log('-'.repeat(50));
    
    console.log('\n✅ Credentials generated and stored in database!');
    console.log('📧 You can now copy the email template above and send it manually to Emma.');
    
  } catch (error) {
    console.error('❌ Error generating credentials:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

generateEmmaCredentials(); 