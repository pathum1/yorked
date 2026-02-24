import 'package:flutter/material.dart';

class PlayerCardWidget extends StatelessWidget {
  final String name;
  final String avatarId;
  final String role;
  final bool isStriker;

  const PlayerCardWidget({
    super.key,
    required this.name,
    required this.avatarId,
    required this.role,
    this.isStriker = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isStriker ? const Color(0xFF1E88E5).withOpacity(0.1) : const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isStriker ? const Color(0xFF1E88E5) : Colors.white10,
          width: 2,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            backgroundColor: isStriker ? const Color(0xFF1E88E5) : Colors.white24,
            child: Text(
              avatarId.isNotEmpty ? avatarId.substring(0, 1).toUpperCase() : '?',
              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                name,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 4),
              Text(
                role.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 10,
                  letterSpacing: 1,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          if (isStriker) ...[
            const SizedBox(width: 16),
            const Icon(Icons.sports_cricket, color: Color(0xFF1E88E5), size: 20),
          ]
        ],
      ),
    );
  }
}
