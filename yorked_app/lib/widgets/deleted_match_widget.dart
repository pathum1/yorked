import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../models/match_state.dart';

class DeletedMatchWidget extends StatelessWidget {
  final MatchState match;

  const DeletedMatchWidget({super.key, required this.match});

  @override
  Widget build(BuildContext context) {
    // Parse the deleted date if available, otherwise just use "an unknown date"
    String deletedDateStr = 'an unknown date';
    if (match.deletedAt != null) {
      try {
        final date = DateTime.parse(match.deletedAt!);
        deletedDateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} at ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
      } catch (e) {
        // Fallback if parsing fails
      }
    }

    final deletedByStr = match.deletedBy ?? 'the host';

    return Center(
      child: Container(
        padding: const EdgeInsets.all(32),
        margin: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.redAccent.withOpacity(0.5), width: 2),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cancel_outlined, size: 80, color: Colors.redAccent),
            const SizedBox(height: 24),
            const Text(
              'MATCH DELETED',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: 3,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'This match was deleted by $deletedByStr\non $deletedDateStr.',
              style: const TextStyle(
                fontSize: 18,
                color: Colors.white70,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => context.go('/dashboard'),
              icon: const Icon(Icons.home),
              label: const Text('RETURN TO DASHBOARD'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                backgroundColor: Colors.blueAccent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
