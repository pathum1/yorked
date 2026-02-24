import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/match_provider.dart';
import '../widgets/widgets.dart';

class InningsBreakScreen extends ConsumerWidget {
  final String matchId;
  const InningsBreakScreen({super.key, required this.matchId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
                
                FadeInUp(
                  delay: const Duration(milliseconds: 1000),
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('START 2ND INNINGS', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 2)),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 24),
                      backgroundColor: const Color(0xFF1E88E5),
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () => context.go('/match/$matchId/intro'), // Or direct to live depending on actual flow
                  ),
                )
              ],
            );
          },
        ),
      ),
    );
  }
}
