#!/usr/bin/env node

/**
 * Monitor Vercel Deployment Status
 * Checks if the latest changes have been deployed to production
 */

import https from "https";

const TESTS = [
  {
    name: "Diagnostic Endpoint",
    url: "https://www.vendeu.online/api/diag",
    check: (data) => {
      try {
        const json = JSON.parse(data);
        return json.buildVersion === "2025-10-02-VERCEL-FIX-DIAG";
      } catch {
        return false;
      }
    },
  },
  {
    name: "Health Endpoint BuildVersion",
    url: "https://www.vendeu.online/api/health",
    check: (data) => {
      try {
        const json = JSON.parse(data);
        return json.buildVersion === "2025-10-02-VERCEL-FIX-DIAG";
      } catch {
        return false;
      }
    },
  },
  {
    name: "Admin Login",
    url: "https://www.vendeu.online/api/auth/login",
    method: "POST",
    body: JSON.stringify({
      email: "admin@vendeuonline.com",
      password: "Test123!@#",
    }),
    check: (data) => {
      try {
        const json = JSON.parse(data);
        return json.success && json.token;
      } catch {
        return false;
      }
    },
  },
];

function makeRequest(test) {
  return new Promise((resolve) => {
    const url = new URL(test.url);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: test.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "VendeuOnline-Deployment-Monitor",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const passed = test.check(data);
        resolve({
          name: test.name,
          status: res.statusCode,
          passed,
          response: data.substring(0, 200),
        });
      });
    });

    req.on("error", (error) => {
      resolve({
        name: test.name,
        status: 0,
        passed: false,
        error: error.message,
      });
    });

    if (test.body) {
      req.write(test.body);
    }

    req.end();
  });
}

async function monitorDeployment() {
  console.log("🔍 Monitoring Vercel Deployment Status...\n");
  console.log("Expected commit: fix: add diagnostic endpoint and fix admin auth");
  console.log("Checking every 30 seconds...\n");

  let deploymentComplete = false;
  let attempts = 0;
  const maxAttempts = 20; // 10 minutes maximum

  while (!deploymentComplete && attempts < maxAttempts) {
    attempts++;
    console.log(`\n🔄 Attempt ${attempts}/${maxAttempts} - ${new Date().toLocaleTimeString()}`);
    console.log("─".repeat(50));

    const results = await Promise.all(TESTS.map(makeRequest));

    let allPassed = true;
    for (const result of results) {
      const icon = result.passed ? "✅" : "❌";
      console.log(`${icon} ${result.name}: ${result.passed ? "PASSED" : "FAILED"}`);

      if (!result.passed) {
        allPassed = false;
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        } else {
          console.log(`   Response: ${result.response}`);
        }
      }
    }

    if (allPassed) {
      deploymentComplete = true;
      console.log("\n🎉 DEPLOYMENT SUCCESSFUL! All tests passed.");
      console.log("✅ Admin dashboard should now be accessible.");
    } else {
      if (attempts < maxAttempts) {
        console.log("\n⏳ Deployment not ready yet. Waiting 30 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    }
  }

  if (!deploymentComplete) {
    console.log("\n❌ DEPLOYMENT TIMEOUT: Changes not detected after 10 minutes.");
    console.log("📋 Possible issues:");
    console.log("   1. Check Vercel Dashboard for build errors");
    console.log("   2. Verify GitHub webhook is configured");
    console.log("   3. Check if deployment is stuck in queue");
    console.log("   4. Try manual redeploy from Vercel Dashboard");
    process.exit(1);
  }
}

// Run the monitor
monitorDeployment().catch(console.error);
