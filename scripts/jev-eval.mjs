#!/usr/bin/env node
/**
 * Jev (TypeSafe "System One") evaluation harness — EXPERIMENTAL, repo tooling
 * only. This is not product code and never runs in the app.
 *
 * MoneyFlow law reminder: real financial data never goes to an external AI
 * provider. Every built-in scenario below uses synthetic fixtures; keep it
 * that way when adding cases. Ad-hoc calls via --state/--questions are the
 * caller's responsibility.
 *
 * Usage:
 *   TYPESAFE_API_KEY=... node scripts/jev-eval.mjs            # demo suite
 *   TYPESAFE_API_KEY=... node scripts/jev-eval.mjs \
 *     --state "text" --questions '{"q":{"type":"noul","instructions":"…"}}'
 *   --questions @file.json   read the questions map from a file
 *   --model jev-1.13.0       pin a model (default jev-latest)
 *   --raw                    print the raw API response instead
 */

import { readFileSync } from "node:fs";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const API_KEY = process.env.TYPESAFE_API_KEY;

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
const hasFlag = (name) => args.includes(`--${name}`);

if (!API_KEY) {
  console.error(
    "TYPESAFE_API_KEY is not set. Get a key at https://console.typesafe.ai/keys",
  );
  process.exit(2);
}

/** One synthetic MoneyFlow-shaped decision problem per call. */
const SCENARIOS = [
  {
    name: "inbox candidate triage (synthetic)",
    state: {
      candidate: {
        source: "csv_import",
        rawDescription: "CF TRUNG NGUYEN E 52K",
        amountVnd: 52000,
        kind: "expense",
        parsedNote: "cà phê",
        confidence: "medium",
      },
      existingCategories: ["Ăn uống", "Di chuyển", "Hoá đơn", "Mua sắm"],
      recentSameAmountRows: 0,
    },
    questions: {
      suggestedCategory: {
        type: "choice",
        instructions: "Which existing category fits this transaction best?",
        criteria: {
          "Ăn uống": "food, drink, coffee, restaurants",
          "Di chuyển": "transport, fuel, parking",
          "Hoá đơn": "utility or service bills",
          "Mua sắm": "shopping, goods",
        },
      },
      looksLikeTransfer: {
        type: "noul",
        instructions:
          "This description is an internal transfer between own accounts, not a real expense",
      },
      evidenceQuality: {
        type: "score",
        instructions: "How trustworthy is the raw description for auto-filling fields?",
        criteria: [
          "unusable — noise or empty",
          "partial — merchant visible, details missing",
          "clear — merchant and purpose obvious",
        ],
      },
    },
  },
  {
    name: "duplicate suspicion (synthetic)",
    state: {
      newCandidate: { note: "grab bike", amountVnd: 35000, occurredOn: "2026-09-20" },
      existingRows: [
        { note: "Grab đi làm", amountVnd: 35000, occurredOn: "2026-09-20" },
        { note: "Grab đi làm", amountVnd: 32000, occurredOn: "2026-09-19" },
      ],
    },
    questions: {
      probableDuplicate: {
        type: "noul",
        instructions:
          "The new candidate is very likely the same real-world event already recorded",
      },
      needsHumanReview: {
        type: "noul",
        instructions: "A human should confirm before this enters the ledger",
      },
    },
  },
];

async function callJev(state, questions, model) {
  const started = performance.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state, model, questions }),
  });
  const ms = Math.round(performance.now() - started);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
  }
  return { body, ms };
}

function renderAnswers(answers) {
  for (const [name, a] of Object.entries(answers)) {
    if (a.type === "choice") {
      console.log(
        `  ${name}: choice=${a.choice}  confidence=${a.confidence}  probs=${JSON.stringify(a.probabilities)}`,
      );
    } else if (a.type === "score") {
      console.log(
        `  ${name}: score=${a.score}  confidence=${a.confidence}  probs=${JSON.stringify(a.probabilities)}`,
      );
    } else if (a.type === "noul") {
      console.log(`  ${name}: noul=${a.noul}`);
    } else {
      console.log(`  ${name}: ${JSON.stringify(a)}`);
    }
  }
}

async function main() {
  const model = arg("model") ?? "jev-latest";
  const state = arg("state");
  const questionsArg = arg("questions");
  const raw = hasFlag("raw");

  const scenarios = state || questionsArg
    ? [
        {
          name: "ad-hoc",
          state: state ?? "",
          questions: questionsArg
            ? questionsArg.startsWith("@")
              ? JSON.parse(readFileSync(questionsArg.slice(1), "utf8"))
              : JSON.parse(questionsArg)
            : {},
        },
      ]
    : SCENARIOS;

  for (const scenario of scenarios) {
    console.log(`\n## ${scenario.name}  (model=${model})`);
    const { body, ms } = await callJev(scenario.state, scenario.questions, model);
    if (raw) {
      console.log(JSON.stringify(body, null, 2));
    } else {
      renderAnswers(body.answers ?? {});
      console.log(
        `  -> resolved=${body.model}  ${ms}ms  tokens in=${body.usage?.input_tokens} out=${body.usage?.output_tokens}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(`jev-eval failed: ${err.message}`);
  process.exit(1);
});
