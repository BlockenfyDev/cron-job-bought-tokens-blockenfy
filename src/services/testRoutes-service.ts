import { Request, Response } from "express";


export async function testService( req: Request, res: Response ) {
    try {
        return res.status( 200 ).json( { success: true, message: "Server is live" } );
    } catch ( error ) {
        return res.status( 500 ).json( { success: false, message: "Auth server error" } );
    }
}