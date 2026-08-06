# Official course map - learn-model-evaluation-with-phoebe

Research date: 2026-08-04. All syllabi, docs, and papers fetched live and verified by 2 parallel research agents. Fast-moving on the LLM side: re-verify RAGAS names, Azure Foundry slugs, and the OpenAI evals deprecation before delivery.

## Positioning vs siblings (say this honestly on pages)
- **learn-intro-ml** teaches HOW to compute the classic metrics in sklearn (its b7/b8). This course teaches CHOOSING them, the threshold as a business decision, and what each one costs when wrong.
- **learn-evals** owns the LLM eval HARNESS hands-on (golden sets, RAGAS pipelines, tracing, CI). This course owns the METRICS - definitions, use cases, pros/cons, misconceptions. Cross-link both ways; b6/b7 point to learn-evals for the machinery.

## Sources

| # | Source | URL | Depth |
|---|--------|-----|-------|
| S1 | scikit-learn model evaluation user guide ("Metrics and scoring") + calibration guide + threshold-tuning guide + cost-sensitive example | scikit-learn.org/stable/modules/model_evaluation.html · /calibration.html · /classification_threshold.html | 4 doc sets |
| S2 | Google ML Crash Course - Classification module | developers.google.com/machine-learning/crash-course/classification | 8 lessons |
| S3 | Andrew Ng: Advanced Learning Algorithms W3 (error metrics for skewed data, P/R tradeoff) + Structuring ML Projects W1-2 (single-number metric, satisficing vs optimizing, error analysis) | coursera.org/learn/advanced-learning-algorithms · /machine-learning-projects | 2 courses |
| S4 | Saito & Rehmsmeier 2015, PLOS ONE 10(3):e0118432 - PR plot vs ROC plot on imbalanced data | journals.plos.org (DOI 10.1371/journal.pone.0118432) | paper |
| S5 | Zheng et al. 2023, "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" (NeurIPS 2023 D&B) | arxiv.org/abs/2306.05685 | paper |
| S6 | RAGAS metric docs (faithfulness formula + metric family) | docs.ragas.io/en/stable/concepts/metrics/available_metrics/ | doc set |
| S7 | Microsoft Foundry (Azure AI) RAG evaluators - Groundedness et al | learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators | doc set |
| S8 | NVIDIA NIM LLM benchmarking metrics (TTFT/ITL/TPS) | docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html | doc page |
| S9 | Anthropic: define-success + develop-tests + "Demystifying evals for AI agents" (Jan 2026) | platform.claude.com/docs/en/build-with-claude/define-success · anthropic.com/engineering/demystifying-evals-for-ai-agents | 3 docs |
| S10 | OpenAI evals + graders guides (NOTE: platform deprecating Nov 30, 2026 - teach the taxonomy, flag the sunset) | developers.openai.com/api/docs/guides/evals · /graders | 2 docs |
| S11 | Hallucination benchmarks: TruthfulQA (arXiv 2109.07958) + Vectara Hallucination Leaderboard (HHEM) | arxiv.org/abs/2109.07958 · github.com/vectara/hallucination-leaderboard | paper + repo |
| S12 | Google "Rules of Machine Learning" (Zinkevich) - Rules #24, #37, #39 | developers.google.com/machine-learning/guides/rules-of-ml | doc |

## Verified key facts (build against these; quote numbers exactly)

