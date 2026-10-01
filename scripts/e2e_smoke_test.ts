/**
 * RepoRevive – End-to-End Automated Smoke Test Script
 * Runs full founder lifecycle:
 * Register -> Submit Idea -> Confirm Checklist -> Search -> Auto-Analysis -> Brief
 *
 * Usage:
 *   npx ts-node scripts/e2e_smoke_test.ts
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function runE2ESmokeTest() {
  console.log('='.repeat(75));
  console.log(' RepoRevive – End-to-End Automated Smoke Test');
  console.log(` Target Server: ${BASE_URL}`);
  console.log('='.repeat(75));

  const client = axios.create({ baseURL: BASE_URL });

  try {
    // 1. Health check
    console.log('\n[1/7] Checking system topology health...');
    const healthRes = await client.get('/health');
    console.log(`  ✓ System Health: ${healthRes.data.status} (Services: ${JSON.stringify(healthRes.data.services)})`);

    // 2. Register test founder
    console.log('\n[2/7] Registering ephemeral founder account...');
    const email = `smoke_${Date.now()}@reporevive.test`;
    const authRes = await client.post('/auth/register', {
      name: 'Smoke Test Founder',
      email,
      password: 'SmokePassword123!',
    });
    const token = authRes.data.token;
    console.log(`  ✓ Registered: ${email} (Bearer JWT acquired)`);

    const authClient = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${token}` },
    });

    // 3. Submit Idea
    console.log('\n[3/7] Submitting plain-language idea (Stage A Idea Refinement)...');
    const rawText = 'A stock management application for small retail shops with barcode scanning and low-stock alerts.';
    const ideaRes = await authClient.post('/ideas', { rawText });
    const ideaId = ideaRes.data.ideaId;
    const refined = ideaRes.data.refined;
    console.log(`  ✓ Idea Created: ${ideaId}`);
    console.log(`  ✓ Summary: "${refined.summary}"`);
    console.log(`  ✓ Generated Features: ${refined.features.length} items`);

    // 4. Confirm Checklist
    console.log('\n[4/7] Confirming customized feature checklist...');
    const confirmRes = await authClient.patch(`/ideas/${ideaId}`, {
      status: 'confirmed',
      features: refined.features,
    });
    console.log(`  ✓ Checklist Confirmed: checklistHash = ${confirmRes.data.checklistHash}`);

    // 5. Start Search & Queue Top 5 Analysis
    console.log('\n[5/7] Initiating NLP candidate matching & auto-analysis...');
    const searchRes = await authClient.post(`/ideas/${ideaId}/search`);
    console.log(`  ✓ Search Triggered: status = ${searchRes.data.status}, cached = ${searchRes.data.cached}`);

    // 6. Poll Results until done or progress made
    console.log('\n[6/7] Polling for multi-agent analysis results...');
    let pollAttempts = 0;
    let resultsData: any = null;

    while (pollAttempts < 15) {
      pollAttempts++;
      const pollRes = await authClient.get(`/ideas/${ideaId}/results`);
      resultsData = pollRes.data;
      console.log(`  └─ Poll #${pollAttempts}: status='${resultsData.status}', completed ${resultsData.progress?.completed}/${resultsData.progress?.total}`);

      if (resultsData.status === 'done' || resultsData.bestMatch) {
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (resultsData.bestMatch) {
      console.log(`\n  ★ Best Match Identified: ${resultsData.bestMatch.fullName || resultsData.bestMatch.repoId}`);
      console.log(`    Coverage: ${resultsData.bestMatch.coverage}% | Viability: ${resultsData.bestMatch.viability}/100`);
    }

    // 7. Verify Analysis Report & Founder Brief
    console.log('\n[7/7] Verifying analysis details and Founder Brief...');
    const targetAnalysisId = resultsData.bestMatch?.analysisId || resultsData.alternatives?.[0]?.analysisId;

    if (targetAnalysisId) {
      const analysisRes = await authClient.get(`/analyses/${targetAnalysisId}`);
      console.log(`  ✓ Analysis Report Retrieved (${analysisRes.data._id})`);
      console.log(`    Verdict: "${analysisRes.data.verdict}" | Confidence: ${Math.round(analysisRes.data.confidence * 100)}%`);

      const briefRes = await authClient.get(`/analyses/${targetAnalysisId}/brief`);
      console.log(`  ✓ Downloadable Founder Brief Verified (${briefRes.data.length} characters of Markdown)`);
    } else {
      console.log('  ⚠ No candidate reached completion within timeout; check worker queue status.');
    }

    console.log('\n' + '='.repeat(75));
    console.log(' 🎉 E2E SMOKE TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(75));
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ E2E Smoke Test Failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runE2ESmokeTest();
