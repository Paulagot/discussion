// server.js
// server.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from "dotenv";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set default NODE_ENV if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// ✅ Load the correct environment file BEFORE anything else
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";

// Check if env file exists before loading
if (fs.existsSync(path.join(__dirname, envFile))) {
  const result = dotenv.config({ path: envFile });
  if (result.error) {
    console.error(`❌ Error loading ${envFile}: ${result.error.message}`);
  } else {
    console.log(`✅ Successfully loaded environment from: ${envFile}`);
  }
} else {
  console.error(`❌ Environment file not found: ${path.join(__dirname, envFile)}`);
  console.log("Please create this file with your environment variables");
}

// Import remaining dependencies
import helmet from 'helmet';
import compression from "compression";
import express from 'express';
import cors from "cors";
import https from 'node:https';
import session from 'express-session';

// Import your routes
import meetupQARouter from "./routes/meetup_qa_router.js";
import sessionRouter from './routes/session_router.js';
import registerRouter from './routes/register_router.js';

// For testing DB connection - wrap in try/catch to handle potential import errors
let pool;
try {
  pool = (await import("./routes/config_db.js")).default;
} catch (error) {
  console.error("❌ Error importing database config:", error.message);
  pool = null;
}

// Environment configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || (isDevelopment ? 3000 : 3000);
const apiBaseUrl = process.env.API_BASE_URL || (isDevelopment ? 'http://localhost:3000' : 'http://localhost:3000');
const appUrl = process.env.APP_URL || (isDevelopment ? 'http://localhost:5000' : 'http://localhost:3000');

// Log environment variables for debugging
console.log('🔍 Database Environment Variables:');
console.log('Database Host:', process.env.DATABASE_HOST || "Not set");
console.log('Database User:', process.env.DATABASE_USER || "Not set");
console.log('Database Password:', process.env.DATABASE_PASSWORD ? 'SET' : 'MISSING');
console.log('Database Name:', process.env.DATABASE_NAME || "Not set");
console.log('NODE_ENV:', process.env.NODE_ENV);

console.log(`Detailed Port Configuration:
  -------------------------
  PORT env variable: ${process.env.PORT || "Not set"}
  NODE_ENV: ${process.env.NODE_ENV}
  isDevelopment: ${isDevelopment}
  Selected port: ${port}
  -------------------------`);

// Create Express app
const app = express();

// CORS Configuration
const productionOrigins = [
  'https://ablockofcrypto.com',
  'https://app.ablockofcrypto.com',
  'xpmodule.c188ccsye2s8.us-east-1.rds.amazonaws.com',
  'http://localhost:3000',
  'http://abc-loadbalancer-1196555837.us-east-1.elb.amazonaws.com/',
  'http://ec2-54-91-235-19.compute-1.amazonaws.com',
  'http://ABC-loadbalancer-819050676.us-east-1.elb.amazonaws.com/' ,
  'https://localhost:3000'
];

const developmentOrigins = [
  'http://localhost:5000',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000'
];

const allowedOrigins = isDevelopment 
  ? [...developmentOrigins, ...productionOrigins]
  : productionOrigins;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Initialize session - without database for now
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-fallback',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax'
  }
}));

// Middleware to enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  console.log('Production mode: Enabling HTTPS enforcement');
  app.use((req, res, next) => {
    if (process.env.LOCAL_PRODUCTION === 'true' || 
        req.headers['user-agent']?.includes('ELB-HealthChecker')) {
      return next();
    }
    
    // Allow HTTP for certain paths
    const allowedPaths = ['/health', '/session/check-session', '/session/login', '/session/logout'];

    if (allowedPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Redirect to HTTPS if not already
    if (req.headers['x-forwarded-proto'] !== 'https' && req.hostname !== 'localhost') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// UPDATED: Look for dist in client directory
const distPath = path.join(__dirname, '..', 'client', 'dist');
console.log(`Looking for dist directory at: ${distPath}`);

// Check if dist directory exists
try {
  if (fs.existsSync(distPath)) {
    console.log(`✅ Dist directory exists at ${distPath}`);
    console.log('Contents:', fs.readdirSync(distPath));
  } else {
    console.log(`❌ Dist directory does not exist at ${distPath}`);
  }
} catch (err) {
  console.error('Error checking dist directory:', err);
}

// UPDATED: Only serve static files in production
if (process.env.NODE_ENV === 'production') {
  console.log('Production mode: Serving static files from client/dist');
  app.use(express.static(distPath));
} else {
  console.log('Development mode: API server only - not serving static files');
}

// Health check endpoint
app.get('/health', (req, res) => {
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    environment: process.env.NODE_ENV
  };
  
  if (pool) {
    try {
      pool.query('SELECT 1', (err, results) => {
        if (err) {
          healthInfo.database = {
            status: 'ERROR',
            message: err.message
          };
          return res.status(500).json(healthInfo);
        }
        
        healthInfo.database = {
          status: 'OK'
        };
        return res.status(200).json(healthInfo);
      });
    } catch (error) {
      healthInfo.database = {
        status: 'ERROR',
        message: error.message
      };
      return res.status(500).json(healthInfo);
    }
  } else {
    healthInfo.database = {
      status: 'NOT_CONFIGURED'
    };
    return res.status(200).json(healthInfo);
  }
});

// Add middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use imported meetup routes
app.use('/meetup_qa', meetupQARouter);
app.use('/session', sessionRouter);
app.use('/register', registerRouter);

// Test database connection endpoint
app.get('/test-db', (req, res) => {
  if (!pool) {
    return res.status(500).send('Database connection not configured');
  }

  console.log('Attempting database query...');
  pool.query('SELECT 1', (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send(`Database query failed: ${err.message}`);
      return;
    }
    console.log('Database query successful:', results);
    res.send('Database connection is working!');
  });
});

// UPDATED: Catch-all route for SPA - only in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    
    try {
      console.log(`Attempting to serve index file from: ${indexPath}`);
      if (fs.existsSync(indexPath)) {
        console.log('✅ Index file found, serving it now');
        return res.sendFile(indexPath);
      }
      console.warn(`❌ [WARNING] Index file not found at: ${indexPath}`);
      return res.status(404).send('Application files not found. Check deployment package.');
    } catch (err) {
      console.error('[ERROR] Error serving index file:', err);
      return res.status(500).send('Server error while trying to serve application files.');
    }
  });
} else {
  // In development, let API 404 for non-API routes
  app.get('*', (req, res) => {
    res.status(404).json({
      error: 'API route not found',
      message: 'In development mode, frontend routes are handled by the Vite dev server'
    });
  });
}

// Start server with or without HTTPS
const useHttps = process.env.USE_HTTPS === 'true';

if (useHttps) {
  try {
    const options = {
      key: fs.readFileSync('./certs/key.pem'),
      cert: fs.readFileSync('./certs/cert.pem'),
    };
    https.createServer(options, app).listen(port, '0.0.0.0', () => {
      console.log('\nServer Startup Complete:');
      console.log(`Server is running at http://localhost:${port}`);
      console.log(`Health check endpoint: http://localhost:${port}/health`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start HTTPS server:', error.message);
    console.log('Falling back to HTTP server...');
    startHttpServer();
  }
} else {
  startHttpServer();
}

function startHttpServer() {
  app.listen(port, 'localhost', () => { 
    console.log('\nServer Startup Complete:');
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`Health check endpoint: http://localhost:${port}/health`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
}