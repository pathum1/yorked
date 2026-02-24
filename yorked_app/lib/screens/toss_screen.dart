import 'dart:math';
import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/match_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/widgets.dart';

class TossScreen extends ConsumerStatefulWidget {
  final String matchId;
  const TossScreen({super.key, required this.matchId});

  @override
  ConsumerState<TossScreen> createState() => _TossScreenState();
}

class _TossScreenState extends ConsumerState<TossScreen> {
  bool _isFlipping = false;
  String? _result;
  String? _tossWinner; // 'A' or 'B'
  String? _elected; // 'bat' or 'bowl'
  bool _showElection = false;
  bool _isSubmitting = false;

  void _flipCoin() async {
    setState(() => _isFlipping = true);

    await Future.delayed(const Duration(seconds: 2));

    final random = Random();
    final won = random.nextBool(); // true = Team A wins toss
    final result = won ? 'HEADS' : 'TAILS';

    if (mounted) {
      setState(() {
        _isFlipping = false;
        _result = result;
        _tossWinner = won ? 'A' : 'B';
        _showElection = true;
      });
    }
  }

  Future<void> _submitElection(String election) async {
    setState(() {
      _elected = election;
      _isSubmitting = true;
    });

    try {
      final match = ref.read(currentMatchProvider(widget.matchId)).value;
      if (match == null) return;

      final battingTeam = (_tossWinner == 'A' && election == 'bat') || (_tossWinner == 'B' && election == 'bowl') ? 'A' : 'B';
      final bowlingTeam = battingTeam == 'A' ? 'B' : 'A';

      final battingPlayers = battingTeam == 'A' ? match.teamA : match.teamB;
      final bowlingPlayers = bowlingTeam == 'A' ? match.teamA : match.teamB;

      // Set up innings 1
      final updateData = <String, dynamic>{
        'status': 'in_progress',
        'currentInnings': 1,
        'toss': {
          'winner': _tossWinner,
          'elected': election,
        },
        'innings1': {
          'battingTeam': battingTeam,
          'bowlingTeam': bowlingTeam,
          'runs': 0,
          'wickets': 0,
          'balls': 0,
          'overs': 0,
          'extras': 0,
          'currentStrikerUid': battingPlayers.isNotEmpty ? battingPlayers[0] : null,
          'currentNonStrikerUid': battingPlayers.length > 1 ? battingPlayers[1] : null,
          // Auto-assign bowler if 1v1
          'currentBowlerUid': bowlingPlayers.length == 1 ? bowlingPlayers[0] : null,
          'pendingBall': null,
        },
      };

      await FirebaseFirestore.instance
          .collection('matches')
          .doc(widget.matchId)
          .update(updateData);

      // Navigate to intro/live after a small delay
      if (mounted) {
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) context.go('/match/${widget.matchId}/intro');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final matchAsync = ref.watch(currentMatchProvider(widget.matchId));
    final currentUser = ref.watch(authStateProvider).value;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.home, color: Colors.white54), onPressed: () => context.go('/dashboard')),
        ],
      ),
      body: Center(
        child: matchAsync.when(
          loading: () => const CircularProgressIndicator(),
          error: (e, s) => Text('Error: $e', style: const TextStyle(color: Colors.red)),
          data: (match) {
            if (match == null) return const Text('Match not found');
            if (match.status == 'deleted') return DeletedMatchWidget(match: match);

            final isCreator = currentUser?.uid == match.creatorId;

            // If match is already in progress (non-host arriving), redirect
            if (match.status == 'in_progress') {
              Future.microtask(() {
                if (mounted) context.go('/match/${widget.matchId}/live');
              });
              return const CircularProgressIndicator();
            }

            // Non-host sees waiting screen
            if (!isCreator) {
              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  FadeInDown(
                    child: const Text('THE TOSS', style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, letterSpacing: 8, color: Colors.white)),
                  ),
                  const SizedBox(height: 32),
                  const CircularProgressIndicator(),
                  const SizedBox(height: 24),
                  const Text('Waiting for the host to flip the coin...', style: TextStyle(color: Colors.white54, fontSize: 16, letterSpacing: 1)),
                ],
              );
            }

            // Host toss flow
            return SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    FadeInDown(
                      child: const Text('THE TOSS', style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, letterSpacing: 8, color: Colors.white)),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      isCreator ? 'Flip the coin to decide!' : 'Waiting for host...',
                      style: const TextStyle(color: Colors.white54, fontSize: 18, letterSpacing: 2),
                    ),

                    const SizedBox(height: 64),

                    if (_result != null) ...[
                      ZoomIn(
                        child: Container(
                          width: 200, height: 200,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.amber.shade700,
                            boxShadow: [BoxShadow(color: Colors.amber.withOpacity(0.5), blurRadius: 40)],
                          ),
                          child: Center(child: Text(_result!, style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.white))),
                        ),
                      ),
                      const SizedBox(height: 32),
                      FadeInUp(
                        child: Text(
                          'TEAM $_tossWinner WON THE TOSS!',
                          style: const TextStyle(color: Colors.amber, fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 2),
                        ),
                      ),
                    ] else if (_isFlipping)
                      Spin(
                        infinite: true,
                        duration: const Duration(milliseconds: 500),
                        child: Container(
                          width: 200, height: 200,
                          decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF1E293B)),
                          child: const Center(child: Icon(Icons.currency_bitcoin, size: 80, color: Colors.amber)),
                        ),
                      )
                    else
                      GestureDetector(
                        onTap: _flipCoin,
                        child: Pulse(
                          infinite: true,
                          child: Container(
                            width: 200, height: 200,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: const Color(0xFF1E88E5),
                              boxShadow: [BoxShadow(color: Colors.blue.withOpacity(0.5), blurRadius: 40)],
                            ),
                            child: const Center(child: Text('FLIP', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white))),
                          ),
                        ),
                      ),

                    // Election buttons
                    if (_showElection && _elected == null) ...[
                      const SizedBox(height: 48),
                      FadeInUp(
                        child: Text(
                          'TEAM $_tossWinner ELECTS TO:',
                          style: const TextStyle(color: Colors.white70, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 2),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          ElevatedButton.icon(
                            icon: const Icon(Icons.sports_cricket),
                            label: const Text('BAT', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 20),
                              backgroundColor: const Color(0xFF1E88E5),
                              foregroundColor: Colors.white,
                            ),
                            onPressed: () => _submitElection('bat'),
                          ),
                          const SizedBox(width: 24),
                          ElevatedButton.icon(
                            icon: const Icon(Icons.sports_baseball),
                            label: const Text('BOWL', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 20),
                              backgroundColor: const Color(0xFFE53935),
                              foregroundColor: Colors.white,
                            ),
                            onPressed: () => _submitElection('bowl'),
                          ),
                        ],
                      ),
                    ],

                    if (_elected != null && _isSubmitting) ...[
                      const SizedBox(height: 48),
                      FadeInUp(
                        child: Text(
                          'TEAM $_tossWinner ELECTED TO ${_elected!.toUpperCase()}',
                          style: const TextStyle(color: Colors.greenAccent, fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 2),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const CircularProgressIndicator(),
                      const SizedBox(height: 8),
                      const Text('Starting match...', style: TextStyle(color: Colors.white54)),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
