import { prisma } from '../../server';
import fs from 'fs';
import path from 'path';
import { config } from '../../config';

enum TransactionStatus {
    APPROVED = "APPROVED",
    PENDING = "PENDING",
    REJECTED = "REJECTED",
}

enum TransactionType {
    BUY_PROJECT_TOKEN = "BUY_PROJECT_TOKEN",
    SELL_PROJECT_TOKEN = "SELL_PROJECT_TOKEN",
}

enum MarketType {
    PRIMARY = "PRIMARY",
    SECONDARY = "SECONDARY",
}

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

interface RegisterTransactionParams {
    projectTokenAddress: string;
    userWallet: string;
    tokenAmount: string;
    transactionHash: string;
    tokenPrice: string;
    feesWUSDT: number;
}

export const getEventsFromLocalJson = ( storagePath: string ): EventData[] => {
    try {
        if ( !fs.existsSync( storagePath ) ) {
            return [];
        }
        const fileContent = fs.readFileSync( storagePath, 'utf-8' );
        return JSON.parse( fileContent ) as EventData[];
    } catch ( error ) {
        console.error( "Error reading or parsing local JSON file:", error );
        return [];
    }
};

export const findNonRegisteredHashes = async ( arrayOfTxHashes: string[] ): Promise<string[]> => {
    try {
        if ( !arrayOfTxHashes || arrayOfTxHashes.length === 0 ) {
            return [];
        }

        const registeredTransactions = await prisma.projectTokenTransactionRegistry.findMany( {
            where: {
                transactionHash: {
                    in: arrayOfTxHashes,
                },
            },
            select: {
                transactionHash: true,
            }
        } );

        const registeredHashes = new Set( registeredTransactions.map( ( tx: { transactionHash: any; } ) => tx.transactionHash ) );
        return arrayOfTxHashes.filter( hash => !registeredHashes.has( hash ) );
    } catch ( error ) {
        console.error( "Error finding non-registered transactions:", error );
        throw new Error( `Failed to check hashes in DB: ${error}` );
    }
};

export const registerBuyMpTransactionInDb = async ( params: RegisterTransactionParams ) => {
    try {
        const {
            projectTokenAddress,
            userWallet,
            tokenAmount,
            transactionHash,
            tokenPrice,
            feesWUSDT
        } = params;

        const numericTokenAmount = parseFloat( tokenAmount );
        const numericWusdtAmount = parseFloat( tokenAmount ) * parseFloat( tokenPrice );
        const numericTokenPrice = parseFloat( tokenPrice );

        if ( isNaN( numericTokenAmount ) || isNaN( numericWusdtAmount ) || isNaN( numericTokenPrice ) ) {
            throw new Error( "Invalid number format for tokenAmount, wusdtAmount, or tokenPrice." );
        }

        const existingTransaction = await prisma.projectTokenTransactionRegistry.findFirst( {
            where: { transactionHash },
        } );

        if ( existingTransaction ) {
            return null;
        }

        const project = await prisma.projects.findFirst( {
            where: { token_address: projectTokenAddress },
        } );

        if ( !project ) {
            const errorData = { ...params, timestamp: new Date().toISOString() };
            const errorFilePath = config.ERRORS_PATH;
            let existingErrors = [];

            try {
                if ( fs.existsSync( errorFilePath ) ) {
                    existingErrors = JSON.parse( fs.readFileSync( errorFilePath, 'utf-8' ) );
                }
            } catch ( e ) {
                console.error( "Error reading registryErrors.json, starting with a new array.", e );
            }

            existingErrors.push( errorData );
            fs.writeFileSync( errorFilePath, JSON.stringify( existingErrors, null, 2 ) );
            console.log( `Project with address ${projectTokenAddress} not found. Error logged.` );
            return null;
        }

        const newTransaction = await prisma.projectTokenTransactionRegistry.create( {
            data: {
                projectTokenAddress,
                userWhoBuys: userWallet,
                tokenAmount: numericTokenAmount,
                wusdtAmount: numericWusdtAmount,
                transactionHash,
                tokenPrice: numericTokenPrice,
                status: TransactionStatus.APPROVED,
                transactionType: TransactionType.BUY_PROJECT_TOKEN,
                marketType: MarketType.PRIMARY,
                receiptLink: `https://polygonscan.com/tx/${transactionHash}`,
                feesWUSDT,
                projectId: project.id,
                userWhoSells: null,
                transactionHashOrder: null,
                purchasePrice: null,
                salePrice: null,
                orderBookTransactionSharedId: null,
            },
        } );

        console.log( `Successfully registered transaction: ${newTransaction.transactionHash}` );
        return newTransaction;

    } catch ( error ) {
        console.error( `Error registering transaction ${params.transactionHash}:`, error );
        throw error;
    }
};

export const syncLocalEventsToDb = async () => {
    try {
        console.log( "Starting DB sync process..." );
        const localEvents = getEventsFromLocalJson( config.STORAGE_PATH );
        if ( localEvents.length === 0 ) {
            console.log( "No local events to sync." );
            return;
        }

        const localHashes = localEvents.map( event => event.transactionHash );
        const hashesToRegister = await findNonRegisteredHashes( localHashes );

        if ( hashesToRegister.length === 0 ) {
            console.log( "Database is already up to date." );
            return;
        }

        console.log( `Found ${hashesToRegister.length} new transactions to register in DB.` );
        const eventsMap = new Map( localEvents.map( event => [ event.transactionHash, event ] ) );

        for ( const hash of hashesToRegister ) {
            const eventData = eventsMap.get( hash );
            if ( eventData ) {
                await registerBuyMpTransactionInDb( {
                    projectTokenAddress: eventData.projectAddress,
                    userWallet: eventData.buyer,
                    tokenAmount: eventData.tokenAmount,
                    transactionHash: eventData.transactionHash,
                    tokenPrice: eventData.price,
                    feesWUSDT: parseFloat( eventData.fee )
                } );
            }
        }
        console.log( "DB sync process finished." );

    } catch ( error ) {
        console.error( "Error syncing local events to DB:", error );
    }
};