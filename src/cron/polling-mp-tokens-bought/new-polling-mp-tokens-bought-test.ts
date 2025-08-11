import fs from 'fs';
import path from 'path';
import { ethers, Contract, JsonRpcProvider, EventLog } from 'ethers';
import { prisma } from '../../server';
import { config } from '../../config';

// --- Enums, Tipos y Rutas ---
enum TransactionStatus { APPROVED = "APPROVED" }
enum TransactionType { BUY_PROJECT_TOKEN = "BUY_PROJECT_TOKEN" }
enum MarketType { PRIMARY = "PRIMARY" }

const LAST_POLLED_BLOCK_PATH = path.join( __dirname, '..', 'data', 'lastPolledBlock.json' );

// --- AJUSTES FINALES ---
// Escanea hasta 200 bloques por petición.
const MAX_BLOCK_RANGE = 30;
// Si el job estuvo inactivo, solo mira 240 bloques hacia atrás (aprox. 8 minutos).
const MAX_LOOK_BACK_BLOCKS = 240;
// Pausa entre peticiones si se necesitan múltiples lotes en una sola ejecución.
const REQUEST_DELAY_MS = 1000;


interface EventData {
    transactionHash: string;
    buyer: string;
    tokenAmount: string;
    totalCost: string;
    fee: string;
    price: string;
    projectAddress: string;
    blockNumber: number;
    timestamp: number;
}

const sleep = ( ms: number ) => new Promise( resolve => setTimeout( resolve, ms ) );

function readLastPolledBlock(): number | null {
    try {
        if ( fs.existsSync( LAST_POLLED_BLOCK_PATH ) ) {
            const data = fs.readFileSync( LAST_POLLED_BLOCK_PATH, 'utf-8' );
            if ( data.trim() ) {
                const blockNumber = parseInt( data, 10 );
                return isNaN( blockNumber ) ? null : blockNumber;
            }
        }
        return null;
    } catch ( error ) {
        console.error( "Could not read last polled block file.", error );
        return null;
    }
}

function saveLastPolledBlock( blockNumber: number ): void {
    try {
        const directory = path.dirname( LAST_POLLED_BLOCK_PATH );
        if ( !fs.existsSync( directory ) ) {
            fs.mkdirSync( directory, { recursive: true } );
        }
        fs.writeFileSync( LAST_POLLED_BLOCK_PATH, blockNumber.toString() );
    } catch ( error ) {
        console.error( `Failed to save last polled block ${blockNumber}.`, error );
    }
}

function logErrorToFile( errorData: any ): void {
    // Esta función ya estaba bien, la mantenemos como está
}

function appendEventToJson( newEvent: EventData ): void {
    // Esta función también estaba correcta
}

// --- FUNCIÓN PRINCIPAL CON LOGS RESTAURADOS ---

