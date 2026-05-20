function calculateKinematics(t, nominalRate, inflation, principal, monthlyDeposit, target) {
    // Fisher Equation for exact real rate of return
    const r = ((1 + nominalRate) / (1 + inflation)) - 1;
    
    const P = principal;
    const PMT = monthlyDeposit * 12; // Annualized deposit stream
    
    let balance, velocity, acceleration;
    const lnA = (r > -1 && r !== 0) ? Math.log(1 + r) : 0;

    // 1. Handle the Linear Case: 0% exact real net return (Nominal Rate == Inflation Drag)
    if (Math.abs(r) < 1e-7) {
        balance = P + PMT * t;
        velocity = PMT;
        acceleration = 0;
    } else {
        // 2. Handle Exponential Cases (Both positive and negative real interest rates)
        const C = P + (PMT / r);
        balance = C * Math.pow(1 + r, t) - (PMT / r);
        velocity = C * lnA * Math.pow(1 + r, t);
        acceleration = C * Math.pow(lnA, 2) * Math.pow(1 + r, t);
    }

    const path = [];
    const contributionsPath = [];
    const targetLine = [];
    
    // Generate standard chart trajectory data points
    for (let i = 0; i <= 40; i += 1) {
        let val;
        if (Math.abs(r) < 1e-7) {
            val = P + PMT * i;
        } else {
            val = (P + (PMT / r)) * Math.pow(1 + r, i) - (PMT / r);
        }
        const totalContributions = P + (PMT * i);
        
        path.push({ x: i, y: val });
        contributionsPath.push({ x: i, y: totalContributions });
        targetLine.push({ x: i, y: target });
    }

    // Calculate exact timeframe required to reach the Target Milestone
    let yearsToTarget = null;
    if (P >= target) {
        yearsToTarget = 0;
    } else if (Math.abs(r) < 1e-7) {
        if (PMT > 0) {
            const targetT = (target - P) / PMT;
            if (targetT >= 0) yearsToTarget = targetT;
        }
    } else {
        const C = P + (PMT / r);
        const numerator = target + (PMT / r);
        if (C > 0 && numerator > 0) {
            const targetT = Math.log(numerator / C) / lnA;
            if (targetT >= 0 && targetT < 100) {
                yearsToTarget = targetT;
            }
        }
    }

    // Solve for Compounding Crossover: Instantaneous Annual Interest Growth == Annual Deposits
    let crossoverYear = null;
    if (r > 0 && PMT > 0) {
        const C = P + (PMT / r);
        const argument = (2 * PMT) / (r * C);
        if (argument > 0) {
            const tCross = Math.log(argument) / lnA;
            if (tCross >= 0 && tCross <= 40) {
                crossoverYear = tCross;
            } else if (tCross < 0) {
                // If interest growth already dominates out-of-pocket savings at Year 0
                crossoverYear = 0;
            }
        }
    }

    return {
        current: { balance, velocity, acceleration },
        path,
        contributionsPath,
        targetLine,
        yearsToTarget,
        crossoverYear,
        realRate: r
    };
}

// Inline Canvas Plugin to render the Crossover vertical line cleanly
const crossoverPlugin = {
    id: 'crossoverLine',
    afterDraw: (chart) => {
        const options = chart.config.options.plugins.crossoverLine;
        if (options && options.xVal !== null) {
            const xVal = options.xVal;
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;
            
            if (xVal >= xAxis.min && xVal <= xAxis.max) {
                const xPixel = xAxis.getPixelForValue(xVal);
                const topY = yAxis.top;
                const bottomY = yAxis.bottom;
                const ctx = chart.ctx;
                
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([6, 4]);
                ctx.moveTo(xPixel, topY);
                ctx.lineTo(xPixel, bottomY);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#e74c3c'; 
                ctx.stroke();
                
                const textSpace = 8;
                ctx.font = 'bold 11px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
                
                if (xPixel + 130 > xAxis.right) {
                    ctx.textAlign = 'right';
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillText('⚡ Compounding Crossover', xPixel - textSpace, topY + 15);
                    ctx.font = '10px sans-serif';
                    ctx.fillStyle = '#555';
                    ctx.fillText(`Year ${xVal.toFixed(1)} (Growth ≥ Deposits)`, xPixel - textSpace, topY + 30);
                } else {
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillText('⚡ Compounding Crossover', xPixel + textSpace, topY + 15);
                    ctx.font = '10px sans-serif';
                    ctx.fillStyle = '#555';
                    ctx.fillText(`Year ${xVal.toFixed(1)} (Growth ≥ Deposits)`, xPixel + textSpace, topY + 30);
                }
                ctx.restore();
            }
        }
    }
};

