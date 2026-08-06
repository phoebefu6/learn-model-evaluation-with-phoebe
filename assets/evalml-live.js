/* evalml-live.js - the Lumen threshold + judge-calibration evaluator.
   Usage:
     <div class="evalbox" data-mode="threshold" data-thresh="0.5" data-costs="5,74"></div>
     <div class="evalbox" data-mode="judge"></div>
   threshold mode: a real scored evaluation slice (2,000 Lumen checkout sessions, ~3.2%
   converters, deterministic seed 42). Every metric and every dollar figure is computed
   live in your browser from the embedded scores at the threshold you set.
   The "Optimize F1" button is a deliberate trap: it maximizes F1 while the money gets
   worse. That is Goodhart's law, mechanically.
   judge mode: 24 graded answers where the scripted judge carries the documented
   verbosity bias (Zheng et al. 2023); the agreement statistics are computed live.
*/
(function () {
  "use strict";

  /* ---------- deterministic data (mulberry32, seed 42) ---------- */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 2,000 Lumen checkout sessions: true label (converted) + model score */
  var DATA = (function () {
    var rng = mulberry32(42);
    var rows = [];
    for (var i = 0; i < 2000; i++) {
      var pos = rng() < 0.032;
      var s;
      if (pos) { s = 0.20 + 0.75 * Math.pow(rng(), 1.2); }
      else { s = 0.01 + 0.60 * Math.pow(rng(), 3.0); }
      rows.push({ y: pos ? 1 : 0, s: Math.min(0.99, Math.max(0.01, s)) });
    }
    return rows;
  })();

  function confusion(thresh) {
    var tp = 0, fp = 0, fn = 0, tn = 0;
    DATA.forEach(function (r) {
      if (r.s >= thresh) { if (r.y) tp++; else fp++; }
      else { if (r.y) fn++; else tn++; }
    });
    return { tp: tp, fp: fp, fn: fn, tn: tn };
  }

  function metrics(c) {
    var precision = c.tp + c.fp ? c.tp / (c.tp + c.fp) : 0;
    var recall = c.tp + c.fn ? c.tp / (c.tp + c.fn) : 0;
    var f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
    var acc = (c.tp + c.tn) / (c.tp + c.fp + c.fn + c.tn);
    return { precision: precision, recall: recall, f1: f1, acc: acc };
  }

  function cost(c, fpCost, fnCost) { return c.fp * fpCost + c.fn * fnCost; }

  function sweep(fpCost, fnCost) {
    var bestF1 = { t: 0.5, f1: -1 }, bestCost = { t: 0.5, cost: Infinity };
    for (var t = 0.02; t <= 0.98; t += 0.01) {
      var c = confusion(t), m = metrics(c), k = cost(c, fpCost, fnCost);
      if (m.f1 > bestF1.f1) bestF1 = { t: t, f1: m.f1 };
      if (k < bestCost.cost) bestCost = { t: t, cost: k };
    }
    return { f1: bestF1, cost: bestCost };
  }

  /* ---------- judge-calibration data (24 answers, scripted biases) ---------- */
  /* human: 1 = a human grader called the answer good. len = words.
     The scripted judge scores quality PLUS a verbosity bonus - the documented bias. */

  var JUDGE = [
    { len: 210, human: 0, q: 2.0 }, { len: 45,  human: 1, q: 4.4 },
    { len: 260, human: 0, q: 2.2 }, { len: 65,  human: 1, q: 4.1 },
    { len: 240, human: 0, q: 2.4 }, { len: 55,  human: 1, q: 4.5 },
    { len: 230, human: 0, q: 2.1 }, { len: 80,  human: 1, q: 3.9 },
    { len: 250, human: 0, q: 2.5 }, { len: 40,  human: 1, q: 4.6 },
    { len: 220, human: 0, q: 2.3 }, { len: 70,  human: 1, q: 4.2 },
    { len: 190, human: 1, q: 4.0 }, { len: 150, human: 0, q: 2.4 },
    { len: 60,  human: 0, q: 1.8 }, { len: 200, human: 1, q: 3.8 },
    { len: 90,  human: 1, q: 4.3 }, { len: 170, human: 0, q: 2.3 },
    { len: 110, human: 1, q: 4.0 }, { len: 180, human: 0, q: 2.2 },
    { len: 50,  human: 1, q: 4.4 }, { len: 120, human: 1, q: 3.3 },
    { len: 130, human: 0, q: 3.8 }, { len: 100, human: 1, q: 3.4 }
  ];

  function judgeScore(row, normalized) {
    var raw = row.q + (normalized ? 0 : 0.009 * row.len);
    return Math.min(5, Math.max(1, raw));
  }

  function judgeStats(normalized) {
    var agree = 0, flippedGoodLong = 0;
    JUDGE.forEach(function (r) {
      var verdictGood = judgeScore(r, normalized) >= 3.6;
      if (verdictGood === (r.human === 1)) agree++;
      if (verdictGood && r.human === 0 && r.len >= 130) flippedGoodLong++;
    });
    return { agree: agree, total: JUDGE.length, pct: Math.round(100 * agree / JUDGE.length), longWins: flippedGoodLong };
  }

  /* ---------- shared ---------- */

  function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function pct(x) { return (100 * x).toFixed(1) + "%"; }

  function railThreshold() {
    var p = document.createElement("p");
    p.className = "ag-rail";
    p.textContent = "Every number here is computed live in your browser from 2,000 embedded Lumen sessions (deterministic seed 42, ~3.2% converters - the intro-ML course's dataset). The model scores are a fixed classifier's outputs; the thresholding, the metrics, and the dollars are the real math.";
    return p;
  }
  function railJudge() {
    var p = document.createElement("p");
    p.className = "ag-rail";
    p.textContent = "The judge is a scripted simulation of the verbosity bias documented in Zheng et al. 2023; the human labels are fixed. The agreement statistics are computed live from the 24 graded answers.";
    return p;
  }

  /* ---------- threshold mode ---------- */

  function wireThreshold(block) {
    block.classList.add("evalbox-ready");
    var thresh = parseFloat(block.getAttribute("data-thresh") || "0.5");
    var costsAttr = block.getAttribute("data-costs");
    var costs = (costsAttr === null || costsAttr === "" ? "2,74" : costsAttr).split(",");
    var fpCost = parseFloat(costs[0]), fnCost = parseFloat(costs[1]);

    var bar = document.createElement("div");
    bar.className = "sql-bar";
    bar.innerHTML = '<span class="sql-dot"></span><span class="sql-title">Lumen conversion model - 2,000-session evaluation slice</span>';
    block.appendChild(bar);

    var ctrl = document.createElement("div");
    ctrl.className = "ev-ctrl";
    ctrl.innerHTML =
      '<label class="ev-lab">Threshold <b class="ev-tval"></b></label>' +
      '<input class="ev-slider" type="range" min="0.02" max="0.98" step="0.01" value="' + thresh + '">' +
      '<label class="ev-lab">FP cost $<input class="ev-num ev-fp" type="number" min="0" step="1" value="' + fpCost + '"></label>' +
      '<label class="ev-lab">FN cost $<input class="ev-num ev-fn" type="number" min="0" step="1" value="' + fnCost + '"></label>' +
      '<button type="button" class="sql-btn ev-optf1">Optimize F1</button>' +
      '<button type="button" class="sql-btn sql-run ev-optcost">Optimize $</button>';
    block.appendChild(ctrl);

    var tiles = document.createElement("div"); tiles.className = "ev-tiles";
    block.appendChild(tiles);
    var matrix = document.createElement("div"); matrix.className = "ev-matrix";
    block.appendChild(matrix);
    var verdict = document.createElement("div");
    block.appendChild(verdict);
    block.appendChild(railThreshold());

    var slider = ctrl.querySelector(".ev-slider");
    var tval = ctrl.querySelector(".ev-tval");
    var fpIn = ctrl.querySelector(".ev-fp"), fnIn = ctrl.querySelector(".ev-fn");

    function render(mode) {
      var t = parseFloat(slider.value);
      fpCost = parseFloat(fpIn.value) || 0; fnCost = parseFloat(fnIn.value) || 0;
      tval.textContent = t.toFixed(2);
      var c = confusion(t), m = metrics(c), k = cost(c, fpCost, fnCost);
      var s = sweep(fpCost, fnCost);
      tiles.innerHTML =
        '<div class="ev-tile"><b>' + pct(m.acc) + '</b><span>accuracy</span></div>' +
        '<div class="ev-tile"><b>' + pct(m.precision) + '</b><span>precision</span></div>' +
        '<div class="ev-tile"><b>' + pct(m.recall) + '</b><span>recall</span></div>' +
        '<div class="ev-tile"><b>' + m.f1.toFixed(3) + '</b><span>F1</span></div>' +
        '<div class="ev-tile ev-money"><b>' + money(k) + '</b><span>error cost on this slice</span></div>';
      matrix.innerHTML =
        '<span class="ev-cell ev-good">TP ' + c.tp + '</span>' +
        '<span class="ev-cell ev-bad">FP ' + c.fp + ' (' + money(c.fp * fpCost) + ')</span>' +
        '<span class="ev-cell ev-bad">FN ' + c.fn + ' (' + money(c.fn * fnCost) + ')</span>' +
        '<span class="ev-cell">TN ' + c.tn + '</span>';
      var regret = k - s.cost.cost;
      if (mode === "f1") {
        verdict.className = "ag-verdict ag-fail";
        verdict.textContent = "F1 maximized (" + m.f1.toFixed(3) + " at t=" + t.toFixed(2) + ") - and the error cost is " + money(k) + ", which is " + money(regret) + " WORSE than the cost-optimal threshold (t=" + s.cost.t.toFixed(2) + ", " + money(s.cost.cost) + "). The metric went up. The money went down. Goodhart, live.";
      } else if (mode === "cost") {
        verdict.className = "ag-verdict ag-pass";
        verdict.textContent = "Cost minimized: " + money(k) + " at t=" + t.toFixed(2) + ". Note F1 here is " + m.f1.toFixed(3) + " - lower than the F1-optimal " + s.f1.f1.toFixed(3) + ". The best business threshold is rarely the best-looking metric. Your costs (FP $" + fpCost + ", FN $" + fnCost + ") made this decision - change them and re-optimize.";
      } else {
        verdict.className = "ag-verdict ag-quiet";
        verdict.textContent = "";
      }
    }

    slider.addEventListener("input", function () { render(); });
    fpIn.addEventListener("input", function () { render(); });
    fnIn.addEventListener("input", function () { render(); });
    ctrl.querySelector(".ev-optf1").addEventListener("click", function () {
      var s = sweep(parseFloat(fpIn.value) || 0, parseFloat(fnIn.value) || 0);
      slider.value = s.f1.t.toFixed(2); render("f1");
    });
    ctrl.querySelector(".ev-optcost").addEventListener("click", function () {
      var s = sweep(parseFloat(fpIn.value) || 0, parseFloat(fnIn.value) || 0);
      slider.value = s.cost.t.toFixed(2); render("cost");
    });
    render();
  }

  /* ---------- judge mode ---------- */

  function wireJudge(block) {
    block.classList.add("evalbox-ready");

    var bar = document.createElement("div");
    bar.className = "sql-bar";
    bar.innerHTML = '<span class="sql-dot"></span><span class="sql-title">LLM-as-judge vs 24 human labels - calibration check</span>';
    block.appendChild(bar);

    var ctrl = document.createElement("div");
    ctrl.className = "ev-ctrl";
    ctrl.innerHTML =
      '<button type="button" class="sql-btn sql-run ev-raw">Raw judge</button>' +
      '<button type="button" class="sql-btn ev-norm">Length-controlled judge</button>';
    block.appendChild(ctrl);

    var tiles = document.createElement("div"); tiles.className = "ev-tiles";
    block.appendChild(tiles);
    var table = document.createElement("div"); table.className = "ag-score-table";
    block.appendChild(table);
    var verdict = document.createElement("div");
    block.appendChild(verdict);
    block.appendChild(railJudge());

    function render(normalized) {
      var st = judgeStats(normalized);
      tiles.innerHTML =
        '<div class="ev-tile"><b>' + st.pct + '%</b><span>agreement with humans</span></div>' +
        '<div class="ev-tile"><b>' + st.longWins + '</b><span>bad-but-long answers rated good</span></div>' +
        '<div class="ev-tile"><b>' + (normalized ? "controlled" : "uncontrolled") + '</b><span>verbosity bias</span></div>';
      table.innerHTML = "";
      JUDGE.forEach(function (r, i) {
        var js = judgeScore(r, normalized);
        var verdictGood = js >= 3.6;
        var ok = verdictGood === (r.human === 1);
        var row = document.createElement("div");
        row.className = "ag-score-row " + (ok ? "ag-row-pass" : "ag-row-fail");
        row.innerHTML =
          '<span class="ag-mark">' + (ok ? "✓" : "✗") + "</span>" +
          '<span class="ag-q">Answer ' + (i + 1) + ' · ' + r.len + ' words · human says ' + (r.human ? "good" : "bad") + '</span>' +
          '<span class="ag-out">judge: ' + js.toFixed(1) + '/5 → ' + (verdictGood ? "good" : "bad") + (ok ? "" : " (disagrees)") + '</span>';
        table.appendChild(row);
      });
      if (normalized) {
        verdict.className = "ag-verdict ag-pass";
        verdict.textContent = "PASS-ish - agreement " + st.pct + "%. Controlling for length removed the SYSTEMATIC failure; the few remaining misses are genuine borderline calls, which no grader escapes. This is what calibration means: you do not TRUST a judge, you MEASURE it against humans, find its bias, and correct or constrain it.";
      } else {
        verdict.className = "ag-verdict ag-fail";
        verdict.textContent = "FAIL - agreement only " + st.pct + "%, and every miss has the same shape: long answers rated good regardless of quality (verbosity bias, documented in Zheng et al. 2023). A judge score is a model output, not a measurement.";
      }
    }

    ctrl.querySelector(".ev-raw").addEventListener("click", function () { render(false); });
    ctrl.querySelector(".ev-norm").addEventListener("click", function () { render(true); });
    render(false);
  }

  /* ---------- boot ---------- */

  function boot() {
    var blocks = document.querySelectorAll(".evalbox");
    Array.prototype.forEach.call(blocks, function (block) {
      if (block.classList.contains("evalbox-ready")) return;
      var mode = block.getAttribute("data-mode") || "threshold";
      if (mode === "judge") wireJudge(block); else wireThreshold(block);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
