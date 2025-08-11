import { PrismaClient } from "@prisma/client";
import morgan from "morgan";
import router from "./routes/server";
import cors from "cors";
import cookieParser from "cookie-parser";
import express, { Request, Response, NextFunction, Application } from "express";


// Valida las variables de entorno críticas al inicio del servidor, si no están presentes, no deberia continuar
const requiredEnvVars = [ 'DATABASE_URL', 'RPC_URL', "POLL_MP_TOKENS_BOUGHT_CONTRACT_ADDRESS", "DIRECT_URL" ];
for ( const envVar of requiredEnvVars ) {
  if ( !process.env[ envVar ] ) {
    throw new Error( `FATAL: Missing required environment variable: ${envVar}` );
  }
}

const app = express();

// instancio un singleton de prisma para que pueda ser usado en todas las rutas
export const prisma = new PrismaClient();

import { startCronJobs } from "./services/cronJobMpTokensBought-service";

export const variables = {
  CONTRACT_ADDRESS: "0x29afc9bcce5a78fC266f184f9BA8b39E66289c61",
  EVENT_NAME: "TokensBought",
  BLOCK_TIME_SECONDS: 2,
  DAY_IN_SECONDS: 86400,
  STORAGE_PATH: "@/data/events.json",
  ABI_PATH: "@/src/blockchain/abis/Exchange.json",
};

// Allows requests from localhost and production frontends
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
  "http://localhost:4000",
  "http://localhost:4001",
];

const CLIENT_DOMAIN = process.env.CLIENT_DOMAIN;
const NODE_ENV = process.env.NODE_ENV;

let corsEffectiveOrigin: string | string[]; // Type will be string[] or string

if ( NODE_ENV === "development" ) {
  corsEffectiveOrigin = allowedOrigins;
} else {
  // Non-development (production, staging, etc.)
  if ( !CLIENT_DOMAIN || CLIENT_DOMAIN.trim() === "" ) {
    // If CLIENT_DOMAIN is not set or empty in a non-development environment,
    // it's a critical configuration error. Stop the application.
    throw new Error(
      "FATAL: CLIENT_DOMAIN environment variable is not set or is empty for this non-development environment."
    );
  }
  corsEffectiveOrigin = CLIENT_DOMAIN;
}

app.use(
  cors( {
    origin: corsEffectiveOrigin as string | string[],
    methods: [ "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS" ],
    allowedHeaders: [
      "Content-Type",
      "Origin",
      "X-Requested-With",
      "Accept",
      "x-client-key",
      "x-client-token",
      "x-client-secret",
      "Authorization",
      "jwt",
      "Requested-Expiration-Time",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Headers",
      "Access-Control-Allow-Credentials",
      "Access-Control-Allow-Methods",
      "credentials",
    ],
    preflightContinue: false,
    optionsSuccessStatus: 200,
    // Use type assertion to bypass TypeScript error
    exposeHeaders: [ "jwt", "Access-Control-Allow-Origin" ],
    credentials: true,
  } as any ) // Type assertion here)
);

app.options( "*", cors() );
app.use( express.json() );
app.use( cookieParser() );

app.use( "/api/v1", router );

startCronJobs();

//aqui necesito llamar un cronjob, crea un cronjob en otro archivo e importalo aca 

// Use PORT provided in environment or default to 3000
app.use( express.static( "public" ) );
const port = process.env.PORT || 4000;


// Listen on `port` and 0.0.0.0 by default
app.listen( port as number, "0.0.0.0", () => {
  console.log( `Server is running on port ${port}` );
} );

app.get( "/", ( req, res ) => {
  return res.send( "Auth server is live" );
} );


