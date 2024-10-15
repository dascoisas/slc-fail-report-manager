const { MongoClient } = require('mongodb');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config();
const path = require('path');
const fs = require('fs');

async function main() {
    const uri = 'mongodb://nouvenn:nouvenn2021@10.8.0.200:27017'; // URL do seu MongoDB
    const client = new MongoClient(uri);
    const dbName = 'admin'; // Substitua pelo nome do seu banco de dados
    const collectionName = 'tenantmodels'; // Substitua pelo nome da sua coleção

    try {
        await client.connect();
        console.log('Conectado ao MongoDB');

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // 1. Buscando todos os dados na coleção tenantmodels
        const tenantData = await collection.find({}).toArray();

        // 2. Preparando dados para o CSV
        const csvData = tenantData.map(tenant => ({
            PROJETO: tenant.name, // Preenchendo a coluna PROJETO com o parâmetro name
            ID: tenant.id,        // Preenchendo a coluna ID com o parâmetro id
        }));

        // 3. Criando ou sobrescrevendo o arquivo CSV
        const csvWriter = createCsvWriter({
            path: path.join(__dirname, 'projetos.csv'), // Caminho do arquivo
            header: [
                { id: 'PROJETO', title: 'PROJETO' },
                { id: 'ID', title: 'ID' },
            ],
            append: false // Garante que o arquivo será sobrescrito
        });

        await csvWriter.writeRecords(csvData); // Escrevendo os dados no CSV
        console.log('Arquivo projetos.csv criado com sucesso.');

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await client.close();
    }
}

main();
