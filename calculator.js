// Global variables
let currentScheduleView = 'yearly';
let paymentChart = null;
let balanceChart = null;

// Initialize calculator
document.addEventListener('DOMContentLoaded', function() {
    initializeCalculator();
    setupEventListeners();
    calculateLoan(); // Initial calculation
});

function initializeCalculator() {
    updateDownPaymentDisplay();
}

function setupEventListeners() {
    // Input changes
    document.getElementById('landPrice').addEventListener('input', handleInputChange);
    document.getElementById('downPayment').addEventListener('input', updateDownPaymentDisplay);
    document.getElementById('downPayment').addEventListener('input', handleInputChange);
    document.getElementById('interestRate').addEventListener('input', handleInputChange);
    document.getElementById('loanTerm').addEventListener('change', handleInputChange);
    
    // Advanced options inputs
    document.getElementById('propertyTax').addEventListener('input', handleInputChange);
    document.getElementById('insurance').addEventListener('input', handleInputChange);
    document.getElementById('closingCosts').addEventListener('input', handleInputChange);
    document.getElementById('surveyFee').addEventListener('input', handleInputChange);
    document.getElementById('extraPayment').addEventListener('input', handleInputChange);

    // Buttons
    document.getElementById('calculateBtn').addEventListener('click', calculateLoan);
    document.getElementById('resetBtn').addEventListener('click', resetCalculator);
    document.getElementById('toggleAdvanced').addEventListener('click', toggleAdvancedOptions);

    // Schedule view buttons
    document.querySelectorAll('.schedule-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.schedule-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentScheduleView = this.dataset.view;
            generateAmortizationSchedule();
        });
    });
}

function handleInputChange() {
    // Auto-calculate on input change for better UX
    calculateLoan();
}

function updateDownPaymentDisplay() {
    const landPrice = parseFloat(document.getElementById('landPrice').value) || 0;
    const downPaymentPercent = parseFloat(document.getElementById('downPayment').value);
    const downPaymentAmount = (landPrice * downPaymentPercent / 100);
    
    document.getElementById('downPaymentValue').textContent = downPaymentPercent + '%';
    document.getElementById('downPaymentAmount').textContent = '$' + formatNumber(downPaymentAmount);
}

function toggleAdvancedOptions() {
    const advancedOptions = document.getElementById('advancedOptions');
    const isVisible = advancedOptions.style.display !== 'none';
    advancedOptions.style.display = isVisible ? 'none' : 'block';
    
    const btn = document.getElementById('toggleAdvanced');
    btn.textContent = isVisible ? '⚙️ Advanced Options' : '🔼 Hide Advanced Options';
}

function calculateLoan() {
    // Get input values
    const landPrice = parseFloat(document.getElementById('landPrice').value) || 0;
    const downPaymentPercent = parseFloat(document.getElementById('downPayment').value) || 0;
    const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
    const loanTerm = parseInt(document.getElementById('loanTerm').value) || 0;
    
    const propertyTax = parseFloat(document.getElementById('propertyTax').value) || 0;
    const insurance = parseFloat(document.getElementById('insurance').value) || 0;
    const closingCosts = parseFloat(document.getElementById('closingCosts').value) || 0;
    const surveyFee = parseFloat(document.getElementById('surveyFee').value) || 0;
    const extraPayment = parseFloat(document.getElementById('extraPayment').value) || 0;

    // Calculate loan amount
    const downPaymentAmount = landPrice * (downPaymentPercent / 100);
    const loanAmount = landPrice - downPaymentAmount;

    // Calculate monthly payment (P&I only)
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    
    let monthlyPayment = 0;
    if (monthlyRate > 0) {
        monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    } else {
        monthlyPayment = loanAmount / numberOfPayments;
    }

    // Calculate total costs
    const monthlyTax = propertyTax / 12;
    const monthlyInsurance = insurance / 12;
    const totalMonthlyCost = monthlyPayment + monthlyTax + monthlyInsurance;

    // Calculate with extra payments
    const scheduleData = calculateAmortization(loanAmount, monthlyRate, numberOfPayments, extraPayment);
    const totalInterest = scheduleData.totalInterest;
    const actualPayoffMonths = scheduleData.actualMonths;

    const totalCost = loanAmount + totalInterest + closingCosts + surveyFee;
    const totalUpfrontCosts = downPaymentAmount + closingCosts + surveyFee;

    // Calculate payoff date
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + actualPayoffMonths);

    // Display results
    document.getElementById('monthlyPayment').textContent = '$' + formatNumber(monthlyPayment);
    document.getElementById('totalMonthlyCost').textContent = '$' + formatNumber(totalMonthlyCost);
    document.getElementById('loanAmount').textContent = '$' + formatNumber(loanAmount);
    document.getElementById('totalInterest').textContent = '$' + formatNumber(totalInterest);
    document.getElementById('totalCost').textContent = '$' + formatNumber(totalCost);
    document.getElementById('payoffDate').textContent = payoffDate.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
    });

    // Update payment breakdown
    updatePaymentBreakdown({
        principal: monthlyPayment,
        propertyTax: monthlyTax,
        insurance: monthlyInsurance,
        extraPayment: extraPayment,
        totalUpfront: totalUpfrontCosts
    });

    // Update charts
    updateCharts(loanAmount, totalInterest, scheduleData);

    // Generate amortization schedule
    generateAmortizationSchedule();
}

