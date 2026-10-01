import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User } from "../server/src/models/User.js";
import { Idea, computeChecklistHash, IFeature } from "../server/src/models/Idea.js";
import { Repository } from "../server/src/models/Repository.js";
import { Query } from "../server/src/models/Query.js";
import { Analysis } from "../server/src/models/Analysis.js";
import { env } from "../server/src/config/env.js";

// Ensure environment variables are loaded
dotenv.config();

async function seed() {
  const uri = process.env.MONGODB_URI || env.MONGODB_URI;
  console.log(`Connecting to MongoDB at ${uri}...`);
  await mongoose.connect(uri);

  console.log("Cleaning existing database collections...");
  await Promise.all([
    User.deleteMany({}),
    Idea.deleteMany({}),
    Repository.deleteMany({}),
    Query.deleteMany({}),
    Analysis.deleteMany({}),
  ]);

  console.log("Seeding Users...");
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("AdminPass123!", salt);
  const founderPasswordHash = await bcrypt.hash("FounderPass123!", salt);
  const demoPasswordHash = await bcrypt.hash("Founder123!", salt);

  const admin = await User.create({
    name: "Admin User",
    email: "admin@reporevive.com",
    passwordHash: adminPasswordHash,
    role: "admin",
  });

  const founder = await User.create({
    name: "Founder User",
    email: "founder@reporevive.com",
    passwordHash: founderPasswordHash,
    role: "founder",
    dailyAnalysisCount: 0,
  });

  // Seed demo founder matching scripted demo credentials
  const demoFounder = await User.create({
    name: "Demo Founder",
    email: "demo@reporevive.dev",
    passwordHash: demoPasswordHash,
    role: "founder",
    dailyAnalysisCount: 0,
  });

  console.log("Seeding 20 Fake Stale Repositories...");
  const staleDate = (monthsAgo: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    return d;
  };

  const reposData: any[] = [
    {
      githubId: 20001,
      fullName: "smallbiz/shop-stock-lite",
      url: "https://github.com/smallbiz/shop-stock-lite",
      description: "Lightweight inventory tracker and alert bot via webhook.",
      topics: ["inventory", "retail", "stock", "alerts"],
      language: "TypeScript",
      license: { spdx: "MIT", name: "MIT License" },
      stars: 124,
      forks: 32,
      openIssues: 3,
      openBugIssues: 1,
      closedBugIssues: 8,
      lastCiConclusion: "success",
      defaultBranch: "main",
      archived: false,
      createdAt: staleDate(36),
      pushedAt: staleDate(15),
      lastCommitAt: staleDate(15),
      commitCount: 65,
      contributorCount: 3,
      readmeText: "# Shop Stock Lite\nInventory manager for local retailers with stock counting and webhook alerts.",
      readmeHash: "hash-001",
    },
    {
      githubId: 20002,
      fullName: "devflow/inventory-core",
      url: "https://github.com/devflow/inventory-core",
      description: "Inventory backend with SKU tracking and barcode integration.",
      topics: ["inventory", "sku", "ecommerce"],
      language: "JavaScript",
      license: { spdx: "Apache-2.0", name: "Apache License 2.0" },
      stars: 95,
      forks: 18,
      openIssues: 5,
      openBugIssues: 2,
      closedBugIssues: 12,
      lastCiConclusion: "success",
      defaultBranch: "master",
      archived: false,
      createdAt: staleDate(28),
      pushedAt: staleDate(14),
      lastCommitAt: staleDate(14),
      commitCount: 48,
      contributorCount: 2,
      readmeText: "# Inventory Core\nREST API for product inventory management.",
      readmeHash: "hash-002",
    },
    {
      githubId: 20003,
      fullName: "unlicensed/unlicensed-stock-app",
      url: "https://github.com/unlicensed/unlicensed-stock-app",
      description: "Stock tracking tool with high feature coverage but no open-source license.",
      topics: ["stock", "tracker", "whatsapp"],
      language: "TypeScript",
      license: { spdx: null, name: "" }, // NO_LICENSE test repo!
      stars: 210,
      forks: 40,
      openIssues: 2,
      openBugIssues: 0,
      closedBugIssues: 15,
      lastCiConclusion: "success",
      defaultBranch: "main",
      archived: false,
      createdAt: staleDate(24),
      pushedAt: staleDate(13),
      lastCommitAt: staleDate(13),
      commitCount: 88,
      contributorCount: 4,
      readmeText: "# Stock App\nPrivate-use retail tracker.",
      readmeHash: "hash-003",
    },
    {
      githubId: 20004,
      fullName: "alertbot/whatsapp-inventory-bridge",
      url: "https://github.com/alertbot/whatsapp-inventory-bridge",
      description: "Connects ERP stock thresholds to WhatsApp notification gateway.",
      topics: ["whatsapp", "notifications", "alerts", "bot"],
      language: "Python",
      license: { spdx: "MIT", name: "MIT License" },
      stars: 180,
      forks: 45,
      openIssues: 8,
      openBugIssues: 3,
      closedBugIssues: 20,
      lastCiConclusion: "success",
      defaultBranch: "main",
      archived: false,
      createdAt: staleDate(30),
      pushedAt: staleDate(16),
      lastCommitAt: staleDate(16),
      commitCount: 52,
      contributorCount: 3,
      readmeText: "# WhatsApp Inventory Bridge\nNotification service for low stock.",
      readmeHash: "hash-004",
    },
    {
      githubId: 20005,
      fullName: "deadcode/ancient-inventory",
      url: "https://github.com/deadcode/ancient-inventory",
      description: "Archived warehouse tracking system.",
      topics: ["warehouse", "inventory"],
      language: "Python",
      license: { spdx: "MIT", name: "MIT License" },
      stars: 60,
      forks: 10,
      openIssues: 12,
      openBugIssues: 7,
      closedBugIssues: 3,
      lastCiConclusion: "failure",
      defaultBranch: "main",
      archived: true, // ARCHIVED test repo!
      createdAt: staleDate(48),
      pushedAt: staleDate(20),
      lastCommitAt: staleDate(20),
      commitCount: 35,
      contributorCount: 1,
      readmeText: "# Ancient Inventory\nArchived and abandoned.",
      readmeHash: "hash-005",
    },
  ];

  // Generate 15 more realistic repositories to reach 20
  const languages = ["TypeScript", "Python", "Go", "JavaScript", "Rust"];
  const licenses = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC"];

  for (let i = 6; i <= 20; i++) {
    const lang = languages[i % languages.length];
    const lic = licenses[i % licenses.length];
    reposData.push({
      githubId: 20000 + i,
      fullName: `stale-org/project-${i}`,
      url: `https://github.com/stale-org/project-${i}`,
      description: `Stale open-source utility #${i} for backend data tracking and automation.`,
      topics: ["automation", "tools", "data", "api"],
      language: lang,
      license: { spdx: lic, name: `${lic} License` },
      stars: 40 + i * 5,
      forks: 5 + i * 2,
      openIssues: (i % 5) + 1,
      openBugIssues: i % 3,
      closedBugIssues: 10 + i,
      lastCiConclusion: i % 4 === 0 ? "failure" : "success",
      defaultBranch: "main",
      archived: false,
      createdAt: staleDate(24 + i),
      pushedAt: staleDate(12 + (i % 6)),
      lastCommitAt: staleDate(12 + (i % 6)),
      commitCount: 30 + i * 3,
      contributorCount: 2 + (i % 4),
      readmeText: `# Project ${i}\nDocumentation and usage guide for project ${i}.`,
      readmeHash: `hash-0${i}`,
    });
  }

  const seededRepos = await Repository.insertMany(reposData);

  console.log("Seeding 3 Sample Ideas...");
  const idea1Features: IFeature[] = [
    {
      id: "f1",
      label: "Stock & Inventory Tracking",
      plainDescription: "Record item quantities, unit prices, and SKU codes.",
      keywords: ["inventory", "stock", "sku", "quantity"],
      priority: "must",
    },
    {
      id: "f2",
      label: "WhatsApp Low-Stock Alerts",
      plainDescription: "Send automatic WhatsApp notifications when items hit threshold.",
      keywords: ["whatsapp", "alerts", "notifications", "threshold"],
      priority: "must",
    },
    {
      id: "f3",
      label: "Sales Receipt Logging",
      plainDescription: "Log daily sales and customer receipts.",
      keywords: ["sales", "receipts", "billing"],
      priority: "nice",
    },
  ];

  const idea1Hash = computeChecklistHash(idea1Features);

  const idea1 = await Idea.create({
    userId: founder._id,
    rawText:
      "A simple mobile-friendly app where small grocery shop owners can track stock counts and get automatic low-stock warning alerts on WhatsApp.",
    refined: {
      summary: "Inventory tracking with WhatsApp low-stock alerts for small retailers.",
      targetUsers: ["Small shop owners", "Grocers", "Independent merchants"],
      features: idea1Features,
    },
    status: "done",
    checklistHash: idea1Hash,
  });

  const idea2Features: IFeature[] = [
    {
      id: "f1",
      label: "Daily Habit Logging",
      plainDescription: "Check off daily habits with notes.",
      keywords: ["habit", "tracking", "log"],
      priority: "must",
    },
    {
      id: "f2",
      label: "Streak Heatmaps",
      plainDescription: "Visual calendar heatmap of completed streaks.",
      keywords: ["heatmap", "calendar", "streak", "analytics"],
      priority: "must",
    },
  ];

  await Idea.create({
    userId: founder._id,
    rawText:
      "A minimalist habit tracking web dashboard with GitHub-style streak heatmaps and daily reminder notifications.",
    refined: {
      summary: "Streak-based habit tracker with visual heatmaps.",
      targetUsers: ["Productivity enthusiasts", "Students"],
      features: idea2Features,
    },
    status: "draft",
    checklistHash: "",
  });

  const idea3Features: IFeature[] = [
    {
      id: "f1",
      label: "Markdown Newsletter Editor",
      plainDescription: "Compose email newsletters in plain markdown.",
      keywords: ["markdown", "newsletter", "editor"],
      priority: "must",
    },
    {
      id: "f2",
      label: "Amazon SES Integration",
      plainDescription: "Deliver scheduled broadcast emails via AWS SES.",
      keywords: ["ses", "email", "aws", "broadcast"],
      priority: "must",
    },
  ];

  await Idea.create({
    userId: founder._id,
    rawText:
      "A self-hosted newsletter platform where content writers write in markdown and broadcast newsletters through Amazon Simple Email Service (SES).",
    refined: {
      summary: "Markdown newsletter manager powered by Amazon SES.",
      targetUsers: ["Independent creators", "Substack alternatives"],
      features: idea3Features,
    },
    status: "confirmed",
    checklistHash: computeChecklistHash(idea3Features),
  });

  console.log("Seeding Full Deep Analyses for Idea 1 Candidates...");

  // Analysis 1: Best Match (smallbiz/shop-stock-lite)
  const analysisBest = await Analysis.create({
    repoId: seededRepos[0]._id,
    ideaId: idea1._id,
    checklistHash: idea1Hash,
    requestedBy: founder._id,
    status: "done",
    startedAt: new Date(Date.now() - 30000),
    finishedAt: new Date(),
    facts: {
      framework: "Express + React",
      totalLoc: 3450,
      openIssues: 3,
      openBugIssues: 1,
      lastCiStatus: "success",
      licenseSpdx: "MIT",
    },
    coverage: {
      score: 83,
      features: [
        {
          featureId: "f1",
          status: "present",
          evidence: [
            {
              type: "file",
              ref: "src/inventory/stock.ts:L12-L65",
              snippet: "export class StockTracker { recordStock(sku: string, qty: number) { ... } }",
            },
          ],
        },
        {
          featureId: "f2",
          status: "present",
          evidence: [
            {
              type: "file",
              ref: "src/alerts/webhook.ts:L24-L80",
              snippet: "export async function sendStockAlert(item: Item, webhookUrl: string) { ... }",
            },
          ],
        },
        {
          featureId: "f3",
          status: "missing",
          evidence: [],
        },
      ],
    },
    bugRisk: {
      penalty: 6.5,
      openBugs: 1,
      lintErrorsPer1k: 1.2,
      ciConclusion: "success",
      todoPer1k: 1.8,
    },
    subScores: {
      structure: 88,
      bugRisk: 85,
      deps: 82,
      docs: 90,
      license: 100,
      history: 75,
      tests: 70,
    },
    viability: 81,
    confidence: 92,
    verdict: "RECOMMENDED",
    flags: [],
    findings: [
      {
        agent: "StructureAgent",
        claim: "Modular TypeScript application layout with distinct controllers and business logic.",
        severity: "info",
        evidence: [{ type: "file", ref: "src/index.ts:L1-L40" }],
      },
      {
        agent: "BugRiskAgent",
        claim: "Low defect density observed; 1 minor open issue with no regressions detected in static lint.",
        severity: "info",
        evidence: [{ type: "file", ref: "src/inventory/stock.ts:L1-L20" }],
      },
      {
        agent: "LicenseAgent",
        claim: "Permissive MIT license permits unencumbered commercial derivation.",
        severity: "info",
        evidence: [{ type: "file", ref: "LICENSE" }],
      },
    ],
    revivalPlan: {
      gaps: [
        "Sales receipt logging module is missing from the existing codebase.",
        "Notification mechanism currently uses generic webhooks; needs WhatsApp Cloud API adapter.",
      ],
      steps: [
        "Upgrade dependencies to current Node.js 20 LTS.",
        "Create sales receipt database model and export endpoint.",
        "Integrate WhatsApp Cloud API using Meta Graph SDK.",
        "Run static linters and verify inventory calculation unit tests.",
      ],
      effortHours: { min: 15, max: 30 },
      risks: [
        "Meta WhatsApp Business API requires verification and per-message template fees.",
      ],
    },
    founderBrief: `# Founder Brief: smallbiz/shop-stock-lite Revival

## Executive Summary
**smallbiz/shop-stock-lite** is the top-ranked open-source baseline for your inventory and alert concept. Approximately **83% of your required features** are already built and tested.

## What is Already Built
- **Stock & Inventory Tracking**: Full SKU catalog, real-time inventory increment/decrement, and database persistence (\`src/inventory/stock.ts\`).
- **Low-Stock Alerting Engine**: Threshold triggers that dispatch webhook payloads when stock counts dip below safety margins (\`src/alerts/webhook.ts\`).
- **Permissive MIT License**: 100% legal freedom to fork, modify, rebrand, and sell commercially.

## What Needs to Be Built (The Gaps)
1. **Sales Receipt Logging**: Build a sales receipt record model and customer print/PDF view.
2. **WhatsApp API Integration**: Connect existing webhook triggers to Meta's WhatsApp Cloud API.

## Estimated Revival Effort
- **Total Developer Effort**: 15 to 30 developer hours.
- **Estimated Freelance Cost**: $450 – $900 (at $30/hr freelance rate).
- **Savings vs. Building from Scratch**: ~70% time and cost reduction.

## Hand-off Checklist for Your Developer
- [ ] Fork https://github.com/smallbiz/shop-stock-lite
- [ ] Upgrade Node.js runtime and packages (\`npm update\`)
- [ ] Add receipt logging endpoints in \`src/routes/sales.ts\`
- [ ] Deploy to Render / Vercel with MongoDB Atlas
`,
    trace: [
      { step: 1, agent: "ScoutAgent", tool: "github_tree", tokensIn: 120, tokensOut: 45, latencyMs: 110 },
      { step: 2, agent: "CoverageAgent", tool: "ast_grep", tokensIn: 340, tokensOut: 110, latencyMs: 230 },
      { step: 3, agent: "VerifierAgent", tool: "path_check", tokensIn: 180, tokensOut: 60, latencyMs: 90 },
      { step: 4, agent: "RevivalPlanner", tool: "synthesizer", tokensIn: 450, tokensOut: 280, latencyMs: 310 },
    ],
  });

  // Analysis 2: Alternative 1 (devflow/inventory-core)
  const analysisAlt1 = await Analysis.create({
    repoId: seededRepos[1]._id,
    ideaId: idea1._id,
    checklistHash: idea1Hash,
    requestedBy: founder._id,
    status: "done",
    startedAt: new Date(Date.now() - 25000),
    finishedAt: new Date(),
    facts: {
      framework: "Node.js Vanilla",
      totalLoc: 2800,
      openIssues: 5,
      openBugIssues: 2,
      lastCiStatus: "success",
      licenseSpdx: "Apache-2.0",
    },
    coverage: {
      score: 67,
      features: [
        {
          featureId: "f1",
          status: "present",
          evidence: [{ type: "file", ref: "lib/sku.js:L5-L40" }],
        },
        {
          featureId: "f2",
          status: "partial",
          evidence: [{ type: "file", ref: "lib/notify.js:L10-L30" }],
        },
        {
          featureId: "f3",
          status: "missing",
          evidence: [],
        },
      ],
    },
    bugRisk: {
      penalty: 12.0,
      openBugs: 2,
      lintErrorsPer1k: 3.4,
      ciConclusion: "success",
      todoPer1k: 2.1,
    },
    subScores: {
      structure: 80,
      bugRisk: 75,
      deps: 70,
      docs: 80,
      license: 100,
      history: 65,
      tests: 60,
    },
    viability: 74,
    confidence: 88,
    verdict: "VIABLE_WITH_EFFORT",
    flags: [],
    findings: [
      {
        agent: "StructureAgent",
        claim: "Solid backend inventory architecture, but lacks a pre-built frontend interface.",
        severity: "info",
        evidence: [{ type: "file", ref: "index.js" }],
      },
    ],
    revivalPlan: {
      gaps: ["No mobile or web frontend included (API only).", "Missing sales receipt tracking."],
      steps: ["Build React client on top of API", "Implement WhatsApp bot webhook"],
      effortHours: { min: 25, max: 45 },
      risks: ["Requires frontend UI development from scratch."],
    },
    founderBrief: `# Founder Brief: devflow/inventory-core Revival\n\nSolid backend REST engine with 67% coverage. Requires a new frontend UI.`,
    trace: [],
  });

  // Analysis 3: Alternative 2 (alertbot/whatsapp-inventory-bridge)
  const analysisAlt2 = await Analysis.create({
    repoId: seededRepos[3]._id,
    ideaId: idea1._id,
    checklistHash: idea1Hash,
    requestedBy: founder._id,
    status: "done",
    startedAt: new Date(Date.now() - 20000),
    finishedAt: new Date(),
    facts: {
      framework: "FastAPI / Python",
      totalLoc: 1950,
      openIssues: 8,
      openBugIssues: 3,
      lastCiStatus: "success",
      licenseSpdx: "MIT",
    },
    coverage: {
      score: 50,
      features: [
        {
          featureId: "f1",
          status: "partial",
          evidence: [{ type: "file", ref: "app/models.py:L1-L30" }],
        },
        {
          featureId: "f2",
          status: "present",
          evidence: [{ type: "file", ref: "app/whatsapp.py:L15-L75" }],
        },
        {
          featureId: "f3",
          status: "missing",
          evidence: [],
        },
      ],
    },
    bugRisk: {
      penalty: 14.5,
      openBugs: 3,
      lintErrorsPer1k: 2.8,
      ciConclusion: "success",
      todoPer1k: 3.2,
    },
    subScores: {
      structure: 75,
      bugRisk: 70,
      deps: 68,
      docs: 75,
      license: 100,
      history: 60,
      tests: 55,
    },
    viability: 70,
    confidence: 82,
    verdict: "VIABLE_WITH_EFFORT",
    flags: [],
    findings: [
      {
        agent: "DependenciesAgent",
        claim: "Python dependencies are 16 months old; requires virtualenv modernization.",
        severity: "warning",
        evidence: [{ type: "file", ref: "requirements.txt" }],
      },
    ],
    revivalPlan: {
      gaps: ["Lightweight inventory module; focused mostly on WhatsApp alert dispatch."],
      steps: ["Expand inventory database schema", "Upgrade Python packages"],
      effortHours: { min: 20, max: 40 },
      risks: ["Python backend requires separate hosting configuration if pairing with Node."],
    },
    founderBrief: `# Founder Brief: alertbot/whatsapp-inventory-bridge\n\nExcellent WhatsApp gateway with basic stock schema.`,
    trace: [],
  });

  // Attach populated Query to Idea 1 linking real analysisIds
  const queryResults = [
    {
      repoId: seededRepos[0]._id,
      relevance: 0.95,
      matchedTerms: ["inventory", "stock", "alerts"],
      analysisId: analysisBest._id,
      coverage: 83,
      viability: 81,
      final: 0.88,
    },
    {
      repoId: seededRepos[1]._id,
      relevance: 0.89,
      matchedTerms: ["inventory", "sku"],
      analysisId: analysisAlt1._id,
      coverage: 67,
      viability: 74,
      final: 0.78,
    },
    {
      repoId: seededRepos[3]._id,
      relevance: 0.84,
      matchedTerms: ["whatsapp", "alerts", "stock"],
      analysisId: analysisAlt2._id,
      coverage: 50,
      viability: 70,
      final: 0.70,
    },
    {
      repoId: seededRepos[2]._id,
      relevance: 0.82,
      matchedTerms: ["stock", "tracker"],
      coverage: 78,
      viability: 60,
      final: 0.65,
    },
    {
      repoId: seededRepos[4]._id,
      relevance: 0.65,
      matchedTerms: ["warehouse", "inventory"],
      coverage: 40,
      viability: 45,
      final: 0.50,
    },
  ];

  const sampleQuery = await Query.create({
    ideaId: idea1._id,
    userId: founder._id,
    expandedQuery: "Stock & Inventory Tracking WhatsApp Low-Stock Alerts Sales Receipt Logging",
    checklistHash: idea1Hash,
    results: queryResults,
    bestRepoId: seededRepos[0]._id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  console.log("Database seeded successfully!");
  console.log({
    admin: { email: admin.email, password: "AdminPass123!" },
    founder: { email: founder.email, password: "FounderPass123!" },
    demoFounder: { email: demoFounder.email, password: "Founder123!" },
    ideasSeeded: 3,
    reposSeeded: seededRepos.length,
    analysesSeeded: 3,
    sampleQueryId: sampleQuery._id,
  });

  await mongoose.disconnect();
  console.log("MongoDB connection closed.");
}

seed().catch((err) => {
  console.error("Seed failed with error:", err);
  process.exit(1);
});
