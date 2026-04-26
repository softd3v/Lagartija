/**
 * Install Xentinel as a Windows Service
 * 
 * Run with administrator privileges:
 * node service/install-service.js
 */

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'Xentinel API Monitor',
  description: 'Monitors RESTful APIs and sends email alerts on failures',
  script: path.join(__dirname, 'monitor-service.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    }
  ]
});

// Listen for the "install" event
svc.on('install', function() {
  console.log('✅ Service installed successfully!');
  console.log('   Service Name: Xentinel API Monitor');
  console.log('   Starting service...');
  svc.start();
});

svc.on('start', function() {
  console.log('✅ Service started successfully!');
  console.log('\nService Details:');
  console.log('   Name:', svc.name);
  console.log('   Status: Running');
  console.log('   Startup Type: Automatic');
  console.log('\nYou can manage this service using:');
  console.log('   - Services.msc (Windows Services Manager)');
  console.log('   - sc query "Xentinel API Monitor"');
  console.log('   - sc stop "Xentinel API Monitor"');
  console.log('   - sc start "Xentinel API Monitor"');
  console.log('\nLogs are saved to: service/logs/');
  console.log('\nTo uninstall, run: node service/uninstall-service.js');
});

svc.on('alreadyinstalled', function() {
  console.log('⚠️  Service is already installed.');
  console.log('   To reinstall, first run: node service/uninstall-service.js');
});

svc.on('error', function(err) {
  console.error('❌ Error installing service:', err);
  console.error('\nTroubleshooting:');
  console.error('   1. Make sure you are running as Administrator');
  console.error('   2. Check if the service already exists');
  console.error('   3. Verify node-windows is installed: npm install node-windows');
});

// Install the service
console.log('Installing Xentinel API Monitor as Windows Service...');
console.log('Please wait...\n');
svc.install();
