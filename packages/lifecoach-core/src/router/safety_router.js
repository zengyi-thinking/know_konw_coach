const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function evaluateSafety(input, workspaceRoot) {
  const safetyDir = path.join(workspaceRoot, 'knowledge', 'safety');
  const files = fs.readdirSync(safetyDir).filter((name) => name.endsWith('.json'));
  const text = `${input.text || ''} ${(input.sceneTags || []).join(' ')}`.toLowerCase();

  let matchedRule = null;
  for (const file of files) {
    const rule = readJson(path.join(safetyDir, file));
    const keywords = Array.isArray(rule.keywords) ? rule.keywords : [];
    const hit = keywords.find((keyword) => text.includes(String(keyword).toLowerCase()));
    if (hit) {
      matchedRule = rule;
      break;
    }
  }

  if (!matchedRule) {
    return {
      riskLevel: 'low',
      allowCoaching: true,
      needsSafetyMode: false,
      matchedRuleId: null,
    };
  }

  const highRisk = matchedRule.riskLevel === 'high';
  return {
    riskLevel: matchedRule.riskLevel || 'medium',
    allowCoaching: !highRisk,
    needsSafetyMode: highRisk,
    matchedRuleId: matchedRule.id,
  };
}

module.exports = {
  evaluateSafety,
};
