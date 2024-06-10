$(document).ready(() => {
    // if deployed to a site supporting SSL, use wss://
    const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
    const webSocket = new WebSocket(protocol + location.host);

    class DeviceData {
        constructor(deviceId) {
            this.deviceId = deviceId;
            this.maxLen = 50;
            this.timeData = new Array(this.maxLen);
            // this.HumidityData = new Array(this.maxLen); // Changed from phData to AirQualityData
            this.TemperatureData = new Array(this.maxLen); // Changed from precipitateData to DangerData
            this.UVLevelData = new Array(this.maxLen)

           
        }

        addData(time, temperature, humidity, uvLevel) {
            this.timeData.push(time);
            // this.HumidityData.push(humidity);
            this.UVLevelData.push(uvLevel)
            this.TemperatureData.push(Temperature || null);

            if (this.timeData.length > this.maxLen) {
                this.timeData.shift();
                // this.HumidityData.shift();
                this.TemperatureData.shift();
                this.UVLevelData.shift();
            }
        }
    }

    class TrackedDevices {
        constructor() {
            this.devices = [];
        }

        findDevice(deviceId) {
            return this.devices.find(device => device.deviceId === deviceId);
        }

        getDevicesCount() {
            return this.devices.length;
        }
    }

    const trackedDevices = new TrackedDevices();

    const chartData = {
        datasets: [
            {
                fill: false,
                label: 'UV Level',
                yAxisID: 'UV Level',
                borderColor: 'rgba(255, 204, 0, 1)',
                pointBorderColor: 'rgba(255, 204, 0, 1)',
                backgroundColor: 'rgba(255, 204, 0, 0.4)',
                pointHoverBackgroundColor: 'rgba(255, 204, 0, 1)',
                pointHoverBorderColor: 'rgba(255, 204, 0, 1)',
                spanGaps: true,
            },
            {
                fill: false,
                label: 'Temperature',
                yAxisID: 'Temperature',
                borderColor: 'rgba(0, 0, 254, 1)',
                pointBorderColor: 'rgba(0, 0, 254, 1)',
                backgroundColor: 'rgba(0, 0, 254, 1)',
                pointHoverBackgroundColor: 'rgba(0, 0, 254, 1)',
                pointHoverBorderColor: 'rgba(0, 0, 254, 1)',
                spanGaps: true,
            },
        ],
    };

    const chartOptions = {
        scales: {
            yAxes: [
                {
                    id: 'UV Level',
                    type: 'linear',
                    scaleLabel: {
                        labelString: 'UV Level',
                        display: true,
                    },
                    position: 'left',
                },
                {
                    id: 'bool',
                    type: 'linear',
                    scaleLabel: {
                        labelString: 'Temperature',
                        display: true,
                    },
                    position: 'right',
                },
            ],
        },
    };

    const ctx = document.getElementById('iotChart').getContext('2d');
    const myLineChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: chartOptions,
    });

    let needsAutoSelect = true;
    const deviceCount = document.getElementById('deviceCount');
    const listOfDevices = document.getElementById('listOfDevices');

    function OnSelectionChange() {
        const device = trackedDevices.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
        chartData.labels = device.timeData;
        chartData.datasets[0].data = device.UVLevelData;
        chartData.datasets[1].data = device.TemperatureData;
        myLineChart.update();
    }

    listOfDevices.addEventListener('change', OnSelectionChange, false);

    webSocket.onmessage = function onMessage(message) {
        try {
            const messageData = JSON.parse(message.data);
            console.log(messageData);

            if (!messageData.MessageDate || (!messageData.IotData.uvLevel && !messageData.IotData.temperature)) {
                console.log('Invalid message format:', messageData);
                return;
            }

            let existingDeviceData = trackedDevices.findDevice(messageData.DeviceId);

            if (!existingDeviceData) {
                const newDeviceData = new DeviceData(messageData.DeviceId);
                trackedDevices.devices.push(newDeviceData);
                existingDeviceData = newDeviceData;

                const numDevices = trackedDevices.getDevicesCount();
                deviceCount.innerText = numDevices === 1 ? `${numDevices} device` : `${numDevices} devices`;

                const node = document.createElement('option');
                const nodeText = document.createTextNode(messageData.DeviceId);
                node.appendChild(nodeText);
                listOfDevices.appendChild(node);

                if (needsAutoSelect) {
                    needsAutoSelect = false;
                    listOfDevices.selectedIndex = 0;
                    OnSelectionChange();
                }
            }

            existingDeviceData.addData(messageData.MessageDate, messageData.IotData.uvLevel, messageData.IotData.temperature);
            myLineChart.update();
        } catch (err) {
            console.error(err);
        }
    };
});
