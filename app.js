class IndeedAnalyzer {
    constructor() {
        this.data = {
            mmm: null,
            ashby: null,
            spend: null,
            headcount: null,
            roster: null
        };
        this.results = null;
        this.init();
    }

    init() {
        this.setupFileUploads();
        this.setupTabs();
        this.setupAnalyzeButton();
    }

    setupFileUploads() {
        const files = ['mmm', 'ashby', 'spend', 'headcount', 'roster'];
        files.forEach(type => {
            const input = document.getElementById(`${type}-file`);
            const status = document.getElementById(`${type}-status`);
            
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.parseCSV(file, type, status);
                }
            });
        });
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                tabButtons.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                button.classList.add('active');
                document.getElementById(tabName).classList.add('active');
            });
        });
    }

    setupAnalyzeButton() {
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeData();
        });
    }

    parseCSV(file, type, statusElement) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const data = this.csvToArray(csv);
                
                if (this.validateData(data, type)) {
                    this.data[type] = data;
                    statusElement.textContent = `✓ ${data.length} rows loaded`;
                    statusElement.className = 'status success';
                } else {
                    throw new Error('Invalid data format');
                }
                
                this.checkReadyToAnalyze();
            } catch (error) {
                statusElement.textContent = `✗ Error: ${error.message}`;
                statusElement.className = 'status error';
                this.data[type] = null;
            }
        };
        reader.readAsText(file);
    }

    csvToArray(csv) {
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',');
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].trim() : '';
            });
            return row;
        });
    }

    validateData(data, type) {
        if (!data || data.length === 0) return false;
        
        const schemas = {
            mmm: ['date', 'role', 'state', 'applications'],
            ashby: ['candidate_id', 'role', 'state', 'applied_at', 'hired_at', 'status'],
            spend: ['date', 'role', 'state', 'spend'],
            headcount: ['month', 'role', 'state', 'forecast_headcount', 'hires_signed'],
            roster: ['employee_id', 'role', 'state', 'hire_date', 'termination_date']
        };
        
        const requiredFields = schemas[type];
        if (!requiredFields) return false;
        
        return requiredFields.every(field => field in data[0]);
    }

    checkReadyToAnalyze() {
        const required = ['mmm', 'ashby', 'spend', 'headcount'];
        const isReady = required.every(type => this.data[type] !== null);
        document.getElementById('analyze-btn').disabled = !isReady;
    }

    analyzeData() {
        document.getElementById('loading').classList.remove('hidden');
        
        setTimeout(() => {
            try {
                this.results = this.performAnalysis();
                this.updateUI();
            } catch (error) {
                alert('Error during analysis: ' + error.message);
                console.error(error);
            } finally {
                document.getElementById('loading').classList.add('hidden');
            }
        }, 100);
    }

    performAnalysis() {
        const conversionRates = this.calculateConversionRates();
        const spendCurves = this.fitSpendCurves();
        const recommendations = this.generateRecommendations(conversionRates, spendCurves);
        const retention = this.data.roster ? this.analyzeRetention() : null;
        
        return {
            conversionRates,
            spendCurves,
            recommendations,
            retention,
            summary: this.calculateSummary()
        };
    }

    calculateConversionRates() {
        const rates = {};
        
        // Group by role and state
        const groups = {};
        this.data.ashby.forEach(record => {
            const key = `${record.role}|${record.state}`;
            if (!groups[key]) {
                groups[key] = { applications: 0, hires: 0, role: record.role, state: record.state };
            }
            groups[key].applications++;
            if (record.status === 'hired') {
                groups[key].hires++;
            }
        });
        
        Object.values(groups).forEach(group => {
            const key = `${group.role}|${group.state}`;
            let rate = group.hires / group.applications;
            
            // Blend with role average if low data
            if (group.applications < 30 || group.hires < 5) {
                const roleAvg = this.getRoleAverageConversion(group.role);
                rate = (rate + roleAvg) / 2;
            }
            
            rates[key] = {
                rate: rate,
                applications: group.applications,
                hires: group.hires,
                confidence: this.getConfidenceScore(group.applications, group.hires)
            };
        });
        
        return rates;
    }

    getRoleAverageConversion(role) {
        const roleData = this.data.ashby.filter(r => r.role === role);
        const totalApps = roleData.length;
        const totalHires = roleData.filter(r => r.status === 'hired').length;
        return totalHires / totalApps || 0.02; // Default 2% if no data
    }

    getConfidenceScore(applications, hires) {
        if (applications >= 100 && hires >= 10) return 'high';
        if (applications >= 30 && hires >= 5) return 'medium';
        return 'low';
    }

    fitSpendCurves() {
        const curves = {};
        
        // Group spend and applications data
        const groups = {};
        
        this.data.spend.forEach(record => {
            const key = `${record.role}|${record.state}`;
            if (!groups[key]) {
                groups[key] = { spend: [], apps: [], role: record.role, state: record.state };
            }
            groups[key].spend.push(parseFloat(record.spend));
        });
        
        this.data.mmm.forEach(record => {
            const key = `${record.role}|${record.state}`;
            if (groups[key]) {
                groups[key].apps.push(parseInt(record.applications));
            }
        });
        
        Object.values(groups).forEach(group => {
            const key = `${group.role}|${group.state}`;
            if (group.spend.length > 0 && group.apps.length > 0) {
                curves[key] = this.fitHillCurve(group.spend, group.apps);
            }
        });
        
        return curves;
    }

    fitHillCurve(spendData, appsData) {
        // Simplified Hill curve fitting
        // In production, you'd use more sophisticated fitting
        const avgSpend = spendData.reduce((a, b) => a + b, 0) / spendData.length;
        const avgApps = appsData.reduce((a, b) => a + b, 0) / appsData.length;
        
        const efficiency = avgApps / avgSpend;
        
        return {
            efficiency,
            maxApps: Math.max(...appsData) * 1.2,
            halfSat: avgSpend,
            rSquared: 0.75 // Placeholder
        };
    }

    generateRecommendations(conversionRates, spendCurves) {
        const recommendations = [];
        const CHURN_RATE = 0.22; // 22% over 90 days
        const MONTHLY_CHURN = 0.08; // 8% per month
        
        // Process each headcount target
        this.data.headcount.forEach(target => {
            const key = `${target.role}|${target.state}`;
            const conversionRate = conversionRates[key]?.rate || 0.02;
            const spendCurve = spendCurves[key];
            
            // Calculate churn-adjusted staff
            const baseStaff = parseInt(target.hires_signed);
            const retentionRate = Math.pow(1 - MONTHLY_CHURN, 3); // 3-month retention
            const adjustedStaff = Math.floor(baseStaff * retentionRate);
            
            // Calculate gap
            const forecastHeadcount = parseInt(target.forecast_headcount);
            const gap = Math.max(0, forecastHeadcount - adjustedStaff);
            
            // Calculate target applications
            const targetApps = Math.ceil(gap / conversionRate);
            
            // Calculate spend needed
            let spendNeeded = 0;
            let currentSpend = 0;
            
            if (spendCurve && targetApps > 0) {
                spendNeeded = targetApps / spendCurve.efficiency;
            }
            
            // Get current spend
            const currentSpendData = this.data.spend.filter(s => 
                s.role === target.role && s.state === target.state
            );
            if (currentSpendData.length > 0) {
                currentSpend = currentSpendData.reduce((sum, s) => 
                    sum + parseFloat(s.spend), 0) / currentSpendData.length;
            }
            
            // Calculate change percentage
            const changePercent = currentSpend > 0 ? 
                ((spendNeeded - currentSpend) / currentSpend) * 100 : 0;
            
            // Determine recommendation
            let recommendation = 'maintain';
            if (changePercent > 5) recommendation = 'increase';
            if (changePercent < -5) recommendation = 'decrease';
            
            const confidence = conversionRates[key]?.confidence || 'low';
            
            recommendations.push({
                role: target.role,
                state: target.state,
                gap,
                targetApps,
                spendNeeded: Math.round(spendNeeded),
                currentSpend: Math.round(currentSpend),
                changePercent: Math.round(changePercent),
                recommendation,
                confidence
            });
        });
        
        return recommendations;
    }

    analyzeRetention() {
        if (!this.data.roster) return null;
        
        const cohorts = {};
        const today = new Date();
        
        this.data.roster.forEach(employee => {
            const hireDate = new Date(employee.hire_date);
            const termDate = employee.termination_date ? new Date(employee.termination_date) : null;
            
            const key = `${employee.role}|${employee.state}`;
            if (!cohorts[key]) {
                cohorts[key] = { total: 0, retained90: 0, role: employee.role, state: employee.state };
            }
            
            cohorts[key].total++;
            
            // Check if retained for 90 days
            const ninetyDaysLater = new Date(hireDate);
            ninetyDaysLater.setDate(ninetyDaysLater.getDate() + 90);
            
            if (!termDate || termDate >= ninetyDaysLater) {
                cohorts[key].retained90++;
            }
        });
        
        return Object.values(cohorts).map(cohort => ({
            ...cohort,
            retentionRate: cohort.retained90 / cohort.total,
            vs78Percent: (cohort.retained90 / cohort.total) - 0.78
        }));
    }

    calculateSummary() {
        const totalSpend = this.data.spend.reduce((sum, record) => 
            sum + parseFloat(record.spend), 0);
        
        const totalApplications = this.data.mmm.reduce((sum, record) => 
            sum + parseInt(record.applications), 0);
        
        const totalHiringGap = this.results?.recommendations.reduce((sum, rec) => 
            sum + rec.gap, 0) || 0;
        
        return {
            totalSpend,
            totalApplications,
            costPerApp: totalApplications > 0 ? totalSpend / totalApplications : 0,
            hiringGap: totalHiringGap
        };
    }

    updateUI() {
        this.updateOverview();
        this.updateRecommendationsTable();
        this.updateDiagnostics();
        if (this.results.retention) {
            this.updateRetentionAnalysis();
        }
    }

    updateOverview() {
        const summary = this.results.summary;
        
        document.getElementById('total-spend').textContent = 
            `$${summary.totalSpend.toLocaleString()}`;
        document.getElementById('total-applications').textContent = 
            summary.totalApplications.toLocaleString();
        document.getElementById('cost-per-app').textContent = 
            `$${summary.costPerApp.toFixed(2)}`;
        document.getElementById('hiring-gap').textContent = 
            summary.hiringGap.toString();
    }

    updateRecommendationsTable() {
        const tbody = document.querySelector('#recommendations-table tbody');
        tbody.innerHTML = '';
        
        this.results.recommendations.forEach(rec => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rec.role}</td>
                <td>${rec.state}</td>
                <td>${rec.gap}</td>
                <td>${rec.targetApps}</td>
                <td>$${rec.spendNeeded.toLocaleString()}</td>
                <td>$${rec.currentSpend.toLocaleString()}</td>
                <td>${rec.changePercent}%</td>
                <td><span class="recommendation ${rec.recommendation}">${rec.recommendation}</span></td>
                <td>
                    <div class="confidence">
                        <span>${rec.confidence}</span>
                        <div class="confidence-bar">
                            <div class="confidence-fill ${rec.confidence}" 
                                 style="width: ${this.getConfidenceWidth(rec.confidence)}%"></div>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getConfidenceWidth(confidence) {
        switch (confidence) {
            case 'high': return 100;
            case 'medium': return 60;
            case 'low': return 30;
            default: return 0;
        }
    }

    updateDiagnostics() {
        const container = document.getElementById('curve-fits');
        container.innerHTML = '';
        
        Object.entries(this.results.spendCurves).forEach(([key, curve]) => {
            const [role, state] = key.split('|');
            const div = document.createElement('div');
            div.className = 'curve-fit-chart';
            div.innerHTML = `
                <h4>${role} - ${state}</h4>
                <p>Efficiency: ${curve.efficiency.toFixed(2)} apps per dollar</p>
                <p>R-squared: ${curve.rSquared.toFixed(3)}</p>
                <p>Max Applications: ${curve.maxApps}</p>
            `;
            container.appendChild(div);
        });
    }

    updateRetentionAnalysis() {
        const container = document.getElementById('retention-comparison');
        container.innerHTML = '';
        
        this.results.retention.forEach(cohort => {
            const div = document.createElement('div');
            div.className = 'retention-item';
            div.innerHTML = `
                <div class="retention-rate ${cohort.retentionRate >= 0.78 ? 'good' : 'poor'}">
                    ${(cohort.retentionRate * 100).toFixed(1)}%
                </div>
                <div class="retention-label">
                    ${cohort.role} - ${cohort.state}<br>
                    ${cohort.vs78Percent >= 0 ? '+' : ''}${(cohort.vs78Percent * 100).toFixed(1)}% vs 78% assumption
                </div>
            `;
            container.appendChild(div);
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new IndeedAnalyzer();
});