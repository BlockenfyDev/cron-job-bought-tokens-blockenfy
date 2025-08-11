import cron from 'node-cron';
import { newPollAndStoreMpTokensBoughtEvents } from '../cron/polling-mp-tokens-bought/new-polling-mp-tokens-bought-test';

// Variable para asegurar que solo una instancia del job corra a la vez
let isJobRunning = false;

export const startCronJobs = () => {
    console.log( 'Initializing cron jobs...' );

    // Se ejecuta cada 5 segundos
    cron.schedule( '*/7 * * * * *', async () => {
        if ( isJobRunning ) {
            // Este log es útil, pero puede ser ruidoso. Puedes comentarlo si lo deseas.
            // console.log( '🕒 Previous poll is still running. Skipping this cycle.' );
            return;
        }

        isJobRunning = true;
        console.log( `🕒 Running scheduled task: Poll Blockchain Events` );

        try {
            await newPollAndStoreMpTokensBoughtEvents();
        } catch ( error ) {
            console.error( "🔥🔥🔥 Unhandled exception in cron job scheduler. The server will not crash.", error );
        } finally {
            isJobRunning = false;
        // console.log( "✅ Cron job cycle finished." ); // También se puede comentar para reducir ruido.
        }
    } );

    console.log( '✅ Cron jobs initialized: Event poller is scheduled to run every 5 seconds.' );
};