function generateMatchCode(teamName) {
    // Take first word of team name (max 6 chars), uppercase
    const prefix = teamName.split(/\s+/)[0].substring(0, 6).toUpperCase();
    // Add random 4-digit number
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${suffix}`;
}

module.exports = { generateMatchCode };
