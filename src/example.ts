/**
 * Standalone Example: Using Codeforces Upsolve Service
 * 
 * This file demonstrates how to use the getUpsolveProblems function
 * without React, useful for Node.js scripts, testing, or backend integration.
 * 
 * Run with: npx ts-node example.ts
 */

import { getUpsolveProblems, clearCache } from "./codesforces-upsolve-service";
import type { UpsolveProblem } from "./codesforces-upsolve-service";

// ============================================================================
// Example 1: Basic Usage
// ============================================================================

async function exampleBasicUsage() {
  console.log("\n=== Example 1: Basic Usage ===\n");

  try {
    const problems = await getUpsolveProblems("tourist");

    console.log(`Found ${problems.length} problems to upsolve for "tourist"\n`);

    // Show first 5 problems
    console.log("First 5 problems:");
    problems.slice(0, 5).forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Contest: ${p.contestId}, Problem: ${p.index}`);
      console.log(`   Rating: ${p.rating || "N/A"}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Tags: ${p.tags.join(", ")}\n`);
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================================================
// Example 2: Filtering Examples
// ============================================================================

async function exampleFiltering() {
  console.log("\n=== Example 2: Filtering Examples ===\n");

  try {
    const problems = await getUpsolveProblems("Ashishgup");

    // Filter: Only "attempted" problems (not upsolved yet)
    const attempted = problems.filter((p) => p.status === "attempted");
    console.log(`Attempted (not yet solved): ${attempted.length}`);
    attempted.slice(0, 3).forEach((p) => {
      console.log(`  - ${p.name}`);
    });

    // Filter: Rating between 1500-1800
    const mediumDifficulty = problems.filter(
      (p) => (p.rating || 0) >= 1500 && (p.rating || 0) <= 1800
    );
    console.log(`\nMedium difficulty (1500-1800): ${mediumDifficulty.length}`);

    // Filter: Problems with specific tag
    const dpProblems = problems.filter((p) => p.tags.includes("dp"));
    console.log(`\nProblems with 'dp' tag: ${dpProblems.length}`);

    // Filter: Problems upsolved
    const upsolved = problems.filter((p) => p.status === "upsolved");
    console.log(`\nUpsolved problems: ${upsolved.length}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================================================
// Example 3: Statistics & Analysis
// ============================================================================

async function exampleStatistics() {
  console.log("\n=== Example 3: Statistics & Analysis ===\n");

  try {
    const problems = await getUpsolveProblems("yuki_2012");

    // Calculate statistics
    const stats = {
      total: problems.length,
      attempted: problems.filter((p) => p.status === "attempted").length,
      upsolved: problems.filter((p) => p.status === "upsolved").length,
      avgRating:
        problems.reduce((sum, p) => sum + (p.rating || 0), 0) / problems.length,
      minRating: Math.min(...problems.map((p) => p.rating || 0)),
      maxRating: Math.max(...problems.map((p) => p.rating || 0)),
    };

    console.log("Statistics:");
    console.log(`  Total Problems: ${stats.total}`);
    console.log(`  Attempted: ${stats.attempted}`);
    console.log(`  Upsolved: ${stats.upsolved}`);
    console.log(`  Average Rating: ${stats.avgRating.toFixed(1)}`);
    console.log(`  Rating Range: ${stats.minRating} - ${stats.maxRating}`);

    // Tag frequency
    const tagFrequency = new Map<string, number>();
    problems.forEach((p) => {
      p.tags.forEach((tag) => {
        tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
      });
    });

    console.log("\nTop Tags:");
    Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([tag, count]) => {
        console.log(`  ${tag}: ${count} problems`);
      });

    // Rating distribution
    const distribution = {
      easy: problems.filter((p) => (p.rating || 0) < 1300).length,
      medium: problems.filter((p) => (p.rating || 0) >= 1300 && (p.rating || 0) < 1700).length,
      hard: problems.filter((p) => (p.rating || 0) >= 1700 && (p.rating || 0) < 2100).length,
      veryHard: problems.filter((p) => (p.rating || 0) >= 2100).length,
    };

    console.log("\nRating Distribution:");
    console.log(`  Easy (< 1300): ${distribution.easy}`);
    console.log(`  Medium (1300-1700): ${distribution.medium}`);
    console.log(`  Hard (1700-2100): ${distribution.hard}`);
    console.log(`  Very Hard (≥ 2100): ${distribution.veryHard}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================================================
// Example 4: Sorting & Recommendations
// ============================================================================

async function exampleSorting() {
  console.log("\n=== Example 4: Sorting & Recommendations ===\n");

  try {
    const problems = await getUpsolveProblems("Ashishgup");

    // Sort by rating (ascending) - easiest first
    const byRating = [...problems].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    console.log("Easiest attempted problems:");
    byRating.slice(0, 3).forEach((p) => {
      console.log(`  - ${p.name} (Rating: ${p.rating})`);
    });

    // Find most common tags in attempted problems
    const attempted = problems.filter((p) => p.status === "attempted");
    const tagFrequency = new Map<string, number>();
    attempted.forEach((p) => {
      p.tags.forEach((tag) => {
        tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
      });
    });

    console.log("\nRecommended focus areas (most frequent tags in attempted):");
    Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([tag, count], i) => {
        console.log(`  ${i + 1}. ${tag} (${count} problems)`);
      });

    // Suggest a problem to solve
    if (attempted.length > 0) {
      const suggested = attempted[Math.floor(Math.random() * attempted.length)];
      console.log(`\nDaily Challenge Suggestion:`);
      console.log(`  ${suggested.name}`);
      console.log(`  Rating: ${suggested.rating}`);
      console.log(`  Tags: ${suggested.tags.join(", ")}`);
      console.log(`  Link: https://codeforces.com/contest/${suggested.contestId}/problem/${suggested.index}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================================================
// Example 5: Comparing Multiple Users
// ============================================================================

async function exampleComparison() {
  console.log("\n=== Example 5: Comparing Multiple Users ===\n");

  const handles = ["tourist", "Ashishgup"];

  try {
    const results: Record<string, UpsolveProblem[]> = {};

    for (const handle of handles) {
      console.log(`Fetching data for ${handle}...`);
      results[handle] = await getUpsolveProblems(handle);
    }

    console.log("\nComparison:");
    handles.forEach((handle) => {
      const data = results[handle];
      const attempted = data.filter((p) => p.status === "attempted");
      const upsolved = data.filter((p) => p.status === "upsolved");

      console.log(`\n${handle}:`);
      console.log(`  Total: ${data.length}`);
      console.log(`  Attempted: ${attempted.length}`);
      console.log(`  Upsolved: ${upsolved.length}`);
      console.log(`  Success Rate: ${((upsolved.length / data.length) * 100).toFixed(1)}%`);
    });

    // Find common attempted problems
    const set1 = new Set(
      results[handles[0]].map((p) => `${p.contestId}-${p.index}`)
    );
    const commonAttempted = results[handles[1]].filter(
      (p) => set1.has(`${p.contestId}-${p.index}`)
    );

    console.log(`\nProblems both users have attempted: ${commonAttempted.length}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================================================
// Example 6: Caching Demonstration
// ============================================================================

async function exampleCaching() {
  console.log("\n=== Example 6: Caching Demonstration ===\n");

  try {
    console.log("First call - fetches from API...");
    let startTime = Date.now();
    const problems1 = await getUpsolveProblems("tourist");
    let duration = Date.now() - startTime;
    console.log(`  Completed in ${duration}ms with ${problems1.length} problems`);

    console.log("\nSecond call - uses cache (should be instant)...");
    startTime = Date.now();
    const problems2 = await getUpsolveProblems("tourist");
    duration = Date.now() - startTime;
    console.log(`  Completed in ${duration}ms with ${problems2.length} problems`);

    console.log("\nClearing cache...");
    clearCache();

    console.log("\nThird call - fetches from API again...");
    startTime = Date.now();
    const problems3 = await getUpsolveProblems("tourist");
    duration = Date.now() - startTime;
    console.log(`  Completed in ${duration}ms with ${problems3.length} problems`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================================================
// Main Runner
// ============================================================================

async function runAllExamples() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║   Codeforces Upsolve Service - Standalone Examples       ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  try {
    // Run examples sequentially
    await exampleBasicUsage();
    await exampleFiltering();
    await exampleStatistics();
    await exampleSorting();
    // await exampleComparison(); // Commented out - takes longer
    await exampleCaching();

    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║   All examples completed successfully!                  ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run all examples
runAllExamples();

// Optional: Export individual examples for selective running
export {
  exampleBasicUsage,
  exampleFiltering,
  exampleStatistics,
  exampleSorting,
  exampleComparison,
  exampleCaching,
};
