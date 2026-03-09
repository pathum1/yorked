function generateNarrative({ bowlerName, strikerName, overRuns, overWickets, totalRuns, totalWickets, overNum, totalOvers, target, format, notableEvents }) {

    // If there's a wicket, lead with that
    if (notableEvents.length > 0) {
        return notableEvents.join(' ');
    }

    // Maiden
    if (overRuns === 0) {
        const templates = [
            `${bowlerName} bowls a maiden to ${strikerName}. Pressure building.`,
            `Brilliant maiden over from ${bowlerName}. Not a run conceded.`,
            `${bowlerName} keeps it tight — maiden over.`,
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    // Big over (12+ runs)
    if (overRuns >= 12) {
        return `${strikerName} takes ${overRuns} off ${bowlerName}'s over! The momentum shifts.`;
    }

    // Expensive over (9-11)
    if (overRuns >= 9) {
        return `${bowlerName} concedes ${overRuns} runs. ${strikerName} looking dangerous.`;
    }

    // Tight over (1-3)
    if (overRuns <= 3) {
        if (target) {
            const needed = target - totalRuns;
            const ballsLeft = (totalOvers - overNum) * 6;
            const rr = (needed / Math.max(ballsLeft, 1) * 6).toFixed(1);
            return `Tight over from ${bowlerName}, just ${overRuns} run${overRuns !== 1 ? 's' : ''}. Required rate: ${rr}.`;
        }
        return `Tidy over from ${bowlerName}. Only ${overRuns} run${overRuns !== 1 ? 's' : ''} conceded.`;
    }

    // Normal over (4-8)
    return `${overRuns} runs from ${bowlerName}'s over. Score: ${totalRuns}/${totalWickets} after ${overNum} overs.`;
}

module.exports = { generateNarrative };