### Classic side
- **The accuracy pitfall (S2, near-verbatim):** on data where a class appears 1% of the time, a model predicting negative 100% of the time scores 99% accuracy "despite being useless." Google's metric table: accuracy = rough indicator for BALANCED data only; recall when FN costs more; FPR/precision when FP costs more.
- **sklearn API surface (S1):** accuracy_score, balanced_accuracy_score (macro-avg recall - "avoids inflated performance estimates on imbalanced datasets"), precision_recall_fscore_support, f1_score/fbeta_score, roc_auc_score, average_precision_score, brier_score_loss, log_loss, precision_recall_curve, roc_curve, matthews_corrcoef, ndcg_score/dcg_score. Regression: mean_absolute_error, root_mean_squared_error, mean_absolute_percentage_error, r2_score, median_absolute_error, mean_pinball_loss.
- **"Which scoring function" doctrine (S1):** predict a probability -> proper scoring rules (Brier/log loss); predict a class -> zero-one family; predict a mean -> squared error; median -> absolute error; quantile -> pinball.
- **PR vs ROC under imbalance (S4):** ROC plots can deceive on imbalanced data (true negatives dominate specificity); PR plots reflect real performance because precision is prevalence-sensitive. Also (S1): linear interpolation of PR curves is overly optimistic - average_precision_score deliberately avoids it.
- **Calibration (S1):** well-calibrated = predict_proba interpretable as confidence (0.8 -> ~80% positive). Reliability diagram = binned predicted vs actual. WARNING the guide states: a lower Brier does NOT necessarily mean better calibration (it mixes calibration + discrimination). Methods: Platt sigmoid, isotonic (>~1000 samples), CalibratedClassifierCV.
- **Cost-sensitive thresholds (S1, the b5 spine):** sklearn's own example uses German Credit with cost matrix FP=-1 / FN=-5, cites Elkan 2001 "The Foundations of Cost-Sensitive Learning"; default 0.5 cutoffs are "most certainly not ideal for most use cases"; TunedThresholdClassifierCV (sklearn >= 1.5) tunes the threshold on a business scorer; NEVER tune the threshold on training data.
- **Ng's doctrines (S3):** single-number evaluation metric (pick ONE so iteration is fast); satisficing vs optimizing metrics (optimize F1 SUBJECT TO latency <= X); error analysis = manually read ~100 misclassified dev examples before deciding what to fix.

### LLM side
- **LLM-as-judge (S5, exact):** four documented limitations - position bias, verbosity bias, self-enhancement bias, limited reasoning ability. GPT-4-class judges reach "over 80% agreement" with humans - WHICH EQUALS human-human agreement (the correct bar: a judge cannot beat human-human agreement). Mitigations from the paper: swap answer order and keep only consistent verdicts.
- **Faithfulness (S6, exact formula):** claims in response supported by retrieved context / total claims, scale 0-1. Worked example in docs scores 0.5. Variant FaithfulnesswithHHEM uses Vectara's detector as grader. RAGAS family: Faithfulness, Response Relevancy, Context Precision, Context Recall, Noise Sensitivity, Factual Correctness (vs ground truth - distinct from faithfulness-vs-context!).
- **Groundedness (S7):** Azure/MS Foundry: LLM-judged 1-5 Likert, thresholded to pass/fail at 3; "Groundedness focuses on the precision aspect... Response Completeness focuses on the recall aspect" - P/R reborn at response level. Same concept as RAGAS faithfulness, different operationalization: metric design is a CHOICE.
- **Latency (S8, exact):** TTFT = submit -> first token (queue + prefill + network; perceived responsiveness). ITL/TPOT = avg time between tokens = (e2e - TTFT)/(tokens-1) (decode smoothness). Identity: e2e = TTFT + (tokens-1) x ITL. System TPS vs per-user TPS diverge under batching - batching raises throughput, degrades each user's ITL.
- **Anthropic vocabulary (S9):** 8 success-criteria categories incl. latency + price; 3 grading methods (code/LLM/human) with "prioritize volume over quality" of graded items; task / trial / grader / transcript / outcome; pass@k (at least one of k - capability ceiling) vs pass^k (all k - reliability floor); capability evals (start low) vs regression evals (hold ~100%); grade OUTCOMES (end state), not the agent's narration.
- **OpenAI grader taxonomy (S10):** string check, text similarity (BLEU/ROUGE/METEOR/cosine...), score model, python. FLAG: the Evals platform is being deprecated Nov 30, 2026 - teach concepts, not buttons.
- **Hallucination benchmarks (S11):** TruthfulQA = 817 adversarial questions, 38 categories; at publication best model 58% truthful vs 94% human, and LARGER models were LESS truthful (imitation of popular falsehoods). HHEM leaderboard = faithfulness-in-summarization, temperature 0, reports Hallucination Rate + Factual Consistency Rate; leaders ~2-3% rates. CRITICAL distinction: TruthfulQA measures lying about the WORLD, HHEM lying about the DOCUMENT - two different "hallucination" definitions people conflate.
- **Offline/online gap (S12):** Rule #37 training/serving skew ladder (train-vs-holdout / holdout-vs-next-day / next-day-vs-live - the last = engineering bug). Rule #39: launch metrics are proxies for long-term goals - the eval score is a proxy for the online metric which is a proxy for the business goal: a TWO-HOP proxy chain, each hop can break.

