#!/usr/bin/env node

/**
 * Sync configuration from backend/.env to frontend
 * This script reads the backend .env file and generates frontend config
 */

const fs = require('fs');
const path = require('path');

// Read backend .env file
const backendEnvPath = path.join(__dirname, '../../../../backend/.env');
const frontendEnvPath = path.join(__dirname, '../../.env.local');

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

function generateFrontendEnv(backendEnv) {
  return `# Development Environment Variables for Frontend
# ⚠️  AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
# Run 'npm run sync-config' to regenerate from backend/.env

# API Configuration
VITE_API_BASE_URL=http://localhost:${backendEnv.PORT || '3001'}/api

# Supabase Configuration (from backend/.env)
VITE_SUPABASE_URL=${backendEnv.SUPABASE_URL || ''}
VITE_SUPABASE_ANON_KEY=${backendEnv.SUPABASE_ANON_KEY || ''}

# Google OAuth Configuration (from backend/.env)
VITE_GOOGLE_CLIENT_ID=${backendEnv.GOOGLE_CLIENT_ID || ''}

# Environment
VITE_NODE_ENV=${backendEnv.NODE_ENV || 'development'}
VITE_PORT=${backendEnv.PORT || '3001'}

# CORS Origin
VITE_CORS_ORIGIN=${backendEnv.CORS_ORIGIN || 'http://localhost:3000'}`;
}

try {
  // Check if backend .env exists
  if (!fs.existsSync(backendEnvPath)) {
    console.error('❌ Backend .env file not found at:', backendEnvPath);
    process.exit(1);
  }

  // Parse backend .env
  const backendEnv = parseEnvFile(backendEnvPath);
  console.log('✅ Parsed backend .env file');

  // Generate frontend .env.local
  const frontendEnv = generateFrontendEnv(backendEnv);

  // Write to frontend .env.local file
  fs.writeFileSync(frontendEnvPath, frontendEnv, 'utf8');
  console.log('✅ Generated frontend .env.local at:', frontendEnvPath);
  
  console.log('\n🎉 Configuration sync completed successfully!');
  console.log('📁 Frontend can now use the latest backend configuration.');
  
} catch (error) {
  console.error('❌ Error syncing configuration:', error.message);
  process.exit(1);
}