const ctx = document.getElementById('mainChart').getContext('2d');
const mainChart = new Chart(ctx, {
    type: 'line',
    plugins: [crossoverPlugin],
    data: {
        datasets: [
            {
                label: 'Cumulative Contributions',
                data: [],
                borderColor: '#cbd5e0',
                borderWidth: 2,
                pointRadius: 0,
                fill: 'origin',
                backgroundColor: 'rgba(160, 174, 192, 0.25)', 
                tension: 0.4
            },
            {
                label: 'Compound Growth',
                data: [],
                borderColor: '#4472c4',
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 6,
                fill: '-1', 
                backgroundColor: 'rgba(68, 114, 196, 0.25)', 
                tension: 0.4 
            }, 
            {
                label: 'Target Wealth',
                data: [],
                borderColor: '#2ecc71',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            },
            {
                label: 'Current Position',
                data: [{x: 0, y: 0}],
                backgroundColor: '#ed7d31',
                borderColor: '#fff',
                borderWidth: 2,
                pointRadius: 8,
                pointHoverRadius: 10,
                type: 'scatter'
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: { type: 'linear', position: 'bottom', min: 0, max: 40, title: { display: true, text: 'Years', font: { weight: 'bold' } } },
            y: { 
                beginAtZero: true, 
                ticks: { 
                    callback: function(v) {
                        if (v >= 1000000) return '$' + (v / 1000000).toFixed(1) + 'M';
                        if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
                        return '$' + v;
                    }
                } 
            }
        },
        plugins: { 
            legend: { 
                display: true, 
                position: 'top', 
                labels: { filter: item => item.text !== 'Current Position' } 
            },
            crossoverLine: { xVal: null },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const datasetIndex = context.datasetIndex;
                        const dataIndex = context.dataIndex;
                        
                        if (!context.chart.data.datasets[0].data[dataIndex] || !context.chart.data.datasets[1].data[dataIndex]) {
                            return '';
                        }
                        
                        const contribVal = context.chart.data.datasets[0].data[dataIndex].y;
                        const totalBal = context.chart.data.datasets[1].data[dataIndex].y;
                        const growthVal = totalBal - contribVal;

                        if (datasetIndex === 0) {
                            return [
                                `Cumulative Contributions: $${Math.round(contribVal).toLocaleString()}`,
                                `   ↳ Base Layer: Your principal out-of-pocket savings.`
                            ];
                        } else if (datasetIndex === 1) {
                            return [
                                `Compound Growth: $${Math.round(growthVal).toLocaleString()}`,
                                `   ↳ Top Layer: Exponential earnings generated via compounding interest.`,
                                `Total Real Wealth: $${Math.round(totalBal).toLocaleString()}`
                            ];
                        } else if (datasetIndex === 2) {
                            return [
                                `Target Wealth: $${Math.round(context.parsed.y).toLocaleString()}`,
                                `   ↳ Horizon Marker: Your constant target milestone.`
                            ];
                        }
                        return null;
                    }
                }
            }
        }
    }
});

const controlPairs = [
    { slider: document.getElementById('yearSlider'), input: document.getElementById('yearInput') },
    { slider: document.getElementById('rateSlider'), input: document.getElementById('rateInput') },
    { slider: document.getElementById('infSlider'), input: document.getElementById('infInput') },
    { slider: document.getElementById('principalSlider'), input: document.getElementById('principalInput') },
    { slider: document.getElementById('depositSlider'), input: document.getElementById('depositInput') },
    { slider: document.getElementById('targetSlider'), input: document.getElementById('targetInput') }
];

function updateApp() {
    const t = parseFloat(document.getElementById('yearInput').value) || 0;
    const nominalRate = parseFloat(document.getElementById('rateInput').value) / 100 || 0;
    const inflation = parseFloat(document.getElementById('infInput').value) / 100 || 0;
    const principal = parseFloat(document.getElementById('principalInput').value) || 0;
    const deposit = parseFloat(document.getElementById('depositInput').value) || 0;
    const target = parseFloat(document.getElementById('targetInput').value) || 0;

    const results = calculateKinematics(t, nominalRate, inflation, principal, deposit, target);

    document.getElementById('balDisp').innerText = "$" + Math.round(results.current.balance).toLocaleString();
    document.getElementById('velDisp').innerText = "$" + Math.round(results.current.velocity).toLocaleString() + "/yr";
    document.getElementById('accDisp').innerText = "$" + Math.round(results.current.acceleration).toLocaleString() + "/yr²";
    
    const targetEl = document.getElementById('targetDisp');
    if (results.yearsToTarget !== null) {
        targetEl.innerText = results.yearsToTarget.toFixed(1) + " yrs";
        targetEl.style.color = "#2ecc71";
    } else {
        targetEl.innerText = "Unreachable";
        targetEl.style.color = "#e74c3c";
    }

    if (target < 1000000 && target > 0) {
        mainChart.options.scales.y.max = Math.max(target * 2.5, results.current.balance * 1.2, 50000);
    } else {
        mainChart.options.scales.y.max = undefined;
    }

    mainChart.options.plugins.crossoverLine.xVal = results.crossoverYear;
    mainChart.data.datasets[0].data = results.contributionsPath;
    mainChart.data.datasets[1].data = results.path;
    mainChart.data.datasets[2].data = results.targetLine;
    mainChart.data.datasets[3].data = [{ x: t, y: results.current.balance }];
    mainChart.update();
}

controlPairs.forEach(pair => {
    pair.slider.addEventListener('input', (e) => {
        pair.input.value = e.target.value;
        updateApp();
    });
    
    pair.input.addEventListener('input', (e) => {
        pair.slider.value = parseFloat(e.target.value) || 0;
        updateApp();
    });
});

updateApp();