## Running case - Lumen (reused ds canon + this course's slice)

**Lumen Skincare** (the intro-ml/statistics/experimentation dataset): $18M/yr DTC brand, `converted` ~3.2% base rate, avg order ~$74. This course evaluates the conversion model intro-ml built. **Do not invent different Lumen figures.**

### evalml-live.js canon (hard-coded, quote exactly)
2,000-session evaluation slice, deterministic seed 42, ~3.2% converters. Default costs FP=$2 (wasted outreach), FN=$74 (lost order).

| Point | Threshold | Precision | Recall | F1 | Error cost |
|-------|-----------|-----------|--------|-----|-----------|
| Default 0.50 | 0.50 | 21.5% | 63.6% | 0.321 | $1,736 |
| "Optimize F1" | 0.61 | 100.0% | 54.5% | **0.706** | **$1,850** |
| "Optimize $" | 0.22 | 8.8% | 100.0% | **0.161** | **$1,146** |

**The Goodhart gap: $704** - F1-optimal costs $704 MORE than cost-optimal; the cost-optimal threshold has the WORST-looking F1 on the card. Accuracy at F1-opt = 98.8% (the accuracy paradox rides along).

Judge mode: 24 answers, scripted verbosity bias (0.009/word). **Raw judge: 58% agreement, 10 bad-but-long answers rated good. Length-controlled: 88% agreement, 1 residual.** Honesty rail on both modes: threshold math + dollars computed live from embedded data; the judge is a scripted simulation of the Zheng et al. biases.

Embeds: `<div class="evalbox" data-mode="threshold" data-thresh="0.5"></div>` (defaults costs 2,74; data-costs="fp,fn" to override) · `<div class="evalbox" data-mode="judge"></div>`.

## The course spine (the briefing Phoebe approved - carry as callouts)

3 misunderstandings (one callout each where it bites): (1) P/R trade through the threshold, one F1 = a silent equal-costs assumption -> b2/b5; (2) judge scores are model outputs, not measurements - calibrate against humans -> b7; (3) benchmark/offline scores don't transfer - two-hop proxy chain -> b9/a-track.
3 project killers: (1) no golden set before building -> b9/a5; (2) optimizing a proxy unwired to money (Goodhart) -> b5/a2; (3) static evals in a drifting world -> b9/a5.

## Per-session coverage - leader track (6 x 45 min)

| Session | Covers | S1 | S2 | S3 | S4 | S5 | S8 | S9 | S11 | S12 |
|---------|--------|----|----|----|----|----|----|----|-----|-----|
| a1 Why one number lies | accuracy paradox (Lumen 96.8% useless model), metric literacy stakes | ◐ | ✓ | ◐ | | | | | | |
| a2 Precision, recall, and money | threshold = business decision; the $704 demo; cost matrix questions to ask | ◐ | ✓ | ✓ | ◐ | | | | | |
| a3 LLM quality metrics, plain | groundedness/hallucination/relevance; world-vs-document distinction; judge skepticism | | | | | ✓ | | ◐ | ✓ | |
| a4 Speed and cost | TTFT/streaming UX, cost per query, satisficing metrics (quality subject to latency+price) | | | ✓ | | | ✓ | ✓ | | |
| a5 The three project killers | golden-set-first, Goodhart, drift; what to mandate | | | ◐ | | | | ✓ | | ✓ |
| a6 Your eval governance playbook | the scorecard to demand, vendor grilling, two-hop proxy chain, review cadence | | | ◐ | | ◐ | | ✓ | | ✓ |

