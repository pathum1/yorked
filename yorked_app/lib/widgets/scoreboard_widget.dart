import 'package:flutter/material.dart';

class ScoreboardWidget extends StatelessWidget {
  final int totalRuns;
  final int totalWickets;
  final double oversBowled;
  final String battingTeamName;
  final int? target;

  const ScoreboardWidget({
    super.key,
    required this.totalRuns,
    required this.totalWickets,
    required this.oversBowled,
    required this.battingTeamName,
    this.target,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 32),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        border: const Border(
          bottom: BorderSide(color: Colors.white10, width: 2),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.5),
            offset: const Offset(0, 4),
            blurRadius: 10,
          )
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                battingTeamName.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white54,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '$totalRuns',
                    style: const TextStyle(
                      fontSize: 56,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -2,
                      color: Colors.white,
                    ),
                  ),
                  const Text(
                    ' / ',
                    style: TextStyle(
                      fontSize: 32,
                      color: Colors.white54,
                    ),
                  ),
                  Text(
                    '$totalWickets',
                    style: const TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFE53935), // Red for wickets
                    ),
                  ),
                ],
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text(
                'OVERS',
                style: TextStyle(
                  color: Colors.white54,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                oversBowled.toStringAsFixed(1),
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E88E5), // Blue accent
                ),
              ),
              if (target != null) ...[
                const SizedBox(height: 8),
                Text(
                  'TARGET: $target',
                  style: const TextStyle(
                    color: Colors.amber,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ]
            ],
          ),
        ],
      ),
    );
  }
}
