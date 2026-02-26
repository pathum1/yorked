function applyModifiers(baseProbs, batterAttrs, bowlerAttrs, batterConfidence = 0, shot = null) {
    // Create a copy of baseProbs to modify
    let probs = { ...baseProbs };

    // Helper function to safely adjust weights
    const adjust = (key, percentage) => {
        if (probs[key] !== undefined) {
            probs[key] = Math.max(0, probs[key] * (1 + percentage));
        }
    };

    const b_tech = (batterAttrs && batterAttrs.technique) ? batterAttrs.technique : 1;
    const b_pow = (batterAttrs && batterAttrs.power) ? batterAttrs.power : 1;
    const b_tim = (batterAttrs && batterAttrs.timing) ? batterAttrs.timing : 1;

    const w_acc = (bowlerAttrs && bowlerAttrs.accuracy) ? bowlerAttrs.accuracy : 1;
    const w_pac = (bowlerAttrs && bowlerAttrs.pace) ? bowlerAttrs.pace : 1;
    const w_var = (bowlerAttrs && bowlerAttrs.variation) ? bowlerAttrs.variation : 1;

    // Apply batting modifiers
    // Technique
    adjust('DOT', b_tech * 0.03);
    adjust('W_BOWLED', -b_tech * 0.02);
    adjust('W_CAUGHT', -b_tech * 0.02);
    adjust('W_LBW', -b_tech * 0.02);
    adjust('W_STUMPED', -b_tech * 0.02);

    // Power
    adjust('4', b_pow * 0.03);
    adjust('6', b_pow * 0.04);
    adjust('DOT', -b_pow * 0.01);

    // Timing
    adjust('2', b_tim * 0.03);
    adjust('3', b_tim * 0.03);
    adjust('1', b_tim * 0.02);

    // Apply bowling modifiers
    // Accuracy
    adjust('DOT', w_acc * 0.03);
    adjust('W_BOWLED', w_acc * 0.02);
    adjust('4', -w_acc * 0.02);
    adjust('6', -w_acc * 0.02);

    // Pace
    adjust('W_CAUGHT', w_pac * 0.02);
    adjust('W_BOWLED', w_pac * 0.02);
    adjust('4', -w_pac * 0.01);
    adjust('6', -w_pac * 0.01);

    // Variation
    adjust('W_STUMPED', w_var * 0.02);
    adjust('W_LBW', w_var * 0.02);
    adjust('1', -w_var * 0.01);
    adjust('2', -w_var * 0.01);
    adjust('3', -w_var * 0.01);

    // Apply Confidence Modifier
    if (batterConfidence > 0) {
        // Subtle boost to getting off strike as confidence grows (0 to ~15% boost max)
        const confidenceBoost = (batterConfidence / 100.0) * 0.15;
        adjust('1', confidenceBoost);
        adjust('2', confidenceBoost);
        adjust('3', confidenceBoost);

        // Massive boost for power hits when absolutely cracked
        if (batterConfidence === 100 && shot && ['Pull Shot', 'Hook Shot', 'Slog'].includes(shot)) {
            adjust('4', 2.0); // 200% boost to 4s
            adjust('6', 3.0); // 300% boost to 6s
            adjust('W_CAUGHT', -0.5); // Halve the risk of getting caught
            adjust('W_BOWLED', -0.5);
        }
    }

    // Normalize
    let total = Object.values(probs).reduce((sum, val) => sum + val, 0);
    if (total === 0) return probs; // fallback

    const normalized = {};
    for (let key in probs) {
        normalized[key] = (probs[key] / total) * 1000;
    }

    return normalized;
}

module.exports = applyModifiers;
