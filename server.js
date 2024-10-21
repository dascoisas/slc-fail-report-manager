const { MongoClient } = require('mongodb');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Importa o Axios
require('dotenv').config();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function hex2bin(hex) {
    return (`00000000${(parseInt(hex, 16)).toString(2)}`).substr(-8);
}

function macToIPV6(eui64) {
    let binary = '';
    eui64.split(':').forEach((str) => {
        binary += hex2bin(str);
    });

    binary = binary.split('');
    binary[6] = 1; // Alterando o bit universal/local
    binary = binary.join('');
    binary = binary.match(/.{1,4}/g).join(' ');
    binary = binary.split(' ');
    let hex = '';
    binary.forEach((group) => {
        hex += parseInt(group, 2).toString(16).toLowerCase();
    });

    return hex.match(/.{1,4}/g).join(':');
}

async function readProjectName() {
    const projetosFilePath = path.join(__dirname, 'projetos.csv');

    if (!fs.existsSync(projetosFilePath)) {
        throw new Error('O arquivo projetos.csv não foi encontrado.');
    }

    const csvContent = fs.readFileSync(projetosFilePath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Ignora o cabeçalho

    for (const line of lines) {
        const [projeto, id] = line.split(','); // Supondo que o separador é vírgula
        if (id.trim() === process.env.ID_DO_PROJETO) {
            return projeto.trim(); // Retorna o projeto que corresponde ao ID
        }
    }
    throw new Error('ID_DO_PROJETO não encontrado no arquivo projetos.csv.');
}

async function makeRequestSwitches(gateway, ipv6) {
    try {
        console.log(`Fazendo requisição para ${gateway} -> ${ipv6}`);
        const response = await axios.get(`http://${gateway}:3000/lamp/statistic`, {
            headers: {
                ip: ipv6 // Adiciona o cabeçalho IP
            },
            timeout: 10000,
        });
        console.log('Resposta: ', response.data);

        // Retorne o número de switches da resposta
        return response.data.n_switches; // Supondo que o campo se chama n_switches
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error(`Timeout ao fazer requisição para ${gateway} -> ${ipv6}.`);
        } else {
            console.error(`ERRO: ao fazer requisição para ${gateway} -> ${ipv6}:`, error.message);
        }
        return "ERROR"; // Retorne "ERROR" em caso de erro
    }
}

async function makeRequestMode(gateway, ipv6) {
    try {
        console.log(`Fazendo requisição para ${gateway} -> ${ipv6}`);
        const response = await axios.get(`http://${gateway}:3000/lamp/control`, {
            headers: {
                ip: ipv6 // Adiciona o cabeçalho IP
            },
            timeout: 10000,
        });
        console.log('Resposta: ', response.data);

        // Retorne o número de switches da resposta
        // 0 - MANUAL: Only user commands
        // 1 - AUTO LUX: On / off decision from the luximeter measure
        // 2 - AUTO ASTRO: On / off decision from the solar position
        // 3 - SCHEDULER: On / off decision and dimmer change from scheduled actions

        switch (response.data.mode) {
            case 0:
                return 'MANUAL';
            case 1:
                return 'AUTOMATICO';
            case 2:
                return 'ASTRONOMICO';
            case 3:
                return 'AGENDAMENTO';
        }

        return response.data.mode; // Supondo que o campo se chama n_switches
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error(`Timeout ao fazer requisição para ${gateway} -> ${ipv6}.`);
        } else {
            console.error(`ERRO: ao fazer requisição para ${gateway} -> ${ipv6}:`, error.message);
        }
        return "ERROR"; // Retorne "ERROR" em caso de erro
    }
}

async function makeRequestCoords(gateway, ipv6) {
    try {
        console.log(`Fazendo requisição para ${gateway} -> ${ipv6}`);
        const response = await axios.get(`http://${gateway}:3000/system/astronomic`, {
            headers: {
                ip: ipv6 // Adiciona o cabeçalho IP
            },
            timeout: 10000,
        });
        console.log('Resposta: ', response.data);

        // Retorne o número de switches da resposta
        return `${response.data.lat}/${response.data.lng}`; // Supondo que o campo se chama n_switches
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error(`Timeout ao fazer requisição para ${gateway} -> ${ipv6}.`);
        } else {
            console.error(`ERRO: ao fazer requisição para ${gateway} -> ${ipv6}:`, error.message);
        }
        return "ERROR"; // Retorne "ERROR" em caso de erro
    }
}

