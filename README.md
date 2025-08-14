# Indeed Spend Analysis Dashboard

A local web dashboard that analyzes Indeed spend efficiency and provides hiring recommendations with churn-adjusted projections.

## Features

- **CSV Data Import**: Upload MMM import, Ashby funnel, spend actuals, headcount plans, and roster data
- **Churn-Adjusted Gap Calculation**: Accounts for 22% churn over 90 days (≈8% per month) for new hires
- **Conversion Rate Analysis**: Calculates apps-to-hire conversion rates with confidence scoring
- **Spend Recommendation Engine**: Uses curve fitting to recommend increase/maintain/decrease decisions
- **Retention Analysis**: Compares actual retention vs 78% assumption (when roster data provided)
- **Interactive Dashboard**: Multiple tabs for overview, recommendations, diagnostics, and retention

## Getting Started

1. Open `index.html` in your web browser
2. Upload the required CSV files:
   - **MMM Import** (required): Application volume data
   - **Ashby Funnel** (required): ATS funnel events 
   - **Spend Actuals** (required): Indeed spend data
   - **Headcount Plan** (required): Headcount targets
   - **Roster** (optional): Employee data for retention analysis

3. Click "Analyze Data" to generate recommendations

## Sample Data

Sample CSV files are provided in the `sample-data/` directory to test the dashboard:
- `mmm_import.csv` - Application volume by date/role/state
- `ashby_funnel.csv` - Candidate funnel data with hire outcomes
- `spend_actuals.csv` - Daily spend by role/state
- `headcount_plan.csv` - Monthly headcount targets
- `roster.csv` - Employee hire/termination dates

## Data Schema

### MMM Import (mmm_import.csv)
```csv
date,role,state,applications
2025-05-05,AT RN,NY,210
```

### Ashby Funnel (ashby_funnel.csv)
```csv
candidate_id,role,state,applied_at,hired_at,status
C001,AT RN,NY,2025-04-20,2025-05-07,hired
```

### Spend Actuals (spend_actuals.csv)
```csv
date,role,state,spend
2025-05-05,AT RN,NY,1250.00
```

### Headcount Plan (headcount_plan.csv)
```csv
month,role,state,forecast_headcount,hires_signed
2025-09,AT RN,NY,22,6
```

### Roster (roster.csv) - Optional
```csv
employee_id,role,state,hire_date,termination_date
E001,AT RN,NY,2025-02-01,
```

## Core Logic

### Churn Calculation
- 22% churn over 90 days for new hires
- Monthly retention rate: 92% (1 - 8%)
- 3-month retention: 78% (0.92^3)

### Gap Calculation
1. Base staff = hires_signed + projected hires
2. Adjusted staff = base staff × 78% retention
3. Gap = forecast_headcount - adjusted_staff

### Recommendations
- **Increase**: >5% spend increase needed
- **Maintain**: ±5% spend change
- **Decrease**: >5% spend decrease possible

## Technology

- Pure HTML/CSS/JavaScript (no external dependencies)
- Client-side CSV parsing and analysis
- Responsive design for desktop/mobile