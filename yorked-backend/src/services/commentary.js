// Logic for evaluating shot choice against different deliveries and providing dynamic commentary strings

const SHOT_QUALITY = {
    OPTIMAL: 'OPTIMAL',
    NEUTRAL: 'NEUTRAL',
    POOR: 'POOR'
};

// Maps Delivery name to the "optimal" and "poor" shot choices against it
const evaluateShot = (delivery, originalShot) => {
    const shotMapping = {
        'Drive': 'Cover Drive',
        'Cut': 'Cut Shot',
        'Pull': 'Pull Shot',
        'Lofted': 'Slog',
        'ReverseSweep': 'Sweep',
        'Sweep': 'Sweep',
        'Defensive': 'Defensive',
        'Leave': 'Leave'
    };
    const shot = shotMapping[originalShot] || originalShot;

    if (shot === 'Leave') {
        const DANGEROUS_LEAVE = ['Yorker', 'Inswinger', 'Good Length', 'Slider', 'Arm Ball', 'Googly', 'Flipper', 'Full Toss'];
        if (DANGEROUS_LEAVE.includes(delivery)) return SHOT_QUALITY.POOR;
        return SHOT_QUALITY.OPTIMAL;
    }

    switch (delivery) {
        case 'Yorker':
            if (['Defensive', 'Straight Drive', 'Sweep'].includes(shot)) return SHOT_QUALITY.OPTIMAL;
            if (['Pull Shot', 'Hook Shot', 'Cut Shot', 'Slog'].includes(shot)) return SHOT_QUALITY.POOR;
            return SHOT_QUALITY.NEUTRAL;
        case 'Bouncer':
            if (['Pull Shot', 'Hook Shot', 'Cut Shot'].includes(shot)) return SHOT_QUALITY.OPTIMAL;
            if (['Defensive', 'Cover Drive', 'Straight Drive', 'Sweep'].includes(shot)) return SHOT_QUALITY.POOR;
            return SHOT_QUALITY.NEUTRAL;
        case 'Full Toss':
            if (['Cover Drive', 'Straight Drive', 'Slog', 'Sweep'].includes(shot)) return SHOT_QUALITY.OPTIMAL;
            if (['Defensive'].includes(shot)) return SHOT_QUALITY.POOR;
            return SHOT_QUALITY.NEUTRAL;
        case 'Off-spin':
        case 'Leg-spin':
        case 'Googly':
        case 'Tossed Up':
            if (['Sweep', 'Cut Shot', 'Cover Drive', 'Defensive'].includes(shot)) return SHOT_QUALITY.OPTIMAL;
            if (['Slog', 'Hook Shot', 'Pull Shot'].includes(shot)) return SHOT_QUALITY.POOR;
            return SHOT_QUALITY.NEUTRAL;
        default:
            // Slower Ball, Good Length, Outswinger, Inswinger, Slider, Arm Ball, Flipper
            if (['Defensive', 'Cover Drive', 'Straight Drive'].includes(shot)) return SHOT_QUALITY.OPTIMAL;
            if (['Slog'].includes(shot)) return SHOT_QUALITY.POOR;
            return SHOT_QUALITY.NEUTRAL;
    }
};

const getRandomPhrase = (phrases) => phrases[Math.floor(Math.random() * phrases.length)];

