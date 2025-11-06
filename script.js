document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('displacementChart').getContext('2d');
    const displacementChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Displacement (mm)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                pointRadius: 1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'second',
                        displayFormats: {
                            second: 'HH:mm:ss'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Waktu'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Displacement (mm)'
                    },
                    min: -10, 
                    max: 10,
                }
            },
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });

    function updateDashboard(data) {
        
        if (!data || data.length === 0) {
            document.getElementById('latest-raw-data').textContent = "Menunggu data masuk ke database...";
            displacementChart.data.datasets[0].data = [];
            displacementChart.update(); 
            return;
        }

        const latestData = data[0];

        document.getElementById('tingkat10-display').textContent = (latestData.tingkat_10 !== null) ? parseFloat(latestData.tingkat_10).toFixed(2) : '--';
        document.getElementById('tingkat3-display').textContent = (latestData.tingkat_3 !== null) ? parseFloat(latestData.tingkat_3).toFixed(2) : '--';
        document.getElementById('avg-displacement-display').textContent = (latestData.average_displacement !== null) ? parseFloat(latestData.average_displacement).toFixed(2) : '--';
        
        const avgDispElement = document.getElementById('avg-displacement-display');
        if (Math.abs(parseFloat(latestData.average_displacement)) > 5) {
            avgDispElement.style.color = '#e74c3c';
        } else {
            avgDispElement.style.color = '#3498db';
        }

        const chartData = data.map(record => ({
            x: moment(record.waktu), 
            y: parseFloat(record.displacement)
        }))
        .filter(point => !isNaN(point.y) && point.x.isValid())
        .reverse(); // Dibalik agar urutan waktunya benar

        displacementChart.data.datasets[0].data = chartData;
        
        displacementChart.options.scales.y.min = undefined;
        displacementChart.options.scales.y.max = undefined;
        
        displacementChart.update(); 

        document.getElementById('latest-raw-data').textContent = JSON.stringify(latestData, null, 2);
    }

    async function fetchData() {
        try {
            const response = await fetch('api_ambil.php'); 
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json(); 
            updateDashboard(data); 

        } catch (error) {
            console.error("Gagal mengambil data:", error);
            document.getElementById('latest-raw-data').textContent = "Gagal terhubung ke server atau API...\n" + error.message;
            
            displacementChart.options.scales.y.min = -10;
            displacementChart.options.scales.y.max = 10;
            updateDashboard([]); 
        }
    }

    fetchData();
    setInterval(fetchData, 2000); 

});