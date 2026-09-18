/*!
 * 뉴스프리존 공통 Chart Runtime
 * ------------------------------------------------------------
 * 배포 위치: 사이트 공통 템플릿(헤더/푸터 등 모든 기사 페이지에 공통으로 포함되는 영역) 1곳에만 로드.
 *           절대 기사 본문(CMS 에디터)에 붙여넣지 않는다.
 *
 * 로드 순서(템플릿에 아래 순서로 2개의 <script> 태그를 넣는다):
 *   1) Chart.js 라이브러리 (예: <script src=".../chart.umd.min.js" defer></script>)
 *   2) 이 파일 (<script src="/assets/js/chart-runtime.js" defer></script>)
 *
 * 동작: 페이지에서 class="cms-chart" 블록을 모두 찾아, 그 안의
 *   <script type="application/json" class="cms-chart-data"> 데이터를 읽고
 *   .cms-chart-canvas 위치에 실제 차트를 그린다.
 *   기사 본문에는 이 파일이 읽을 '데이터'만 있으면 되고, 실행 코드는 전혀 없어도 된다.
 *
 * 허용 JSON 필드: version, type, orientation, labels, datasets, unit, decimals,
 *                 source, note, yMin, yMax, showLegend, showValues
 *
 * datasets[] 안에서 막대마다 다른 색을 쓰고 싶을 때만 아래 필드를 추가로 쓸 수 있다(선택):
 *   - colors: ["blue","red",...]  data와 같은 길이의 색상 이름 배열. 막대마다 직접 지정.
 *   - colorMode: "diverging"      값이 0 이상이면 blue, 미만이면 red로 자동 구분.
 *                                 (colors를 함께 쓰면 colors가 우선 적용된다)
 *   허용 색상 이름: blue, orange, green, purple, red, gray
 *
 * (options/plugins/scales/ticks/font/grid 같은 Chart.js 세부 옵션은 기사 데이터에 없다고 가정하고,
 *  그런 필드가 와도 이 런타임은 읽지 않는다 — 디자인은 전부 여기서 중앙 관리한다.)
 */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") { fn(); }
    else { document.addEventListener("DOMContentLoaded", fn); }
  }

  function getPalette() {
    var dark = false;
    try {
      dark = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch (e) { dark = false; }

    return dark
      ? {
          text: "#ffffff", sub: "#c3c2b7", grid: "#2c2c2a", axis: "#383835",
          series: ["#3987e5", "#d95926", "#4caf6d", "#b48ee0"],
          danger: "#e66767"
        }
      : {
          text: "#0b0b0b", sub: "#52514e", grid: "#e1e0d9", axis: "#c3c2b7",
          series: ["#2a78d6", "#eb6834", "#2f9e5c", "#8a5fc2"],
          danger: "#d64545"
        };
  }

  // "colors"/"colorMode" 필드에서 쓸 수 있는 색상 이름 → 실제 팔레트 색상 매핑
  function namedColor(pal, name) {
    var map = {
      blue: pal.series[0],
      orange: pal.series[1],
      green: pal.series[2],
      purple: pal.series[3],
      red: pal.danger,
      gray: pal.sub
    };
    return map[name] || null;
  }

  function fmtValue(v, unit, decimals) {
    if (typeof v !== "number") { return String(v); }
    var n = typeof decimals === "number" ? v.toFixed(decimals) : String(v);
    return n + (unit || "");
  }

  // 막대 위에 값을 표시하는 경량 플러그인 (showValues:true 일 때만 동작)
  var valueLabelPlugin = {
    id: "cmsValueLabels",
    afterDatasetsDraw: function (chart) {
      var cfg = chart.$cmsConfig;
      if (!cfg || !cfg.showValues) { return; }
      var ctx = chart.ctx;
      var pal = getPalette();
      ctx.save();
      ctx.font = "600 12px system-ui, -apple-system, 'Segoe UI', sans-serif";

      chart.data.datasets.forEach(function (ds, dsIndex) {
        var meta = chart.getDatasetMeta(dsIndex);
        var bg = ds.backgroundColor;
        meta.data.forEach(function (el, i) {
          var raw = ds.data[i];
          var label = fmtValue(raw, cfg.unit, cfg.decimals);
          // 막대마다 색이 다르면(diverging/colors) 값 라벨도 같은 색으로 맞춘다.
          ctx.fillStyle = Array.isArray(bg) ? (bg[i] || pal.text) : pal.text;
          if (cfg.orientation === "horizontal") {
            // 가로 막대는 음수(왼쪽으로 뻗는 막대) 라벨을 막대 바깥쪽(왼쪽)에 붙인다.
            var isNeg = typeof raw === "number" && raw < 0;
            ctx.textAlign = isNeg ? "right" : "left";
            ctx.textBaseline = "middle";
            ctx.fillText(label, el.x + (isNeg ? -6 : 6), el.y);
          } else {
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText(label, el.x, el.y - 4);
          }
        });
      });
      ctx.restore();
    }
  };

  function renderOne(block) {
    var mount = block.querySelector(".cms-chart-canvas");
    var dataEl = block.querySelector('script.cms-chart-data[type="application/json"]');
    if (!mount || !dataEl || mount.dataset.cmsRendered) { return; }

    var cfg;
    try {
      cfg = JSON.parse(dataEl.textContent);
    } catch (e) {
      mount.textContent = "차트 데이터를 불러오지 못했습니다.";
      return;
    }

    if (typeof window.Chart === "undefined") {
      // Chart.js가 아직 로드되지 않았으면 잠시 후 재시도(로드 순서 어긋남 대비)
      setTimeout(function () { renderOne(block); }, 100);
      return;
    }

    mount.dataset.cmsRendered = "1";
    mount.innerHTML = "";
    var canvasWrap = document.createElement("div");
    canvasWrap.style.position = "relative";
    canvasWrap.style.height = "300px";
    canvasWrap.style.width = "100%";
    var canvas = document.createElement("canvas");
    canvasWrap.appendChild(canvas);
    mount.appendChild(canvasWrap);

    var pal = getPalette();
    var horizontal = cfg.orientation === "horizontal";
    var decimals = typeof cfg.decimals === "number" ? cfg.decimals : 0;
    var unit = cfg.unit || "";

    var datasets = (cfg.datasets || []).map(function (ds, i) {
      var data = ds.data || [];
      var baseColor = pal.series[i % pal.series.length];
      var backgroundColor = baseColor;

      if (Array.isArray(ds.colors) && ds.colors.length) {
        // 막대마다 지정한 색상 이름을 그대로 적용(부족하면 앞에서부터 반복)
        backgroundColor = data.map(function (v, idx) {
          return namedColor(pal, ds.colors[idx % ds.colors.length]) || baseColor;
        });
      } else if (ds.colorMode === "diverging") {
        // 값이 0 이상이면 파란색, 미만이면 빨간색으로 자동 구분
        backgroundColor = data.map(function (v) {
          return (typeof v === "number" && v < 0) ? (pal.danger || baseColor) : pal.series[0];
        });
      }

      return {
        label: ds.label || "",
        data: data,
        backgroundColor: backgroundColor,
        maxBarThickness: 44,
        borderSkipped: false,
        borderRadius: 4
      };
    });

    // Chart.js는 ticks.callback 등에 "값이 undefined인 키"가 그냥 있기만 해도
    // 카테고리 축의 기본 라벨 해석을 깨뜨린다. 그래서 해당 축에서 실제로 쓸 옵션만
    // 골라 담고, 안 쓰는 키(callback/min/max/beginAtZero)는 아예 넣지 않는다.
    function buildValueAxis(isValueAxis) {
      var axis = {
        grid: { color: pal.grid, drawTicks: false },
        border: { color: pal.axis },
        ticks: { color: pal.sub }
      };
      if (isValueAxis) {
        axis.beginAtZero = true;
        if (typeof cfg.yMin === "number") { axis.min = cfg.yMin; }
        if (typeof cfg.yMax === "number") { axis.max = cfg.yMax; }
        axis.ticks.callback = function (v) { return fmtValue(v, unit, decimals); };
      }
      return axis;
    }

    var chart = new window.Chart(canvas.getContext("2d"), {
      type: cfg.type === "line" ? "line" : "bar",
      data: { labels: cfg.labels || [], datasets: datasets },
      options: {
        indexAxis: horizontal ? "y" : "x",
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: horizontal ? { right: 70 } : { top: 24 } },
        scales: {
          x: buildValueAxis(horizontal),
          y: buildValueAxis(!horizontal)
        },
        plugins: {
          legend: { display: !!cfg.showLegend, labels: { color: pal.sub } },
          tooltip: {
            backgroundColor: pal.text === "#ffffff" ? "#1a1a19" : "#ffffff",
            titleColor: pal.text,
            bodyColor: pal.text,
            borderColor: pal.axis,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function (ctx) {
                var prefix = ctx.dataset.label ? ctx.dataset.label + ": " : "";
                return " " + prefix + fmtValue(ctx.raw, unit, decimals);
              }
            }
          }
        }
      },
      plugins: [valueLabelPlugin]
    });

    chart.$cmsConfig = cfg;
    chart.update();
  }

  function renderAll() {
    var blocks = document.querySelectorAll(".cms-chart");
    blocks.forEach ? blocks.forEach(renderOne) : Array.prototype.forEach.call(blocks, renderOne);
  }

  ready(renderAll);

  // 다크모드 전환 시 즉시 다시 그리기
  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      document.querySelectorAll(".cms-chart-canvas[data-cms-rendered]").forEach(function (el) {
        el.removeAttribute("data-cms-rendered");
        el.innerHTML = "";
      });
      renderAll();
    });
  } catch (e) { /* 구형 브라우저는 무시 */ }
})();