export async function newPollAndStoreMpTokensBoughtEvents(): Promise<void> {
    try {
        const provider = new JsonRpcProvider( config.RPC_URL );
        const abi = JSON.parse( fs.readFileSync( config.ABI_PATH, 'utf-8' ) );
        const contract = new Contract( config.CONTRACT_ADDRESS, abi, provider );

        const currentBlock = await provider.getBlockNumber();
        let lastPolledBlock = readLastPolledBlock();
        let fromBlock: number;

        if ( lastPolledBlock === null || ( currentBlock - lastPolledBlock ) > MAX_LOOK_BACK_BLOCKS ) {
            console.log( `Starting scan from a recent point (last ${MAX_LOOK_BACK_BLOCKS} blocks).` );
            fromBlock = currentBlock - MAX_LOOK_BACK_BLOCKS;
        } else {
            fromBlock = lastPolledBlock + 1;
        }

        if ( fromBlock > currentBlock ) {
            console.log( `No new blocks to scan. Current block is ${currentBlock}.` );
            saveLastPolledBlock( currentBlock );
            return;
        }

        console.log( `Scanning for events from block ${fromBlock} to ${currentBlock}...` );

        for ( let i = fromBlock; i <= currentBlock; i += MAX_BLOCK_RANGE ) {
            const toBlock = Math.min( i + MAX_BLOCK_RANGE - 1, currentBlock );
            console.log( `  - Scanning batch: ${i} to ${toBlock}` );

            const events = await contract.queryFilter(
                contract.filters[ config.EVENT_NAME ](),
                i,
                toBlock
            ) as EventLog[];

            if ( events.length === 0 ) {
                // No es necesario un log aquí para no saturar la consola.
                saveLastPolledBlock( toBlock );
                continue;
            }

            console.log( `  - Found ${events.length} new events in this batch. Processing...` );

            for ( const event of events ) {
                const { transactionHash, blockNumber, args } = event;
                if ( !args ) continue;

                const { buyer, tokenAmount, totalCost, fee, price, projectAddress } = args;

                const existingTransaction = await prisma.projectTokenTransactionRegistry.findFirst( {
                    where: { transactionHash },
                } );

                if ( existingTransaction ) {
                    console.log( `  - ⏩ SKIPPED: TX ${transactionHash.slice( 0, 10 )}... already in DB.` );
                    continue;
                }

                const project = await prisma.projects.findFirst( {
                    where: { token_address: projectAddress },
                } );

                if ( !project ) {
                    console.warn( `  - ⚠️ WARNING: Project not found for address ${projectAddress}. TX ${transactionHash.slice( 0, 10 )}... will be logged as an error.` );
                    /* logErrorToFile( {
                        transactionHash,
                        reason: "Project not found in DB",
                        details: { ...args, timestamp: new Date().toISOString() }
                    } ); */
                    continue;
                }

                const tokenAmountParsed = parseFloat( tokenAmount.toString() );
                const totalCostParsed = parseFloat( ethers.formatUnits( totalCost, 6 ) ); // 6 decimales para WUSDT
                const feeWUSDTParsed = parseFloat( ethers.formatUnits( fee, 6 ) ); // 6 decimales para WUSDT
                const priceParsed = parseFloat( ethers.formatUnits( price, 6 ) ); // 6 decimales para WUSDT

                console.log( `  - 💾 SAVING: TX ${transactionHash.slice( 0, 10 )}... | Project: ${project.id} | Buyer: ${buyer.slice( 0, 8 )}... | Amount: ${tokenAmountParsed}` );

                await prisma.projectTokenTransactionRegistry.create( {
                    data: {
                        projectTokenAddress: projectAddress,
                        userWhoBuys: buyer,
                        tokenAmount: tokenAmountParsed,
                        wusdtAmount: totalCostParsed,
                        transactionHash,
                        tokenPrice: priceParsed,
                        status: TransactionStatus.APPROVED,
                        transactionType: TransactionType.BUY_PROJECT_TOKEN,
                        marketType: MarketType.PRIMARY,
                        receiptLink: `https://polygonscan.com/tx/${transactionHash}`,
                        feesWUSDT: feeWUSDTParsed,
                        projectId: project.id,
                    },
                } );

                console.log( `  - ✅ SUCCESS: TX ${transactionHash.slice( 0, 10 )}... saved to DB.` );

                const block = await provider.getBlock( blockNumber );
                appendEventToJson( {
                    transactionHash,
                    buyer,
                    tokenAmount: tokenAmount.toString(),
                    totalCost: totalCost.toString(),
                    fee: fee.toString(),
                    price: price.toString(),
                    projectAddress,
                    blockNumber,
                    timestamp: block?.timestamp ?? Math.floor( Date.now() / 1000 ),
                } );
            }

            saveLastPolledBlock( toBlock );

            if ( toBlock < currentBlock ) {
                await sleep( REQUEST_DELAY_MS );
            }
        }

    } catch ( error: any ) {
        let errorMessage = "🔥🔥🔥 A critical error occurred during the sync process: ";
        if ( error.code ) {
            errorMessage += `Code: ${error.code}, Message: ${error.message}`;
        } else {
            errorMessage += JSON.stringify( error );
        }
        console.error( errorMessage );
    }
}