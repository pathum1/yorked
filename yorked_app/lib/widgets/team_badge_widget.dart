import 'package:flutter/material.dart';

class TeamBadgeWidget extends StatelessWidget {
  final String teamName;
  final String iconId;
  final double size;
  final bool isWinner;

  const TeamBadgeWidget({
    super.key,
    required this.teamName,
    required this.iconId,
    this.size = 80,
    this.isWinner = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            shape: BoxShape.circle,
            border: Border.all(
              color: isWinner ? Colors.amber : Colors.white24,
              width: isWinner ? 4 : 2,
            ),
            boxShadow: isWinner
                ? [BoxShadow(color: Colors.amber.withOpacity(0.5), blurRadius: 20)]
                : null,
          ),
          child: Center(
            child: Text(
              iconId.isNotEmpty ? iconId.substring(0, 1).toUpperCase() : '?',
              style: TextStyle(
                fontSize: size * 0.4,
                fontWeight: FontWeight.bold,
                color: isWinner ? Colors.amber : Colors.white,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          teamName,
          style: TextStyle(
            fontSize: size * 0.2,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.5,
            color: isWinner ? Colors.amber : Colors.white,
          ),
        ),
      ],
    );
  }
}
