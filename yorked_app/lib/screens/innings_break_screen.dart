import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/match_provider.dart';
import '../widgets/widgets.dart';

class InningsBreakScreen extends ConsumerWidget {
  final String matchId;
  const InningsBreakScreen({super.key, required this.matchId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Listen for match status changes to auto-navigate non-host players
    ref.listen(currentMatchProvider(matchId), (previous, next) {
      final match = next.value;
      if (match != null && match.status == 'in_progress') {
        if (context.mounted) {
          context.go('/match/$matchId/live');
        }
      }
    });

    final matchAsync = ref.watch(currentMatchProvider(matchId));

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: matchAsync.when(
          loading: () => const CircularProgressIndicator(),
          error: (e, s) => Text('Error: $e'),
          data: (match) {
            if (match == null) return const Text('Match not found');
            if (match.status == 'deleted') return DeletedMatchWidget(match: match);
            
            final score = match.innings1?['runs'] ?? 0;
            final wickets = match.innings1?['wickets'] ?? 0;
            final target = score + 1;

            return Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FadeInDown(
                  child: const Text('INNINGS BREAK', style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, letterSpacing: 8, color: Colors.amber)),
                ),
                const SizedBox(height: 32),
                
                FadeIn(
                  delay: const Duration(milliseconds: 500),
                  child: Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: Column(
                      children: [
                        const Text('TEAM A SCORED', style: TextStyle(color: Colors.white54, letterSpacing: 2)),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text('$score', style: const TextStyle(fontSize: 64, fontWeight: FontWeight.bold, color: Colors.white)),
                            const Text(' / ', style: TextStyle(fontSize: 32, color: Colors.white54)),
                            Text('$wickets', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Color(0xFFE53935))),
                          ],
                        ),
                        const SizedBox(height: 24),
                        const Divider(color: Colors.white10),
                        const SizedBox(height: 24),
                        const Text('TARGET TO WIN', style: TextStyle(color: Colors.white54, letterSpacing: 2)),
                        const SizedBox(height: 8),
                        Text('$target', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.amber)),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 64),
                
                Consumer(builder: (context, ref, _) {
                  final currentUser = ref.watch(authStateProvider).value;
                  final isCreator = currentUser?.uid == match.creatorId;

                  if (!isCreator) {
                    return FadeIn(
                      delay: const Duration(milliseconds: 1000),
                      child: const Text('WAITING FOR HOST TO START 2ND INNINGS...', style: TextStyle(color: Colors.white54, fontSize: 16, letterSpacing: 2, fontStyle: FontStyle.italic)),
                    );
                  }

                  return FadeInUp(
                    delay: const Duration(milliseconds: 1000),
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('START 2ND INNINGS', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 2)),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 24),
                        backgroundColor: const Color(0xFF1E88E5),
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () async {
                        // Officially start the 2nd innings
                        await FirebaseFirestore.instance.collection('matches').doc(matchId).update({
                          'status': 'in_progress'
                        });
                        if (context.mounted) {
                          context.go('/match/$matchId/live');
                        }
                      },
                    ),
                  );
                }),
              ],
            );
          },
        ),
      ),
    );
  }
}
