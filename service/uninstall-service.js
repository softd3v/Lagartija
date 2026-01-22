/**
 * Uninstall Xentinel Windows Service
 * 
 * Run with administrator privileges:
 * node service/uninstall-service.js
 */

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object (same config as installer)
const svc = new Service({
  name: 'Xentinel API Monitor',
  script: path.join(__dirname, 'monitor-service.js')
});

// Listen for the "uninstall" event
svc.on('uninstall', function() {
  console.log('✅ Service uninstalled successfully!');
  console.log('   The Xentinel API Monitor service has been removed.');
  console.log('\nNote: Log files in service/logs/ are preserved.');
  console.log('To reinstall, run: node service/install-service.js');
});

svc.on('alreadyuninstalled', function() {
  console.log('ℹ️  Service is not installed.');
  console.log('   Nothing to uninstall.');
});

svc.on('error', function(err) {
  console.error('❌ Error uninstalling service:', err);
  console.error('\nTroubleshooting:');
  console.error('   1. Make sure you are running as Administrator');
  console.error('   2. Check if the service exists: sc query "Xentinel API Monitor"');
  console.error('   3. Try stopping the service first: sc stop "Xentinel API Monitor"');
});

// Uninstall the service
console.log('Uninstalling Xentinel API Monitor Windows Service...');
console.log('Please wait...\n');
svc.uninstall();