function calculateAmortization(principal, monthlyRate, totalMonths, extraPayment) {
    let balance = principal;
    let totalInterest = 0;
    let month = 0;
    const schedule = [];

    let regularPayment = 0;
    if (monthlyRate > 0) {
        regularPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
                        (Math.pow(1 + monthlyRate, totalMonths) - 1);
    } else {
        regularPayment = principal / totalMonths;
    }

    while (balance > 0.01 && month < totalMonths * 2) { // Limit to prevent infinite loops
        month++;
        const interestPayment = balance * monthlyRate;
        let principalPayment = regularPayment - interestPayment + extraPayment;
        
        if (principalPayment > balance) {
            principalPayment = balance;
        }

        balance -= principalPayment;
        totalInterest += interestPayment;

        schedule.push({
            month: month,
            payment: regularPayment + extraPayment,
            principal: principalPayment,
            interest: interestPayment,
            balance: Math.max(0, balance)
        });

        if (balance <= 0) break;
    }

    return {
        schedule: schedule,
        totalInterest: totalInterest,
        actualMonths: month
    };
}

function updatePaymentBreakdown(data) {
    const breakdownHTML = `
        <div class="breakdown-item">
            <strong>Monthly Payment (P&I):</strong>
            <span>$${formatNumber(data.principal)}</span>
        </div>
        <div class="breakdown-item">
            <strong>Property Tax (Monthly):</strong>
            <span>$${formatNumber(data.propertyTax)}</span>
        </div>
        <div class="breakdown-item">
            <strong>Insurance (Monthly):</strong>
            <span>$${formatNumber(data.insurance)}</span>
        </div>
        ${data.extraPayment > 0 ? `
        <div class="breakdown-item">
            <strong>Extra Payment:</strong>
            <span>$${formatNumber(data.extraPayment)}</span>
        </div>` : ''}
        <div class="breakdown-item" style="background: linear-gradient(135deg, #2c5f2d, #97bc62); color: white; font-size: 1.1rem;">
            <strong>Total Monthly:</strong>
            <span>$${formatNumber(data.principal + data.propertyTax + data.insurance + data.extraPayment)}</span>
        </div>
        <div class="breakdown-item" style="background: #fff3cd; margin-top: 1rem;">
            <strong>Upfront Costs:</strong>
            <span>$${formatNumber(data.totalUpfront)}</span>
        </div>
    `;
    document.getElementById('paymentBreakdown').innerHTML = breakdownHTML;
}

