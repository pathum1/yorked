import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/match_provider.dart';

class IntroSplashScreen extends ConsumerStatefulWidget {
  final String matchId;
  const IntroSplashScreen({super.key, required this.matchId});

  @override
  ConsumerState<IntroSplashScreen> createState() => _IntroSplashScreenState();
}

class _IntroSplashScreenState extends ConsumerState<IntroSplashScreen> {
  @override
  void initState() {
    super.initState();
    // Auto transition to live match after 4 seconds
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) context.go('/match/${widget.matchId}/live');
    });
  }

  @override
  Widget build(BuildContext context) {
    final matchAsync = ref.watch(currentMatchProvider(widget.matchId));

    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: matchAsync.when(
          loading: () => const CircularProgressIndicator(),
          error: (e, s) => Text('Error: $e'),
          data: (match) {
            if (match == null) return const Text('Match not found');

            final toss = match.toss;
            final winner = toss['winner'] ?? '?';
            final elected = (toss['elected'] ?? 'bat').toString().toUpperCase();

            return Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FadeInLeft(
                  duration: const Duration(seconds: 1),
                  child: const Text('TEAM A', style: TextStyle(fontSize: 64, fontWeight: FontWeight.w900, color: Colors.blueAccent, letterSpacing: 4)),
                ),
                
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24.0),
                  child: ZoomIn(
                    delay: const Duration(milliseconds: 500),
                    child: const Text('VS', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white54)),
                  ),
                ),
                
                FadeInRight(
                  delay: const Duration(milliseconds: 1000),
                  duration: const Duration(seconds: 1),
                  child: const Text('TEAM B', style: TextStyle(fontSize: 64, fontWeight: FontWeight.w900, color: Colors.redAccent, letterSpacing: 4)),
                ),

                const SizedBox(height: 80),
                
                FadeInUp(
                  delay: const Duration(milliseconds: 2000),
                  child: Text(
                    'TEAM $winner WON THE TOSS AND CHOSE TO $elected',
                    style: const TextStyle(color: Colors.amber, fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 2),
                    textAlign: TextAlign.center,
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
