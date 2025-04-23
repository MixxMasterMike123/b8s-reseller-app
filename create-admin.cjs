const admin = require('firebase-admin');
admin.initializeApp({
  projectId: 'b8shield-reseller-app'
});
const db = admin.firestore();

// Create user data in default database
const userData = {
  email: 'micke.ohlen@gmail.com',
  companyName: 'B8shield Admin',
  contactPerson: 'Admin User',
  phoneNumber: '+1234567890',
  address: 'Admin Address',
  role: 'admin',
  active: true,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

db.collection('users').doc('9AudFilG8VeYHcFnKgUtQkByAmn1').set(userData)
  .then(() => console.log('User created successfully'))
  .catch(err => console.error('Error creating user:', err)); 