// Dictionary of commentator quotes grouped by Quality -> Outcome Group
const COMPENDIUM = {
    [SHOT_QUALITY.OPTIMAL]: {
        BOUNDARY: [
            "Shot of the day! Right out of the screws!",
            "Glorious stroke, pierced the gap perfectly.",
            "Textbook shot selection. Pure timing on that.",
            "He picked the length early and dispatched it.",
            "That's away! Masterclass in batting."
        ],
        RUNS: [
            "Good solid push into the gap, easy runs.",
            "Played that nicely, picking up the rotation.",
            "Sensible cricket, just placing it where the fielders aren't.",
            "Well timed, easy single available.",
            "Soft hands, guiding it for quick runs."
        ],
        DOT: [
            "Good respectful shot to a decent delivery.",
            "Solid defense. No need to risk it there.",
            "Played well, but the fielder cuts it off.",
            "Right out of the middle, but straight to extra cover.",
            "He stroked that beautifully, but gets nothing for it."
        ],
        WICKET: [
            "Unbelievable! He played the right shot but it's a brilliant catch!",
            "That's incredibly unlucky. Middle of the bat, straight down the throat.",
            "He did everything right except pick the gap...",
            "A magnificent delivery beats a technically perfect shot."
        ]
    },
    [SHOT_QUALITY.NEUTRAL]: {
        BOUNDARY: [
            "Swung hard, connected well enough!",
            "Good aggressive intent, clears the infield.",
            "He's managed to find the boundary there.",
            "Thumped away! Decent shot."
        ],
        RUNS: [
            "Works it away for runs.",
            "Nudged into the leg side, good running.",
            "Manages to get some bat on it, scrambles through.",
            "Pushed away for a quick couple."
        ],
        DOT: [
            "Mistimed it slightly, no run.",
            "Didn't quite get the connection he wanted.",
            "Defended carefully. Dot ball.",
            "Just couldn't beat the man in the ring."
        ],
        WICKET: [
            "He missed it completely!",
            "Got a leading edge, and taken!",
            "Straight through the gate, the bowler strikes.",
            "That was an awkward looking shot, and he pays the price."
        ]
    },
    [SHOT_QUALITY.POOR]: {
        BOUNDARY: [
            "It's a thick edge... but it's flown to the boundary!",
            "Not where he intended it to go, but they all count!",
            "An ugly heave, but he's got away with it for four!",
            "Absolutely mishit, but the fielder can't catch it!"
        ],
        RUNS: [
            "Not timed at all, but they'll sneak a run.",
            "A complete miscue... falls safely in the outfield.",
            "He tried to smash that, ended up shinning it for a single.",
            "Very sloppy stroke, lucky not to edge it."
        ],
        DOT: [
            "That is an awful shot selection. Beaten entirely.",
            "Swipes into thin air. He looked foolish there.",
            "Nowhere near the ball! Need to calm down.",
            "That shot made no sense against that delivery."
        ],
        WICKET: [
            "What was he thinking? Terrible shot selection!",
            "That was never on. A wild swipe brings his downfall.",
            "He tried to play a completely inappropriate shot and pays the ultimate price.",
            "Right into the trap! Amateur batting there."
        ]
    }
};

const getCommentary = (delivery, shot, outcome, isWicket) => {
    const quality = evaluateShot(delivery, shot);
    let group = 'DOT';

    if (isWicket) {
        if (shot === 'Leave') {
            return getRandomPhrase([
                "He shoulders arms and... he's bowled! What a misjudgment!",
                "Leaves the ball, and it crashes into the stumps! Disaster!",
                "He thought it was going wide, but it swung back in. Plumb out."
            ]);
        }
        group = 'WICKET';
    } else if (outcome === 'DOT' && shot === 'Leave') {
        return getRandomPhrase([
            "Well left outside off stump.",
            "Shoulders arms, lets it safely through to the keeper.",
            "Good watchful leave by the batsman.",
            "Leaves it alone, no shot offered."
        ]);
    } else if (outcome === 'MISS') {
        return getRandomPhrase([
            "He has absolutely no idea about that delivery! Complete miss.",
            "Swishes at thin air! What was he trying to do there?",
            "That shot was never going to work against that delivery. Missed it by a mile.",
            "Completely bamboozled by the bowler. Swung and missed."
        ]);
    } else if (outcome === '4' || outcome === '6') {
        group = 'BOUNDARY';
    } else if (outcome !== 'DOT') {
        group = 'RUNS';
    }

    return getRandomPhrase(COMPENDIUM[quality][group]);
};

module.exports = {
    getCommentary,
    evaluateShot
};
