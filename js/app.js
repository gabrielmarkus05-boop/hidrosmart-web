/**
 * HidroSmart - Simulador de Consumo de Água
 * Versão Web com suporte a Web Bluetooth API
 */

class WaterConsumptionSimulator {
    constructor() {
        this.currentTotal = 150.0;
        this.flowRate = 0.0;
        this.isLeakDetected = false;
        this.continuousFlowMinutes = 0;
        this.chart = null;
        this.dataHistory = [];
        this.maxDataPoints = 24; // Últimas 24 horas
        
        this.initChart();
    }

    initChart() {
        const ctx = document.getElementById('consumptionChart');
        if (!ctx) return;
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Consumo (L/min)',
                    data: [],
                    borderColor: '#0288D1',
                    backgroundColor: 'rgba(2,136,209,0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 20
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Simula comportamento realista de uso de água
    simulateRealisticFlow() {
        const rand = Math.random();
        
        // 5% chance de vazamento
        if (rand > 0.95 && this.continuousFlowMinutes > 5) {
            return Math.random() * 1.5 + 0.5; // 0.5-2.0 L/min (vazamento)
        }
        
        if (rand > 0.4) return Math.random() * 6 + 2;   // 2-8 L/min (uso normal)
        if (rand > 0.1) return Math.random() * 5 + 10;  // 10-15 L/min (uso alto)
        return 0; // Sem uso
    }

    update() {
        // Simula nova leitura
        this.flowRate = this.simulateRealisticFlow();
        
        // Detecta fluxo contínuo
        if (this.flowRate > 0.5) {
            this.continuousFlowMinutes += 0.0167; // ~1 segundo em minutos
        } else {
            this.continuousFlowMinutes = 0;
        }
        
        // Verifica vazamento (>30 minutos)
        this.isLeakDetected = this.continuousFlowMinutes > 30;
        
        // Atualiza total acumulado
        this.currentTotal += (this.flowRate / 60); // L/min -> L/s
        
        this.updateUI();
        this.updateChart();
    }

    updateUI() {
        // Atualiza vazão
        const flowElement = document.getElementById('flowRate');
        if (flowElement) {
            flowElement.textContent = this.flowRate.toFixed(1);
            
            // Cor baseada no consumo
            let color = '#4CAF50'; // Verde
            if (this.flowRate > 3) color = '#FFD54F'; // Amarelo
            if (this.flowRate > 8) color = '#F44336'; // Vermelho
            flowElement.style.color = color;
        }
        
        // Atualiza total do dia
        const totalElement = document.getElementById('dailyTotal');
        if (totalElement) {
            totalElement.textContent = Math.floor(this.currentTotal) + ' L';
        }
        
        // Atualiza status
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) {
            if (this.isLeakDetected) {
                statusBadge.className = 'status-badge alert';
                statusBadge.innerHTML = '<span class="status-icon">⚠️</span><span>VAZAMENTO!</span>';
            } else {
                statusBadge.className = 'status-badge';
                statusBadge.innerHTML = '<span class="status-icon">✓</span><span>Fluxo Normal</span>';
            }
        }
        
        // Mostra/esconde alerta de vazamento
        const leakAlert = document.getElementById('leakAlert');
        if (leakAlert) {
            leakAlert.style.display = this.isLeakDetected ? 'block' : 'none';
        }
        
        // Atualiza timestamp
        const lastUpdate = document.getElementById('lastUpdate');
        if (lastUpdate) {
            const now = new Date();
            lastUpdate.textContent = `Atualizado: ${now.toLocaleTimeString()}`;
        }
    }

    updateChart() {
        if (!this.chart) return;
        
        const now = new Date();
        const timeLabel = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
        
        this.dataHistory.push({
            label: timeLabel,
            value: this.flowRate
        });
        
        // Mantém apenas últimos pontos
        if (this.dataHistory.length > this.maxDataPoints) {
            this.dataHistory.shift();
        }
        
        this.chart.data.labels = this.dataHistory.map(d => d.label);
        this.chart.data.datasets[0].data = this.dataHistory.map(d => d.value);
        this.chart.update('none'); // Atualização suave
    }

    start() {
        // Atualiza a cada segundo
        setInterval(() => this.update(), 1000);
        
        // Simula dados históricos para o gráfico inicial
        for (let i = 23; i >= 0; i--) {
            const past = new Date();
            past.setHours(past.getHours() - i);
            this.dataHistory.push({
                label: past.getHours() + ':00',
                value: Math.random() * 8
            });
        }
        this.updateChart();
    }
}

// Web Bluetooth API - Conexão com sensor real
class BluetoothManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.characteristic = null;
    }

    async connect() {
        try {
            // Solicita dispositivo BLE com serviço específico
            this.device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['battery_service', 'device_information']
            });
            
            const statusEl = document.getElementById('bleStatus');
            if (statusEl) statusEl.textContent = 'Conectando...';
            
            // Conecta ao GATT Server
            this.server = await this.device.gatt.connect();
            
            // Aqui você acessaria o serviço específico do seu sensor
            // const service = await this.server.getPrimaryService('seu-uuid-aqui');
            // this.characteristic = await service.getCharacteristic('seu-uuid-caracteristica');
            
            if (statusEl) {
                statusEl.textContent = `✅ Conectado: ${this.device.name}`;
                statusEl.style.color = '#4CAF50';
            }
            
            // Escuta desconexão
            this.device.addEventListener('gattserverdisconnected', () => {
                if (statusEl) {
                    statusEl.textContent = '❌ Desconectado';
                    statusEl.style.color = '#F44336';
                }
            });
            
        } catch (error) {
            console.error('Erro Bluetooth:', error);
            const statusEl = document.getElementById('bleStatus');
            if (statusEl) {
                statusEl.textContent = '❌ Erro: ' + error.message;
                statusEl.style.color = '#F44336';
            }
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Botão de conectar Bluetooth
    const btnConnect = document.getElementById('btnConnect');
    if (btnConnect) {
        // Verifica se navegador suporta Web Bluetooth
        if ('bluetooth' in navigator) {
            btnConnect.addEventListener('click', () => {
                const btManager = new BluetoothManager();
                btManager.connect();
            });
        } else {
            btnConnect.textContent = 'Bluetooth não suportado';
            btnConnect.disabled = true;
        }
    }
});
