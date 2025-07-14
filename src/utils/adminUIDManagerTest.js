/**
 * AdminUID Manager Test Functions - Phase 2
 * 
 * 🛡️ SAFETY: These are standalone test functions that don't affect existing functionality
 * Can be imported and called from console or admin interface for testing
 */

import { 
  populateAdminUIDs, 
  getAllAdminUIDs, 
  checkAdminUIDSync,
  isAdminUID,
  CURRENT_ADMIN_UIDS
} from './adminUIDManager';

/**
 * Test the adminUID system (read-only operations first)
 * 🛡️ SAFE: Only reads data, no modifications
 */
export const testAdminUIDRead = async () => {
  console.log('🧪 Testing AdminUID system (read-only)...');
  
  try {
    // Test 1: Check if collection exists and get current UIDs
    console.log('\n📋 Test 1: Getting all admin UIDs...');
    const allUIDs = await getAllAdminUIDs();
    console.log(`Found ${allUIDs.length} admin UIDs in collection:`, allUIDs);
    
    // Test 2: Check specific hardcoded UIDs
    console.log('\n🔍 Test 2: Checking hardcoded UIDs...');
    for (const admin of CURRENT_ADMIN_UIDS) {
      const exists = await isAdminUID(admin.uid);
      console.log(`${admin.uid} (${admin.email}): ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    }
    
    // Test 3: Sync status
    console.log('\n📊 Test 3: Checking sync status...');
    const syncStatus = await checkAdminUIDSync();
    console.log('Sync status:', syncStatus);
    
    return {
      success: true,
      tests: {
        collectionAccess: true,
        uidCount: allUIDs.length,
        syncStatus: syncStatus.inSync
      }
    };
    
  } catch (error) {
    console.error('❌ AdminUID read test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Test the adminUID population (writes to database)
 * 🛡️ SAFE: Only creates parallel collection, doesn't modify existing systems
 */
export const testAdminUIDPopulate = async () => {
  console.log('🧪 Testing AdminUID population...');
  
  try {
    console.log('\n📝 Populating adminUIDs collection...');
    const populateResult = await populateAdminUIDs();
    console.log('Population result:', populateResult);
    
    // Verify population worked
    console.log('\n✅ Verifying population...');
    const syncStatus = await checkAdminUIDSync();
    console.log('Post-population sync status:', syncStatus);
    
    return {
      success: true,
      populateResult,
      syncStatus
    };
    
  } catch (error) {
    console.error('❌ AdminUID populate test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Complete adminUID test suite
 * 🛡️ SAFE: Comprehensive testing without affecting existing functionality
 */
export const runAdminUIDTests = async () => {
  console.log('🚀 Running complete AdminUID test suite...');
  console.log('🛡️ SAFETY: These tests only affect the parallel adminUIDs collection');
  
  const results = {
    readTest: null,
    populateTest: null,
    finalVerification: null
  };
  
  try {
    // Phase 1: Read tests
    console.log('\n=== PHASE 1: READ TESTS ===');
    results.readTest = await testAdminUIDRead();
    
    // Phase 2: Population tests (only if read tests pass)
    if (results.readTest.success) {
      console.log('\n=== PHASE 2: POPULATION TESTS ===');
      results.populateTest = await testAdminUIDPopulate();
    } else {
      console.log('⚠️ Skipping population tests due to read test failure');
    }
    
    // Phase 3: Final verification
    if (results.populateTest?.success) {
      console.log('\n=== PHASE 3: FINAL VERIFICATION ===');
      results.finalVerification = await checkAdminUIDSync();
    }
    
    // Summary
    console.log('\n📋 TEST SUMMARY:');
    console.log('Read tests:', results.readTest?.success ? '✅ PASS' : '❌ FAIL');
    console.log('Population tests:', results.populateTest?.success ? '✅ PASS' : '❌ FAIL');
    console.log('Final sync:', results.finalVerification?.inSync ? '✅ IN SYNC' : '❌ OUT OF SYNC');
    
    return results;
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return {
      ...results,
      error: error.message
    };
  }
};

/**
 * Simple status check for admin interface
 * 🛡️ SAFE: Read-only status information
 */
export const getAdminUIDStatus = async () => {
  try {
    const allUIDs = await getAllAdminUIDs();
    const syncStatus = await checkAdminUIDSync();
    
    return {
      collectionExists: true,
      adminUIDCount: allUIDs.length,
      expectedCount: CURRENT_ADMIN_UIDS.length,
      inSync: syncStatus.inSync,
      needsPopulation: allUIDs.length === 0,
      status: allUIDs.length === 0 ? 'needs_setup' : 'operational'
    };
  } catch (error) {
    return {
      collectionExists: false,
      error: error.message,
      status: 'error'
    };
  }
};

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.adminUIDTests = {
    testRead: testAdminUIDRead,
    testPopulate: testAdminUIDPopulate,
    runAll: runAdminUIDTests,
    getStatus: getAdminUIDStatus
  };
  console.log('🧪 AdminUID tests available in console: window.adminUIDTests');
} 