const { readDatabase, updateDatabase, nowIso, createId } = require('./database');

function logUsage(entry, env = process.env) {
  return updateDatabase((data) => {
    const record = {
      id: createId('usage'),
      userId: entry.userId,
      apiKeyId: entry.apiKeyId || null,
      endpoint: entry.endpoint,
      model: entry.model || null,
      requestType: entry.requestType || 'text',
      inputUnits: entry.inputUnits || 0,
      outputUnits: entry.outputUnits || 0,
      latencyMs: entry.latencyMs || 0,
      statusCode: entry.statusCode || 200,
      createdAt: nowIso(),
    };
    data.usageLogs.push(record);
    return record;
  }, env);
}

function getUsageSummary(userId, env = process.env) {
  const data = readDatabase(env);
  const rows = data.usageLogs.filter((item) => item.userId === userId);
  return {
    totalRequests: rows.length,
    successfulRequests: rows.filter((item) => item.statusCode < 400).length,
    failedRequests: rows.filter((item) => item.statusCode >= 400).length,
    totalInputUnits: rows.reduce((sum, item) => sum + (item.inputUnits || 0), 0),
    totalOutputUnits: rows.reduce((sum, item) => sum + (item.outputUnits || 0), 0),
    lastRequestAt: rows.length ? rows[rows.length - 1].createdAt : null,
    recent: rows.slice(-20).reverse(),
  };
}

module.exports = {
  logUsage,
  getUsageSummary,
};