async function makeRequestActivetime(gateway, ipv6) {
    try {
        console.log(`Fazendo requisição para ${gateway} -> ${ipv6}`);
        const response = await axios.get(`http://${gateway}:3000/system/state`, {
            headers: {
                ip: ipv6 // Adiciona o cabeçalho IP
            },
            timeout: 10000,
        });
        console.log('Resposta: ', response.data);

        // Retorne o número de switches da resposta
        return response.data.uptime; // Supondo que o campo se chama n_switches
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error(`Timeout ao fazer requisição para ${gateway} -> ${ipv6}.`);
        } else {
            console.error(`ERRO: ao fazer requisição para ${gateway} -> ${ipv6}:`, error.message);
        }
        return "ERROR"; // Retorne "ERROR" em caso de erro
    }
}

async function makeRequestFwversion(gateway, ipv6) {
    try {
        console.log(`Fazendo requisição para ${gateway} -> ${ipv6}`);
        const response = await axios.get(`http://${gateway}:3000/system/ver`, {
            headers: {
                ip: ipv6 // Adiciona o cabeçalho IP
            },
            timeout: 10000,
        });
        console.log('Resposta: ', response.data);

        // Retorne o número de switches da resposta
        return response.data.fwVer; // Supondo que o campo se chama n_switches
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error(`Timeout ao fazer requisição para ${gateway} -> ${ipv6}.`);
        } else {
            console.error(`ERRO: ao fazer requisição para ${gateway} -> ${ipv6}:`, error.message);
        }
        return "ERROR"; // Retorne "ERROR" em caso de erro
    }
}

