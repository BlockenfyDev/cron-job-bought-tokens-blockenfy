import path from 'path';

export const config = {
    // Blockchain
    CONTRACT_ADDRESS: process.env.POLL_MP_TOKENS_BOUGHT_CONTRACT_ADDRESS as string,
    EVENT_NAME: "TokensBought",
    RPC_URL: process.env.RPC_URL as string,

    // Timing
    BLOCK_TIME_SECONDS: 2,
    DAY_IN_SECONDS: 86400,

    // Paths (resueltos de forma segura desde la raíz del proyecto)
    STORAGE_PATH: path.join( __dirname, 'data', 'events.json' ),
    ABI_PATH: path.join( __dirname, 'blockchain', 'abis', 'Exchange.json' ),
    ERRORS_PATH: path.join( __dirname, 'data', 'registryErrors.json' ),
};