import { config } from "dotenv";
import { resolve } from "path";
import { verifyToken } from "@clerk/backend";

// Load env vars
config({ path: resolve(process.cwd(), ".env.local") });

async function verify(token: string) {
    console.log(`\n🔍 Verifying Token...`);

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
        console.error("❌ CLERK_SECRET_KEY not found in .env.local");
        process.exit(1);
    }
    console.log("✅ Loaded CLERK_SECRET_KEY");

    try {
        const { data, errors } = await verifyToken(token, { secretKey });

        if (errors) {
            console.error("❌ Verification Failed with Errors:");
            console.error(JSON.stringify(errors, null, 2));
        } else {
            console.log("✅ Verification Successful (No Errors)");
            console.log("Data:", JSON.stringify(data, null, 2));

            if ((data as any)?.sub) {
                console.log(`✅ Valid Subject (User ID): ${(data as any).sub}`);
            } else {
                console.error("⚠️  DATA MISSING 'sub' CLAIM!");
            }
        }

    } catch (e) {
        console.error("❌ Verification Threw Exception:", e);
    }
}

const tokenArg = process.argv[2];
if (!tokenArg) {
    console.log("Usage: npx tsx scripts/test_token.ts <bearer_token>");
    console.log("You can get a token by logging into the site, inspecting Network tab, and copying the Authorization header value (without 'Bearer ').");
} else {
    verify(tokenArg).finally(() => process.exit());
}