async function generateHtmlReport(projectName) {
    const csvFilePath = path.join(__dirname, `${projectName}.csv`);
    const htmlFilePath = path.join(__dirname, `${projectName}.html`);
    
    // Lê o valor de MEDIA_CHAVEAMENTOS_ADEQUADA do .env
    const mediaChaveamentosAdequada = parseInt(process.env.MEDIA_CHAVEAMENTOS_ADEQUADA, 10);

    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => line.split(','));

    let htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório - ${projectName}</title>
        <style>
            table {
                width: 100%;
                border-collapse: collapse;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .highlight {
                background-color: red !important; /* Linha vermelha */
                color: white; /* Texto branco para contraste */
            }
        </style>
    </head>
    <body>
        <h1>Relatório de Dispositivos - ${projectName}</h1>
        <table>
            <thead>
                <tr>
                    ${headers.map(header => `<th>${header}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${rows.map(row => {
                    const coords = row[4]; // Supondo que o campo 'coords' está na posição 4
                    const mode = row[3]; // Supondo que o campo 'mode' está na posição 3
                    const switches = parseInt(row[5], 10); // Supondo que o campo 'switches' está na posição 5

                    // Condição para destacar a linha em vermelho
                    const highlightClass = (coords === '255/255' && mode === 'ASTRONOMICO') || (switches > (5 * mediaChaveamentosAdequada)) ? 'highlight' : '';

                    return `
                        <tr class="${highlightClass}">
                            ${row.map(cell => `<td>${cell}</td>`).join('')}
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    fs.writeFileSync(htmlFilePath, htmlContent);
    console.log(`Relatório HTML gerado em: ${htmlFilePath}`);
}

async function main() {
    const uri = 'mongodb://nouvenn:nouvenn2021@10.8.0.200:27017'; // URL do seu MongoDB
    const client = new MongoClient(uri);
    const dbName = 'admin'; // Substitua pelo nome do seu banco de dados
    const devicemodelsCollectionName = 'devicemodels';
    const gatewaymodelsCollectionName = 'gatewaymodels';

    const tenantId = process.env.ID_DO_PROJETO; // Obtém o tenantId do arquivo .env
    let projetoName = '';

    try {
        await client.connect();
        console.log('Conectado ao MongoDB');

        const db = client.db(dbName);
        const devicemodelsCollection = db.collection(devicemodelsCollectionName);
        const gatewaymodelsCollection = db.collection(gatewaymodelsCollectionName);

        // 1. Buscando todos os dados na coleção devicemodels com o tenantId especificado
        const deviceData = await devicemodelsCollection.find({ tenantId }).toArray();

        // 2. Gerando um array de gatewayIds únicos
        const uniqueGatewayIds = [
            ...new Set(
                deviceData
                    .map(device => device.gatewayId)
                    .filter(gatewayId => gatewayId !== undefined && gatewayId.trim() !== '')
            )
        ];

        // 3. Buscando o ipv4 de cada gatewayId
        const gatewayData = await gatewaymodelsCollection.find({ identification: { $in: uniqueGatewayIds } }).toArray();
        const ipv4Mapping = {};

        gatewayData.forEach(gateway => {
            ipv4Mapping[gateway.identification] = gateway.ipv4;
        });

        console.log('GATEWAY MAPPING: ', ipv4Mapping);

        // 4. Criando CSVs para cada ipv4
        for (const gatewayId of uniqueGatewayIds) {
            const ipv4 = ipv4Mapping[gatewayId];

            if (ipv4) {
                const csvWriter = createCsvWriter({
                    path: path.join(__dirname, `${ipv4}.csv`), // Nome do arquivo
                    header: [
                        { id: 'identification', title: 'identification' },
                        { id: 'serialNumber', title: 'serialNumber' },
                        { id: 'ipv6', title: 'ipv6' },
                        { id: 'mode', title: 'mode' },
                        { id: 'coords', title: 'coords' },
                        { id: 'switches', title: 'switches' },
                        { id: 'activetime', title: 'activetime' },
                        { id: 'fwversion', title: 'fwversion' },
                    ]
                });

                // Filtrando os dados da devicemodels para o gatewayId atual
                const filteredDeviceData = deviceData.filter(device => device.gatewayId === gatewayId);

                await csvWriter.writeRecords(filteredDeviceData.map(device => ({
                    identification: device.identification,
                    serialNumber: device.serialNumber,
                    ipv6: `${process.env.PREFIXO_DO_PROJETO}::${macToIPV6(device.identification)}`,
                    mode: '',
                    coords: '',
                    switches: '', // Inicialmente vazio
                    activetime: '',
                    fwversion: '',
                })));

                console.log(`CSV criado para IPv4: ${ipv4}`);
            } else {
                console.log(`Nenhum IPv4 encontrado para gatewayId: ${gatewayId}`);
            }
        }

        // 5. Lendo o nome do projeto correspondente ao ID_DO_PROJETO
        projetoName = await readProjectName();

        // 6. Criando o arquivo finalreport.csv
        const finalCsvWriter = createCsvWriter({
            path: path.join(__dirname, `${projetoName}.csv`), // Nome do arquivo igual ao valor do parâmetro PROJETO
            header: [
                { id: 'identification', title: 'identification' },
                { id: 'serialNumber', title: 'serialNumber' },
                { id: 'ipv6', title: 'ipv6' },
                { id: 'mode', title: 'mode' },
                { id: 'coords', title: 'coords' },
                { id: 'switches', title: 'switches' },
                { id: 'activetime', title: 'activetime' },
                { id: 'fwversion', title: 'fwversion' },
                { id: 'gateway', title: 'gateway' }
            ],
            append: false // Garante que o arquivo será sobrescrito
        });

        const finalData = [];

        // 7. Lendo todos os arquivos CSV gerados e juntando-os
        const files = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.csv') && file !== `${projetoName}.csv` && file !== 'projetos.csv'); // Ignora o CSV final e projetos.csv

        for (const file of files) {
            const ipv4 = path.basename(file, '.csv'); // Extrai o ipv4 do nome do arquivo
            const csvContent = fs.readFileSync(path.join(__dirname, file), 'utf-8');
            const csvLines = csvContent.split('\n').slice(1); // Ignora o cabeçalho

            csvLines.forEach(line => {
                const [identification, serialNumber, ipv6, mode, coords, switches, activetime, fwversion] = line.split(','); // Supondo que o separador é vírgula
                if (identification && serialNumber) {
                    finalData.push({
                        identification,
                        serialNumber,
                        ipv6,
                        mode,
                        coords,
                        switches,
                        activetime,
                        fwversion,
                        gateway: ipv4 // Adiciona o ipv4 no campo gateway
                    });
                }
            });
        }

        // 8. Escrevendo o finalreport.csv
        await finalCsvWriter.writeRecords(finalData);
        console.log(`Arquivo ${projetoName}.csv criado com sucesso.`);

        // 9. Deletando os arquivos CSV individuais
        for (const file of files) {
            fs.unlinkSync(path.join(__dirname, file));
            console.log(`Arquivo ${file} deletado com sucesso.`);
        }

        await sleep(3000);

        // 10. Lendo o finalreport.csv para atualizar os switches
        const finalCsvContent = fs.readFileSync(path.join(__dirname, `${projetoName}.csv`), 'utf-8');
        const finalCsvLines = finalCsvContent.split('\n');

        // 11. Prepara uma nova lista para as atualizações
        const updatedFinalData = finalCsvLines.slice(1).map(line => {
            const [identification, serialNumber, ipv6, mode, coords, switches, activetime, fwversion, gateway] = line.split(',');
            return {
                identification,
                serialNumber,
                ipv6,
                mode,
                coords,
                switches, // Mantém o valor atual
                activetime,
                fwversion,
                gateway
            };
        }).filter(data => data.identification && data.serialNumber); // Filtra linhas inválidas

        // Fazendo as requisições e atualizando o campo switches
        for (let i = 0; i < updatedFinalData.length; i++) {
            const { ipv6, gateway } = updatedFinalData[i];

            if (gateway) {
                const n_switches = await makeRequestSwitches(gateway, ipv6);

                if (n_switches !== "ERROR") {
                    updatedFinalData[i].switches = n_switches;

                    const lamp_mode = await makeRequestMode(gateway, ipv6);
                    updatedFinalData[i].mode = lamp_mode === "ERROR" ? "ERROR" : lamp_mode;
    
                    const coords = await makeRequestCoords(gateway, ipv6);
                    updatedFinalData[i].coords = coords === "ERROR" ? "ERROR" : coords;
    
                    const activetime = await makeRequestActivetime(gateway, ipv6);
                    updatedFinalData[i].activetime = activetime === "ERROR" ? "ERROR" : activetime;
    
                    const fwversion = await makeRequestFwversion(gateway, ipv6);
                    updatedFinalData[i].fwversion = fwversion === "ERROR" ? "ERROR" : fwversion;
                } else {
                    updatedFinalData[i].switches = "ERROR";
                    updatedFinalData[i].mode = "ERROR";
                    updatedFinalData[i].coords = "ERROR";
                    updatedFinalData[i].activetime = "ERROR";
                    updatedFinalData[i].fwversion = "ERROR";
                };
            }
        }

        // 12. Escrevendo as alterações no arquivo finalreport.csv
        const header = finalCsvLines[0]; // Mantém o cabeçalho
        const updatedCsvContent = [header, ...updatedFinalData.map(data =>
            `${data.identification},${data.serialNumber},${data.ipv6},${data.mode},${data.coords},${data.switches},${data.activetime},${data.fwversion},${data.gateway}`
        )].join('\n');

        fs.writeFileSync(path.join(__dirname, `${projetoName}.csv`), updatedCsvContent);
        console.log(`Arquivo ${projetoName}.csv atualizado com as informações do dispositivo.`);
        await generateHtmlReport(projetoName);
    } catch (error) {
        console.error('Erro: ', error);
    } finally {
        await client.close();
        console.log('Conexão com o MongoDB encerrada.');
    }
}

// Inicia o processo
main().catch(console.error);