## Per-session coverage - practitioner track (10 x 45 min, Python + the live evaluator)

| Session | Covers | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 |
|---------|--------|----|----|----|----|----|----|----|----|----|-----|-----|-----|
| b1 The confusion matrix cold | TP/FP/FN/TN, accuracy paradox on Lumen, evalml first look | ✓ | ✓ | | | | | | | | | | |
| b2 Precision, recall, threshold | the dial, P/R tradeoff, F1/Fbeta, balanced accuracy | ✓ | ✓ | ✓ | | | | | | | | | |
| b3 Curves + calibration | ROC/AUC, PR curve, PR-vs-ROC under imbalance, reliability diagrams, Brier caveat | ✓ | ✓ | | ✓ | | | | | | | | |
| b4 Regression + ranking | MAE/RMSE/MAPE/R2/pinball, NDCG/AP, which-scoring-function doctrine | ✓ | | | | | | | | | | | |
| b5 The cost matrix (THE session) | Elkan, TunedThresholdClassifierCV, the $704 Goodhart demo, satisficing vs optimizing | ✓ | | ✓ | | | | | | | | | ◐ |
| b6 LLM quality metrics | faithfulness formula, groundedness 1-5, relevance, world-vs-document hallucination | | | | | | ✓ | ✓ | | ◐ | | ✓ | |
| b7 The grader problem | code/LLM/human graders, 4 judge biases, 80%=human-human bar, calibration demo | | | | | ✓ | ◐ | | | ✓ | ✓ | | |
| b8 Operational metrics | TTFT/ITL/TPS identity, batching tradeoff, cost per query, latency as success criterion | | | ◐ | | | | | ✓ | ✓ | | | |
| b9 Drift + continuous eval | capability vs regression evals, golden-set-first, Rule #37 skew ladder, two-hop chain | | | | | | | | | ✓ | ◐ | | ✓ |
| b10 Capstone: the eval sheet | full eval spec for Lumen (classic) + a RAG assistant (LLM): metrics, costs, gates | ✓ | | ✓ | | ◐ | ✓ | ◐ | ◐ | ✓ | | | ✓ |

✓ = ~80% of that source's working content for the topic. ◐ = partial/contextual. Certificates/graded assessments stay official; hands-on RAGAS pipelines live in learn-ai-evals-with-phoebe.

## Overlap analysis
Shared core taught ONCE: confusion-matrix arithmetic (b1), the threshold dial (b2, reused in b5), grader taxonomy (b7 - S9/S10 agree code/model/human). Unique deltas: S4-only (PR-vs-ROC) -> b3. S1-only (calibration warning, TunedThresholdClassifierCV, scoring-function doctrine) -> b3/b4/b5. S5-only (bias list + 80% bar) -> b7. S8-only (latency identity) -> b8. S11-only (world-vs-document) -> b6. S12-only (skew ladder, proxy chain) -> b9.

## Open lane (differentiation)
The Goodhart trap as a BUTTON (optimize-F1 visibly loses $704) · a judge you calibrate yourself (58% -> 88%) · classic + LLM metric families in one arc with the same money-first lens · the two-hop proxy chain taught as governance · latency/cost as first-class metrics (Anthropic's own success-criteria list), not infra footnotes.

## Not covered by design (honest list)
- Hands-on RAGAS/LangSmith pipelines, tracing, CI wiring -> learn-ai-evals-with-phoebe
- sklearn mechanics from scratch -> learn-intro-ml-with-phoebe (b7/b8)
- Fairness/bias metrics (demographic parity etc.) - named as the next frontier, not taught
- Statistical significance of eval deltas -> learn-statistics / learn-experimentation
- Vendor eval PRODUCTS (OpenAI platform deprecating Nov 2026; taught as taxonomy only)
