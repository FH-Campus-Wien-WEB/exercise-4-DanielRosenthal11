// Load .env file into process.env
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Load configuration from environment variables
module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  omdbApiKey: process.env.OMDB_API_KEY || '',
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
  omdbTimeoutMs: 5000 // 5 second timeout for external API calls
};
/*
// Load .env file automatically from current working directory
require('dotenv').config();

// Load configuration from environment variables (with direct fallbacks!)
module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  omdbApiKey: process.env.OMDB_API_KEY || '23266f2f',
  sessionSecret: process.env.SESSION_SECRET || 'MyTopSecretSessionFH',
  omdbTimeoutMs: 5000 // 5 second timeout for external API calls
};*/