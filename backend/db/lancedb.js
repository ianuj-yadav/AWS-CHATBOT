const lancedb = require('@lancedb/lancedb');
const path = require('path');

let dbPromise;
let tablePromise;

const initLanceDb = async () => {
  if (!dbPromise) {
    dbPromise = lancedb.connect(path.join(__dirname, 'lancedb_data'));
  }
  return dbPromise;
};

const getSemanticTable = async () => {
  if (!tablePromise) {
    const db = await initLanceDb();
    const tableNames = await db.tableNames();
    if (tableNames.includes('qa_semantic')) {
      tablePromise = await db.openTable('qa_semantic');
    } else {
      // Create table with 1536-dimensional Titan vectors
      const dummyData = [{ vector: Array(1536).fill(0), id: -1, answer: "dummy", sources: "[]" }];
      const table = await db.createTable('qa_semantic', dummyData);
      await table.delete('id = -1');
      tablePromise = table;
    }
  }
  return tablePromise;
};

module.exports = { getSemanticTable };
