import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/match_provider.dart';

class VictoryScreen extends ConsumerWidget {
  final String matchId;
  const VictoryScreen({super.key, required this.matchId});

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

            // Simplified logic: Assume team B chased or didn't
            final score1 = match.innings1?['runs'] ?? 0;
            final score2 = match.innings2?['runs'] ?? 0;
            
            String winnerText = 'IT\'S A TIE!';
            Color winnerColor = Colors.white;

            if (score2 > score1) {
              winnerText = 'TEAM B WINS!';
              winnerColor = Colors.redAccent;
            } else if (score1 > score2) {
              winnerText = 'TEAM A WINS!';
              winnerColor = Colors.blueAccent;
            }

            return Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ZoomIn(
                  duration: const Duration(milliseconds: 800),
                  child: const Icon(Icons.emoji_events, size: 120, color: Colors.amber),
                ),
                const SizedBox(height: 32),
                FadeInDown(
                  delay: const Duration(milliseconds: 400),
                  child: Text(
                    winnerText,
                    style: TextStyle(fontSize: 56, fontWeight: FontWeight.bold, letterSpacing: 4, color: winnerColor),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 64),
                
                FadeInUp(
                  delay: const Duration(milliseconds: 800),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildScoreCard('TEAM A', score1, match.innings1?['wickets'] ?? 0),
                      const SizedBox(width: 32),
                      _buildScoreCard('TEAM B', score2, match.innings2?['wickets'] ?? 0),
                    ],
                  ),
                ),

                const SizedBox(height: 64),
                
                FadeIn(
                  delay: const Duration(milliseconds: 1500),
                  child: ElevatedButton(
                    onPressed: () => context.go('/dashboard'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 24),
                      backgroundColor: Colors.white10,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('BACK TO DASHBOARD', style: TextStyle(letterSpacing: 2, fontWeight: FontWeight.bold)),
                  ),
                )
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildScoreCard(String title, int score, int wickets) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white24),
      ),
      child: Column(
        children: [
          Text(title, style: const TextStyle(color: Colors.white54, letterSpacing: 2, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('$score', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.white)),
              const Text('/', style: TextStyle(fontSize: 24, color: Colors.white54)),
              Text('$wickets', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.redAccent)),
            ],
          )
        ],
      ),
    );
  }
}
