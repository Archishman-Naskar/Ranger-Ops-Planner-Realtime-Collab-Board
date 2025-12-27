import { NextResponse } from "next/server";

export async function GET() {
    try {
        // 1. Create a successful response object
        const response = NextResponse.json(
            {
                message: "Logout successful",
                success: true,
            }
        );

        // 2. Clear the cookie by setting it to empty and expiring it instantly
        response.cookies.set("accessToken", "", {
            httpOnly: true, 
            expires: new Date(0) 
        });

        return response;
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}