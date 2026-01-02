# ISO-NE Energy Markets Dashboard

An interactive D3.js dashboard visualizing electricity market data from ISO New England, including locational marginal pricing (LMP), demand patterns, and load zone analysis across the six New England states.

![Dashboard Screenshot](/clean-repo-2025/assets/dashboard-preview.png)

## Overview

This project analyzes 2023 daily electricity market data from ISO-NE's eight load zones. The dashboard enables exploration of:

- **Geographic Distribution**: Choropleth map showing fractional energy consumption by state
- **Price Distributions**: Histograms of real-time LMP across all load zones
- **Demand Patterns**: Day-of-week analysis of peak and minimum demand

All visualizations are linked through an interactive date range slider, allowing users to filter data dynamically.

## Live Demo

Open `index.html` in a browser, or serve locally:

```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000
```

## Project Structure

```
├── index.html          # Main dashboard entry point
├── src/
│   └── dashboard.js    # D3.js visualization code
├── data/
│   ├── 2023_*-filt.csv           # Daily metrics by load zone
│   ├── fractional-energy-by-state.csv
│   └── energy-by-state.csv
├── assets/
│   ├── new-england.json          # GeoJSON for state boundaries
│   ├── load-zones.json           # Load zone geometries
│   └── dashboard-preview.png
└── docs/
    └── writeup.pdf               # Technical documentation
```

## Data Sources

- **ISO-NE**: Daily System Data ([iso-ne.com](https://www.iso-ne.com/isoexpress/web/reports/load-and-demand/-/tree/zone-info))
- **Load Zones**: ME, NH, VT, CT, RI, SEMA (Southeast MA), NEMA (Northeast MA), WCMA (Worcester MA)

## Key Metrics

| Metric | Description |
|--------|-------------|
| `Avg_RT_LMP` | Average real-time locational marginal price ($/MWh) |
| `Peak_Demand` | Maximum hourly demand (MWh) |
| `Min_Demand` | Minimum hourly demand (MWh) |
| `Energy` | Total daily energy consumption |

## Technologies

- **D3.js v7** - Data visualization
- **noUiSlider** - Interactive date range slider
- **HTML/CSS Grid** - Three-column responsive layout
- **GeoJSON** - Geographic data

## Features

- Interactive date range slider with formatted date display (Jan 1st - Dec 31st, 2023)
- Three-column layout: Map | Price Histograms | Day-of-Week Demand
- Toggle between peak and minimum demand views
- Hover tooltips with state/region details and legend explanations
- Zoomable choropleth map with color-coded energy ratios
- Axis labels for all charts ($/MWh, Frequency in days, Avg MWh Supplied)

## Author

**Zev Pinker**  
Yale University, B.S. Computer Science  
[GitHub](https://github.com/ZevPinker) • [LinkedIn](https://www.linkedin.com/in/zev-pinker-69a680279/)

## License

MIT License - See [LICENSE](LICENSE) for details.
