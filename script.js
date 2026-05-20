function calculateKinematics(t, nominalRate, inflation, principal, monthlyDeposit, target) {
    const r_real = ((1 + nominalRate) / (1 + inflation)) - 1;
    const r = r_real > 0 ? r_real : 0.0001; 
    
    const P = principal;
    const PMT = monthlyDeposit * 12; 
    const C = P + (PMT / r);
    const lnA = Math.log(1 + r);

    const balance = C * Math.pow(1 + r, t) - (PMT / r);
    const velocity = C * lnA * Math.pow(1 + r, t);
    const acceleration = C * Math.pow(lnA, 2) * Math.pow(1 + r, t);

    const path = [];
    const contributionsPath = [];
    const targetLine = [];
    
    for (let i = 0; i <= 40; i += 1) {
        const val = C * Math.pow(1 + r, i) - (PMT / r);
        const totalContributions = P + (PMT * i);
        
        path.push({ x: i, y: val });
        contributionsPath.push({ x: i, y: totalContributions });
        targetLine.push({ x: i, y: target });
    }

    let yearsToTarget = null;
    const numerator = target + (PMT / r);
    if (numerator > 0 && C > 0) {
        const targetT = Math.log(numerator / C) / lnA;
        if (targetT > 0 && targetT < 100) {
            yearsToTarget = targetT;
        }
    }

    return {
        current: { balance, velocity, acceleration },
        path,
        contributionsPath,
        targetLine,
        yearsToTarget,
        realRate: r
    };
}

const ctx = document.getElementById('mainChart').getContext('2d');
const mainChart = new Chart(ctx, {
    type: 'line',
    data: {
        datasets: [
            {
                label: 'Cumulative Contributions',
                data: [],
                borderColor: '#cbd5e0',
                borderWidth: 2,
                pointRadius: 0,
                fill: 'origin',
                backgroundColor: 'rgba(160, 174, 192, 0.25)', // Neutral gray baseline layer
                tension: 0.4
            },
            {
                label: 'Compound Growth',
                data: [],
                borderColor: '#4472c4',
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 6,
                fill: '-1', // Fills the space dynamically between this line and the contributions dataset below it
                backgroundColor: 'rgba(68, 114, 196, 0.25)', // Rich blue compounding growth layer
                tension: 0.4 
            }, 
            {
                label: 'Target Wealth',
                data: [],
                borderColor: '#2ecc71',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                pointHoverRadius: 6,
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
        interaction: {
            mode: 'index',
            intersect: false
        },
        scales: {
            x: { type: 'linear', position: 'bottom', min: 0, max: 40, title: { display: true, text: 'Years', font: { weight: 'bold' } } },
            y: { 
                beginAtZero: true, 
                ticks: { 
                    callback: function(v) {
                        if (v >= 1000000) {
                            return '$' + (v / 1000000).toFixed(1) + 'M';
                        } else if (v >= 1000) {
                            return '$' + (v / 1000).toFixed(0) + 'K';
                        }
                        return '$' + v;
                    }
                } 
            }
        },
        plugins: { 
            legend: { 
                display: true, 
                position: 'top', 
                labels: { 
                    filter: item => item.text !== 'Current Position' 
                } 
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const datasetIndex = context.datasetIndex;
                        const dataIndex = context.dataIndex;
                        
                        // Guard clause to ensure arrays are fully initialized
                        if (!context.chart.data.datasets[0].data[dataIndex] || !context.chart.data.datasets[1].data[dataIndex]) {
                            return '';
                        }
                        
                        const contribVal = context.chart.data.datasets[0].data[dataIndex].y;
                        const totalBal = context.chart.data.datasets[1].data[dataIndex].y;
                        const growthVal = Math.max(0, totalBal - contribVal);

                        if (datasetIndex === 0) {
                            return [
                                `Cumulative Contributions: $${Math.round(contribVal).toLocaleString()}`,
                                `  ↳ Base Layer: Your principal out-of-pocket savings.`
                            ];
                        } else if (datasetIndex === 1) {
                            return [
                                `Compound Growth: $${Math.round(growthVal).toLocaleString()}`,
                                `  ↳ Top Layer: Exponential earnings generated via compounding interest.`,
                                `Total Real Wealth: $${Math.round(totalBal).toLocaleString()}`
                            ];
                        } else if (datasetIndex === 2) {
                            return [
                                `Target Wealth: $${Math.round(context.parsed.y).toLocaleString()}`,
                                `  ↳ Horizon Marker: Your constant target milestone.`
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
    if (results.yearsToTarget) {
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
