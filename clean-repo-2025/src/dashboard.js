/**
 * ISO-NE Energy Markets Dashboard
 * Interactive D3.js visualization of New England electricity market data
 * 
 * Author: Zev Pinker
 * Data Source: ISO New England (iso-ne.com)
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const margin = { top: 20, right: 30, bottom: 50, left: 50 };
const w = 400 - margin.left - margin.right;
const h = 300 - margin.top - margin.bottom;

let selectedOption = "avg_peak";

// Data file paths
const datasets = [
    "data/2023_ME-filt.csv",
    "data/2023_NH-filt.csv",
    "data/2023_VT-filt.csv",
    "data/2023_CT-filt.csv",
    "data/2023_RI-filt.csv",
    "data/2023_SEMA-filt.csv",
    "data/2023_NEMA-filt.csv",
    "data/2023_WCMA-filt.csv"
];

const regions = [
    "Maine",
    "New Hampshire",
    "Vermont",
    "Connecticut",
    "Rhode Island",
    "South East Massachusetts",
    "North East Massachusetts",
    "Worcester Massachusetts"
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const parseDate = d3.timeParse("%Y-%m-%d");

Date.prototype.getDayOfYear = function () {
    const start = new Date(this.getFullYear(), 0, 0);
    const diff = this - start + (start.getTimezoneOffset() - this.getTimezoneOffset()) * 60 * 1000;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
};

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function dayToDate(dayOfYear, year) {
    const start = new Date(year, 0, 1);
    start.setDate(dayOfYear);
    return start;
}

function formatDate(date) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    if (day === 2 || day === 22) suffix = "nd";
    if (day === 3 || day === 23) suffix = "rd";

    return `${month} ${day}${suffix}, ${year}`;
}

// =============================================================================
// DATA STORAGE
// =============================================================================

let mapData, geojson, histData = [], dayOfWeekData = [];

// =============================================================================
// TOOLTIP
// =============================================================================

const tooltip = d3.select(".tooltip");

// =============================================================================
// DATA LOADING
// =============================================================================

function loadAllData() {
    const mapDataPromise = d3.csv("data/fractional-energy-by-state.csv");
    const geojsonPromise = d3.json("assets/new-england.json");
    const histogramsPromise = Promise.all(datasets.map(d => d3.csv(d)));
    const dayOfWeekPromise = Promise.all(datasets.map(d => d3.csv(d)));

    return Promise.all([mapDataPromise, geojsonPromise, histogramsPromise, dayOfWeekPromise]);
}

loadAllData().then(([mapCsv, geoJson, histogramDatasets, dayOfWeekDatasets]) => {
    mapData = mapCsv;
    geojson = geoJson;

    // Process histogram data
    histData = histogramDatasets.map(dataset => {
        return dataset.map(row => {
            row.Date = new Date(row.Date);
            row.DayOfYear = getDayOfYear(row.Date);
            row.Avg_RT_LMP = parseFloat(row.Avg_RT_LMP);
            return row;
        });
    });

    // Process day-of-week data
    dayOfWeekData = dayOfWeekDatasets.map((csvData, index) => {
        return csvData.map(d => ({
            ...d,
            Min_Demand: parseFloat(d.Min_Demand),
            Peak_Demand: parseFloat(d.Peak_Demand),
            Date: parseDate(d.Date),
            DayOfYear: parseInt(d3.timeFormat("%j")(parseDate(d.Date)), 10),
            DT: new Date(d.Date).getDay() + 1
        }));
    });

    initializeVisualizations();
}).catch(error => {
    console.error("Error loading data:", error);
});

// =============================================================================
// MAP VISUALIZATION
// =============================================================================

const mapWidth = 600;
const mapHeight = 600;

const mapSvg = d3.select("#map")
    .attr("width", mapWidth)
    .attr("height", mapHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .call(d3.zoom().on("zoom", (event) => {
        mapSvg.attr("transform", event.transform);
    }));

const projection = d3.geoAlbersUsa()
    .translate([w / 4 - 500, 3 * h / 4 + 230])
    .scale([2000]);

const path = d3.geoPath().projection(projection);
let color = d3.scaleSequential(d3.interpolateBlues);

function setupMap() {
    mapSvg.selectAll("path")
        .data(geojson.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "state")
        .style("fill", "#ccc")
        .style("stroke", "#fff")
        .on("mouseover", (event, d) => {
            const stateName = d.properties.name;
            tooltip
                .style("opacity", 1)
                .html(`State: ${stateName}`);
        })
        .on("mousemove", (event, d) => {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });
}

function computeAverages(data) {
    const averages = {};
    if (!data.length) return averages;
    data.forEach(row => {
        for (let state in row) {
            if (state !== "Date") {
                averages[state] = (averages[state] || 0) + parseFloat(row[state]);
            }
        }
    });
    for (let state in averages) {
        averages[state] /= data.length;
    }
    return averages;
}

const legendGroup = mapSvg.append("g")
    .attr("id", "legend")
    .attr("transform", `translate(50, 40) rotate(90)`)
    .on("mouseover", (event, d) => {
        tooltip
            .style("opacity", 1)
            .html(`For each day the "fractional energy" is calculated by dividing <br> the regional energy field by the sum of
                 the daily <br> energy for all regions, then the "average fractional energy" <br> is taken over the specified time interval.`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");
    })
    .on("mouseout", () => {
        tooltip.style("opacity", 0);
    });

function createLegend(colorScale) {
    const legendWidth = 200;
    const legendHeight = 10;

    legendGroup.selectAll("*").remove();

    const gradient = mapSvg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%").attr("x2", "100%")
        .attr("y1", "0%").attr("y2", "0%");

    const stops = d3.range(0, 1.1, 0.1).map(t => ({
        offset: `${t * 100}%`,
        color: colorScale(t)
    }));

    gradient.selectAll("stop")
        .data(stops)
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    const legendScale = d3.scaleLinear()
        .domain(colorScale.domain())
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale).ticks(10);

    const axisGroup = legendGroup.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);

    axisGroup.selectAll("text")
        .style("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("dy", "-0.5em")
        .attr("dx", "-1em");
}

function updateMap(minValue, maxValue) {
    const filteredData = mapData.filter(d => {
        const day = new Date(d.Date).getDayOfYear();
        return day >= minValue && day <= maxValue;
    });

    const averages = computeAverages(filteredData);
    const values = Object.values(averages);

    if (values.length > 0) {
        const min = 0;
        const max = 0.5;
        color.domain([min, max]);

        createLegend(color);

        mapSvg.selectAll(".state")
            .style("fill", d => {
                const state = d.properties.name;
                const value = averages[state];
                return value !== undefined ? color(value) : "#ccc";
            });
    }
}

// =============================================================================
// HISTOGRAM VISUALIZATION
// =============================================================================

function setupHistograms() {
    const histogramsContainer = d3.select("#histograms");
    histogramsContainer.selectAll("*").remove();

    histData.forEach((dataset, index) => {
        const container = histogramsContainer.append("div")
            .attr("class", "histogram")
            .attr("id", `histogram${index}`);

        container.append("div")
            .attr("class", "histogram-title")
            .style("text-align", "center")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .style("margin-bottom", "5px")
            .text(`Region: ${regions[index]} (USD vs. # of Days)`);

        const svg = container.append("svg")
            .attr("width", w + margin.left + margin.right)
            .attr("height", h + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        dataset.svg = svg;
    });
}

function updateHistograms(minDay, maxDay) {
    histData.forEach((dataset, index) => {
        const svg = dataset.svg;
        svg.selectAll("*").remove();

        const filteredData = dataset.filter(d => d.DayOfYear >= minDay && d.DayOfYear <= maxDay);
        const avgRTValues = filteredData.map(d => d.Avg_RT_LMP);

        const x = d3.scaleLinear()
            .domain([d3.min(avgRTValues) || 0, d3.max(avgRTValues) || 1])
            .range([0, w]);

        const histogram = d3.histogram()
            .value(d => d)
            .domain(x.domain())
            .thresholds(x.ticks(20));

        const bins = histogram(avgRTValues);

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length) || 1])
            .range([h, 0]);

        // X axis
        svg.append("g")
            .attr("transform", `translate(0, ${h})`)
            .call(d3.axisBottom(x));

        // X axis label
        svg.append("text")
            .attr("class", "x-label")
            .attr("x", w / 2)
            .attr("y", h + 40)
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "black")
            .text("Daily Average Price per MWh in US Dollars");

        // Y axis
        svg.append("g")
            .call(d3.axisLeft(y));

        // Y axis label
        svg.append("text")
            .attr("class", "y-label")
            .attr("x", -(h / 2))
            .attr("y", -40 + 8)
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "black")
            .attr("transform", "rotate(-90)")
            .text("Frequency in days");

        // Bars
        svg.selectAll("rect")
            .data(bins)
            .enter()
            .append("rect")
            .attr("x", d => x(d.x0))
            .attr("y", d => y(d.length))
            .attr("width", d => Math.max(x(d.x1) - x(d.x0) - 1, 0))
            .attr("height", d => h - y(d.length))
            .attr("fill", "steelblue");
    });
}

// =============================================================================
// DAY-OF-WEEK VISUALIZATION
// =============================================================================

function setupDayOfWeekCharts() {
    const dayContainer = d3.select("#day-of-week-charts");
    dayContainer.selectAll("*").remove();

    dayOfWeekData.forEach((data, index) => {
        const container = dayContainer.append("div")
            .attr("class", "visualization")
            .attr("id", `dayofweek-visualization${index}`);

        const svg = container.append("svg")
            .attr("width", 400)
            .attr("height", 300)
            .append("g")
            .attr("transform", `translate(${60}, ${20})`);

        data.svg = svg;
        data.title = `Dataset ${index + 1}`;
    });
}

function filterDataByRange(data, minDay, maxDay) {
    return data.filter(d => d.DayOfYear >= minDay && d.DayOfYear <= maxDay);
}

function groupDataByDayOfWeek(data, key) {
    const grouped = d3.rollups(
        data,
        v => d3.mean(v, d => d[key]),
        d => d.DT
    );
    return grouped.map(([day, value]) => ({ DT: day, Value: value }));
}

const max_height = 4500;

function renderDayOfWeekChart(svg, data, title) {
    svg.selectAll("*").remove();

    const widthChart = 400 - 60 - 30;
    const heightChart = 300 - 20 - 50;

    const x = d3.scaleBand()
        .domain(data.map(d => d.DT))
        .range([0, widthChart])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, max_height])
        .range([heightChart, 0]);

    // X axis
    svg.append("g")
        .attr("transform", `translate(0, ${heightChart})`)
        .call(d3.axisBottom(x).tickFormat(d => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d - 1]))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Y axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // Y axis label
    svg.append("text")
        .attr("class", "y-label")
        .attr("x", -(h / 2))
        .attr("y", -40)
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "black")
        .attr("transform", "rotate(-90)")
        .text("Avg MWh Supplied");

    // Bars
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.DT))
        .attr("y", d => y(d.Value))
        .attr("width", x.bandwidth())
        .attr("height", d => heightChart - y(d.Value))
        .attr("fill", "steelblue");

    // Chart title
    svg.append("text")
        .attr("x", widthChart / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(title);
}

function updateDayOfWeekCharts(minDay, maxDay) {
    dayOfWeekData.forEach((dataset, index) => {
        const svg = dataset.svg;
        const filtered = filterDataByRange(dataset, minDay, maxDay);
        const key = selectedOption === "avg_peak" ? "Peak_Demand" : "Min_Demand";
        const groupedData = groupDataByDayOfWeek(filtered, key);
        renderDayOfWeekChart(
            svg,
            groupedData,
            `${regions[index]} (${selectedOption === "avg_peak" ? "Measured at Peak Hour" : "Measured at Min Hour"})`
        );
    });
}

// =============================================================================
// INITIALIZATION & EVENT HANDLERS
// =============================================================================

function initializeVisualizations() {
    setupMap();
    setupHistograms();
    setupDayOfWeekCharts();

    // Initialize noUiSlider
    const rangeSlider = document.getElementById('range-slider');
    noUiSlider.create(rangeSlider, {
        start: [1, 365],
        connect: true,
        range: {
            'min': 1,
            'max': 365
        }
    });

    const sliderValues = document.getElementById("slider-values");

    rangeSlider.noUiSlider.on('update', function (values, handle) {
        const min = Math.round(values[0]);
        const max = Math.round(values[1]);
        sliderValues.textContent = `Range: ${formatDate(dayToDate(min, 2023))} - ${formatDate(dayToDate(max, 2023))}`;
        updateVisualizations(min, max);
    });

    updateVisualizations(1, 365);
}

function updateVisualizations(min, max) {
    updateMap(min, max);
    updateHistograms(min, max);
    updateDayOfWeekCharts(min, max);
}

// Radio button listener
document.querySelectorAll('input[name="options"]').forEach(radio => {
    radio.addEventListener("change", () => {
        selectedOption = document.querySelector('input[name="options"]:checked').value;
        const values = document.getElementById('range-slider').noUiSlider.get();
        const min = Math.round(values[0]);
        const max = Math.round(values[1]);
        updateVisualizations(min, max);
    });
});