function updateCharts(loanAmount, totalInterest, scheduleData) {
    // Payment Breakdown Pie Chart
    const paymentCtx = document.getElementById('paymentChart').getContext('2d');
    
    if (paymentChart) {
        paymentChart.destroy();
    }

    paymentChart = new Chart(paymentCtx, {
        type: 'doughnut',
        data: {
            labels: ['Principal', 'Total Interest'],
            datasets: [{
                data: [loanAmount, totalInterest],
                backgroundColor: ['#2c5f2d', '#f4a259'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Total Cost Breakdown',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });

    // Balance Over Time Line Chart
    const balanceCtx = document.getElementById('balanceChart').getContext('2d');
    
    if (balanceChart) {
        balanceChart.destroy();
    }

    // Sample every 12 months for better visualization
    const sampledData = scheduleData.schedule.filter((item, index) => index % 12 === 0 || index === scheduleData.schedule.length - 1);
    
    balanceChart = new Chart(balanceCtx, {
        type: 'line',
        data: {
            labels: sampledData.map(item => 'Year ' + Math.ceil(item.month / 12)),
            datasets: [{
                label: 'Remaining Balance',
                data: sampledData.map(item => item.balance),
                borderColor: '#2c5f2d',
                backgroundColor: 'rgba(44, 95, 45, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Loan Balance Over Time',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function generateAmortizationSchedule() {
    const landPrice = parseFloat(document.getElementById('landPrice').value) || 0;
    const downPaymentPercent = parseFloat(document.getElementById('downPayment').value) || 0;
    const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
    const loanTerm = parseInt(document.getElementById('loanTerm').value) || 0;
    const extraPayment = parseFloat(document.getElementById('extraPayment').value) || 0;

    const downPaymentAmount = landPrice * (downPaymentPercent / 100);
    const loanAmount = landPrice - downPaymentAmount;
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;

    const scheduleData = calculateAmortization(loanAmount, monthlyRate, numberOfPayments, extraPayment);
    const tbody = document.getElementById('amortizationBody');
    tbody.innerHTML = '';

    if (currentScheduleView === 'yearly') {
        // Yearly view
        let yearData = {};
        scheduleData.schedule.forEach(item => {
            const year = Math.ceil(item.month / 12);
            if (!yearData[year]) {
                yearData[year] = {
                    payment: 0,
                    principal: 0,
                    interest: 0,
                    endingBalance: 0
                };
            }
            yearData[year].payment += item.payment;
            yearData[year].principal += item.principal;
            yearData[year].interest += item.interest;
            yearData[year].endingBalance = item.balance;
        });

        Object.keys(yearData).forEach(year => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>Year ${year}</td>
                <td>$${formatNumber(yearData[year].payment)}</td>
                <td>$${formatNumber(yearData[year].principal)}</td>
                <td>$${formatNumber(yearData[year].interest)}</td>
                <td>$${formatNumber(yearData[year].endingBalance)}</td>
            `;
        });
    } else {
        // Monthly view - limit to first 60 months for performance
        const monthsToShow = Math.min(scheduleData.schedule.length, 60);
        for (let i = 0; i < monthsToShow; i++) {
            const item = scheduleData.schedule[i];
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>Month ${item.month}</td>
                <td>$${formatNumber(item.payment)}</td>
                <td>$${formatNumber(item.principal)}</td>
                <td>$${formatNumber(item.interest)}</td>
                <td>$${formatNumber(item.balance)}</td>
            `;
        }
        
        if (scheduleData.schedule.length > 60) {
            const row = tbody.insertRow();
            row.innerHTML = `<td colspan="5" style="text-align: center; color: #6c757d;">Showing first 60 months. Switch to yearly view to see complete schedule.</td>`;
        }
    }
}

function resetCalculator() {
    document.getElementById('landPrice').value = '100000';
    document.getElementById('downPayment').value = '20';
    document.getElementById('interestRate').value = '7.5';
    document.getElementById('loanTerm').value = '15';
    document.getElementById('propertyTax').value = '1200';
    document.getElementById('insurance').value = '500';
    document.getElementById('closingCosts').value = '3000';
    document.getElementById('surveyFee').value = '1500';
    document.getElementById('extraPayment').value = '0';
    
    updateDownPaymentDisplay();
    calculateLoan();
}

function formatNumber(num) {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

